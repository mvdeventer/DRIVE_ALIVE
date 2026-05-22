"""
Server-side Idempotency-Key middleware (pure ASGI).

Clients send

    Idempotency-Key: <uuid>

on any non-GET/HEAD/OPTIONS request. The first 2xx response is cached;
identical retries replay it. Different bodies under the same key return 409.

Storage: in-memory LRU + TTL. Swap for Redis when scaling beyond one worker.

OWASP A04 (Insecure Design — replay protection), PCI-DSS 6.5.10.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from collections import OrderedDict
from threading import Lock
from typing import Optional

from starlette.types import ASGIApp, Receive, Scope, Send

logger = logging.getLogger(__name__)

DEFAULT_TTL_SECONDS = 24 * 60 * 60
DEFAULT_MAX_ENTRIES = 10_000
IDEMPOTENT_METHODS = {"GET", "HEAD", "OPTIONS"}
HEADER_NAME_BYTES = b"idempotency-key"
MAX_BODY_BYTES = 1 * 1024 * 1024  # 1 MiB


class IdempotencyStore:
    def __init__(self, max_entries: int = DEFAULT_MAX_ENTRIES, ttl: int = DEFAULT_TTL_SECONDS):
        self._max = max_entries
        self._ttl = ttl
        self._data: "OrderedDict[str, tuple[float, str, int, bytes, list]]" = OrderedDict()
        self._lock = Lock()

    def _evict_locked(self) -> None:
        now = time.time()
        expired = [k for k, (ts, *_r) in self._data.items() if now - ts > self._ttl]
        for k in expired:
            self._data.pop(k, None)
        while len(self._data) > self._max:
            self._data.popitem(last=False)

    def get(self, key: str) -> Optional[tuple[str, int, bytes, list]]:
        with self._lock:
            entry = self._data.get(key)
            if not entry:
                return None
            ts, body_hash, status, body, headers = entry
            if time.time() - ts > self._ttl:
                self._data.pop(key, None)
                return None
            self._data.move_to_end(key)
            return body_hash, status, body, headers

    def put(self, key: str, body_hash: str, status: int, body: bytes, headers: list) -> None:
        with self._lock:
            self._data[key] = (time.time(), body_hash, status, body, headers)
            self._data.move_to_end(key)
            self._evict_locked()


_store = IdempotencyStore()


def _hash_body(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()


async def _send_json(send: Send, status_code: int, payload: dict) -> None:
    body = json.dumps(payload).encode()
    await send({
        "type": "http.response.start",
        "status": status_code,
        "headers": [
            (b"content-type", b"application/json"),
            (b"content-length", str(len(body)).encode()),
        ],
    })
    await send({"type": "http.response.body", "body": body, "more_body": False})


class IdempotencyMiddleware:
    """Pure ASGI middleware — avoids the body-rehydration pitfalls of
    Starlette's BaseHTTPMiddleware."""

    def __init__(self, app: ASGIApp, store: Optional[IdempotencyStore] = None):
        self.app = app
        self.store = store or _store

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method", "GET")
        if method in IDEMPOTENT_METHODS:
            await self.app(scope, receive, send)
            return

        key_val: Optional[str] = None
        for name, value in scope.get("headers", []):
            if name == HEADER_NAME_BYTES:
                key_val = value.decode("latin-1")
                break
        if not key_val:
            await self.app(scope, receive, send)
            return

        # Buffer the full request body so we can hash and (potentially) replay it.
        body = b""
        more = True
        too_big = False
        while more:
            msg = await receive()
            if msg["type"] != "http.request":
                # Disconnect or unexpected — give up gracefully.
                return
            body += msg.get("body", b"")
            more = msg.get("more_body", False)
            if len(body) > MAX_BODY_BYTES:
                too_big = True
                break

        if too_big:
            # Don't cache giant payloads, but still let the request through.
            buffered = body
            consumed = {"done": False}

            async def passthrough_receive():
                if not consumed["done"]:
                    consumed["done"] = True
                    return {"type": "http.request", "body": buffered, "more_body": False}
                return await receive()

            await self.app(scope, passthrough_receive, send)
            return

        body_hash = _hash_body(body)

        cached = self.store.get(key_val)
        if cached:
            cached_hash, status_code, cbody, cheaders = cached
            if cached_hash != body_hash:
                logger.warning("Idempotency-Key reused with different request body")
                await _send_json(
                    send, 409,
                    {"detail": "Idempotency-Key reused with different request body"},
                )
                return
            logger.info("Replaying cached idempotent response")
            replay_headers = list(cheaders) + [(b"idempotent-replayed", b"true")]
            await send({
                "type": "http.response.start",
                "status": status_code,
                "headers": replay_headers,
            })
            await send({"type": "http.response.body", "body": cbody, "more_body": False})
            return

        replayed = {"done": False}

        async def replay_receive():
            if not replayed["done"]:
                replayed["done"] = True
                return {"type": "http.request", "body": body, "more_body": False}
            return await receive()

        resp_status = 500
        resp_headers: list = []
        resp_body = bytearray()

        async def send_wrapper(message):
            nonlocal resp_status, resp_headers
            if message["type"] == "http.response.start":
                resp_status = message["status"]
                resp_headers = [
                    (k, v) for (k, v) in message.get("headers", [])
                    if k.lower() not in {b"content-length", b"transfer-encoding", b"connection"}
                ]
            elif message["type"] == "http.response.body":
                resp_body.extend(message.get("body", b""))
            await send(message)

        await self.app(scope, replay_receive, send_wrapper)

        if 200 <= resp_status < 300:
            self.store.put(key_val, body_hash, resp_status, bytes(resp_body), resp_headers)
