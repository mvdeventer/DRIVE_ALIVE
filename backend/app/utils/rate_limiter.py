"""
Rate Limiting Utility
Prevents brute force attacks on authentication and critical endpoints
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import redis
import os

# Redis connection for distributed rate limiting
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    # Test connection
    redis_client.ping()
    storage_uri = REDIS_URL
    print(f"✅ Rate limiter connected to Redis: {REDIS_URL}")
except (redis.ConnectionError, redis.RedisError) as e:
    # Fallback to in-memory storage for development
    print(f"⚠️  Redis connection failed: {e}")
    print("   Using in-memory rate limiter (NOT suitable for production)")
    storage_uri = "memory://"
    redis_client = None

# Create limiter instance
limiter = Limiter(
    key_func=get_remote_address,  # Rate limit by IP address
    storage_uri=storage_uri,
    headers_enabled=True,  # Add X-RateLimit-* headers to responses
    strategy="fixed-window",  # Fixed time window strategy
    enabled=os.getenv("RATE_LIMIT_ENABLED", "true").lower() != "false",
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """
    Custom handler for rate limit exceeded errors
    Returns user-friendly error message with retry information
    """
    retry_after = exc.detail.split("Retry after ")[1] if "Retry after" in exc.detail else "unknown"
    
    return JSONResponse(
        status_code=429,
        content={
            "error": "Too Many Requests",
            "message": "You have exceeded the rate limit. Please try again later.",
            "retry_after": retry_after,
            "detail": "Too many login attempts. Please wait before trying again."
        },
        headers={
            "Retry-After": str(retry_after),
            "X-RateLimit-Limit": str(exc.detail),
        }
    )
