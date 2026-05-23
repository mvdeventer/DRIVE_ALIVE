"""
Locust load-test scenarios for the DRIVE_ALIVE backend.

Run:
    pip install locust
    cd backend
    locust -f tests/load/locustfile.py --host http://localhost:8000

Then open the web UI at http://localhost:8089 to start a swarm.

Headless example (200 users, 20 spawn/sec, 2 min):
    locust -f tests/load/locustfile.py --host http://localhost:8000 \\
           --headless -u 200 -r 20 -t 2m --html load_report.html

Environment variables (optional):
    LOAD_STUDENT_EMAIL / LOAD_STUDENT_PASSWORD — pre-created student credentials.
    If absent, only public endpoints are hit.
"""

import os
import random
from typing import Optional

from locust import HttpUser, between, task


class PublicBrowsingUser(HttpUser):
    """Anonymous traffic: landing, instructor browsing, public lookups."""

    wait_time = between(1, 4)

    @task(5)
    def list_instructors(self):
        self.client.get("/instructors/?limit=20", name="GET /instructors")

    @task(2)
    def list_instructors_filtered(self):
        # Pretend the user is browsing instructors in Cape Town
        self.client.get(
            "/instructors/?latitude=-33.9249&longitude=18.4241"
            "&max_distance_km=30&limit=20",
            name="GET /instructors (geo)",
        )

    @task(1)
    def health(self):
        self.client.get("/", name="GET /")


class AuthenticatedStudentUser(HttpUser):
    """Logged-in student traffic: profile, bookings, certifications."""

    wait_time = between(2, 6)

    def on_start(self):
        self.token: Optional[str] = None
        email = os.getenv("LOAD_STUDENT_EMAIL")
        password = os.getenv("LOAD_STUDENT_PASSWORD")
        if not email or not password:
            # Skip authentication if creds aren't provided.
            return
        with self.client.post(
            "/auth/login",
            json={"email": email, "password": password},
            name="POST /auth/login",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                data = resp.json()
                self.token = data.get("access_token") or data.get("token")
                if self.token:
                    self.client.headers["Authorization"] = f"Bearer {self.token}"
                else:
                    resp.failure("No access_token in login response")
            else:
                resp.failure(f"Login failed: {resp.status_code}")

    def _authed(self) -> bool:
        return self.token is not None

    @task(4)
    def list_instructors(self):
        self.client.get("/instructors/?limit=20", name="GET /instructors")

    @task(2)
    def my_certifications(self):
        if self._authed():
            self.client.get("/certifications/me", name="GET /certifications/me")

    @task(1)
    def random_instructor_detail(self):
        # Best-effort: pick a low id; OK if it 404s under load.
        instructor_id = random.randint(1, 20)
        self.client.get(
            f"/instructors/{instructor_id}",
            name="GET /instructors/{id}",
        )
