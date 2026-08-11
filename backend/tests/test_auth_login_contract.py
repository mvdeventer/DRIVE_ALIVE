from types import SimpleNamespace
from unittest.mock import MagicMock

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.models.user import UserRole
from app.routes import auth as auth_routes


def _build_login_client(monkeypatch, available_roles: set[str]) -> TestClient:
    app = FastAPI()
    app.include_router(auth_routes.router)

    def override_get_db():
        # Login clears Instructor.setup_token via db.query(...).first(); return
        # no instructor profile so the contract test stays auth-focused.
        fake_db = MagicMock()
        fake_db.query.return_value.filter.return_value.first.return_value = None
        yield fake_db

    app.dependency_overrides[auth_routes.get_db] = override_get_db

    fake_user = SimpleNamespace(
        id=1,
        email='contract@example.com',
        active_session_token=None,
        role=UserRole.STUDENT,
    )

    monkeypatch.setattr(
        auth_routes.AuthService,
        'authenticate_user',
        lambda db, username, password: fake_user,
    )
    monkeypatch.setattr(
        auth_routes.AuthService,
        'create_user_token',
        lambda user, role, db=None: 'test-token',
    )
    monkeypatch.setattr(
        auth_routes.RoleTransitionPolicy,
        'get_available_runtime_roles',
        lambda db, user: available_roles,
    )
    monkeypatch.setattr(
        auth_routes.RoleTransitionPolicy,
        'assert_runtime_role_ready',
        lambda db, user, selected_role: None,
    )

    return TestClient(app)


def test_login_returns_canonical_runtime_role(monkeypatch):
    client = _build_login_client(monkeypatch, {'student'})

    response = client.post(
        '/auth/login',
        data={
            'username': 'contract@example.com',
            'password': 'Secret123!',
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['role'] in {'admin', 'company_admin', 'instructor', 'student'}


def test_login_rejects_unknown_runtime_role_output(monkeypatch):
    client = _build_login_client(monkeypatch, {'school_owner'})

    response = client.post(
        '/auth/login',
        data={
            'username': 'contract@example.com',
            'password': 'Secret123!',
        },
    )

    assert response.status_code == 400
    assert response.json()['detail'] == 'Invalid runtime role resolved for this account.'
