# Contributing to Drive Alive

Thank you for your interest in contributing to Drive Alive! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a welcoming environment

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/drive-alive.git`
3. Create a feature branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes thoroughly
6. Commit with clear messages: `git commit -m "Add: feature description"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Create a Pull Request

## Development Workflow

### Backend (Python/FastAPI)

1. Create virtual environment: `cd backend && python -m venv venv`
2. Activate: `venv\Scripts\activate`
3. Install dependencies: `pip install -r requirements.txt`
4. Run tests: `pytest -v --cov=app`
5. Format code: `black app/ tests/`
6. Lint: `flake8 app/ tests/`
7. Type check: `mypy app/`

### Frontend (React Native/Expo)

1. Install dependencies: `cd frontend && npm install`
2. Start dev server: `npx expo start`
3. Run tests: `npm test`
4. Lint: `npm run lint`
5. Format: `npm run format`

## Code Standards

### Python (Backend)
- **Formatting**: Black (100 character line length)
- **Linting**: Flake8
- **Type hints**: Required for all functions
- **Imports**: Sorted with isort
- **Docstrings**: Required for public functions
- **Tests**: Pytest with minimum 80% coverage

### JavaScript/TypeScript (Frontend)
- **Formatting**: Prettier (100 character line length)
- **Linting**: ESLint with expo config
- **Type safety**: TypeScript preferred
- **Components**: Functional components with hooks
- **Tests**: Jest with React Native Testing Library

## Commit Message Guidelines

Use conventional commits format:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add WhatsApp reminder notifications
fix: resolve payment gateway timeout issue
docs: update API documentation for booking endpoints
```

## Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Add tests for new features
4. Follow code style guidelines
5. Write clear PR description
6. Link related issues
7. Request review from maintainers

## Testing Requirements

- **Backend**: All new code must have unit tests
- **Frontend**: UI components should have snapshot tests
- **Integration**: API endpoints must have integration tests
- **Coverage**: Maintain minimum 80% code coverage

## Documentation

- Update `docs/API.md` for API changes
- Update `README.md` for user-facing changes
- Add inline comments for complex logic
- Update `ARCHITECTURE.md` for architectural changes

## Review Process

1. Automated checks (CI/CD) must pass
2. Code review by at least one maintainer
3. Address feedback and make requested changes
4. Merge approved by maintainer

## Questions?

- Check existing issues and discussions
- Review `docs/` folder for documentation
- Ask questions in GitHub Discussions
- Contact maintainers for guidance

Thank you for contributing to Drive Alive! 🚗🇿🇦
