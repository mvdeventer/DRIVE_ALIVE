.PHONY: help setup-backend setup-frontend install test lint format clean docker-up docker-down

help:
	@echo "Drive Alive - Makefile Commands"
	@echo "================================"
	@echo "setup-backend    - Setup Python backend (venv + dependencies)"
	@echo "setup-frontend   - Setup React Native frontend (npm install)"
	@echo "install          - Setup both backend and frontend"
	@echo "test             - Run all tests (backend + frontend)"
	@echo "lint             - Run all linters"
	@echo "format           - Format all code"
	@echo "clean            - Clean build artifacts and caches"
	@echo "docker-up        - Start Docker services"
	@echo "docker-down      - Stop Docker services"

setup-backend:
	cd backend && python -m venv venv
	cd backend && venv\Scripts\activate && pip install --upgrade pip
	cd backend && venv\Scripts\activate && pip install -r requirements.txt

setup-frontend:
	cd frontend && npm install

install: setup-backend setup-frontend

test:
	cd backend && venv\Scripts\activate && pytest -v --cov=app
	cd frontend && npm test

lint:
	cd backend && venv\Scripts\activate && flake8 app/ tests/
	cd backend && venv\Scripts\activate && mypy app/
	cd frontend && npm run lint

format:
	cd backend && venv\Scripts\activate && black app/ tests/
	cd backend && venv\Scripts\activate && isort app/ tests/
	cd frontend && npm run format

clean:
	cd backend && rmdir /s /q __pycache__ .pytest_cache .coverage htmlcov 2>nul || exit /b 0
	cd frontend && rmdir /s /q node_modules .expo dist 2>nul || exit /b 0

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down
