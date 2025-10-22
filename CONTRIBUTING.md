# Contributing to Musable

Thank you for your interest in contributing to Musable! This document provides guidelines and instructions for contributing to this self-hosted music library project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style and Standards](#code-style-and-standards)
- [Pre-commit Hooks](#pre-commit-hooks)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)

## Code of Conduct

This project follows a code of conduct that we expect all contributors to follow. Please be respectful, inclusive, and constructive in all interactions.

## Getting Started

### Prerequisites

- **Node.js 18+** and npm
- **Git** for version control
- **Python 3.8+** (for pre-commit hooks)
- **Docker** (optional, for containerized development)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/musable.git
   cd musable
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/musable/musable.git
   ```

## Development Setup

### 1. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 2. Environment Configuration

**Backend Environment:**
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

**Frontend Configuration:**
```bash
# Update frontend/public/config.json for development
{
  "BASE_URL": "http://localhost:3000",
  "API_BASE_URL": "http://localhost:3001/api",
  "WEBSOCKET_URL": "ws://localhost:3001"
}
```

### 3. Database Setup

```bash
cd backend
npm run db:init
```

### 4. Start Development Servers

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Pre-commit Hooks

This project uses pre-commit hooks to ensure code quality and consistency. **All contributors must set up pre-commit hooks before making any commits.**

### Installation

1. **Create and activate a virtual environment:**
   ```bash
   uv venv && . ./.venv/bin/activate && pip install pre-commit && pre-commit install
   ```

2. **Alternative installation (if you don't have `uv`):**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install pre-commit
   pre-commit install
   ```

### What Pre-commit Does

The pre-commit configuration (`.pre-commit-config.yaml`) includes:

- **General hooks**: trailing whitespace, end-of-file fixes, YAML/JSON validation
- **Biome**: Code formatting, linting, and import organization for TypeScript/JavaScript
- **Prettier**: HTML formatting for UI files
- **Jest**: Automated testing for both frontend and backend (runs on pre-push)

### Running Pre-commit Manually

```bash
# Run on all files
pre-commit run --all-files

# Run on staged files only
pre-commit run

# Update hook versions
pre-commit autoupdate
```

## Code Style and Standards

### TypeScript/JavaScript

- **Formatter**: Biome (configured in `biome.json`)
- **Linter**: Biome with recommended rules
- **Code Style**:
  - Single quotes for strings
  - Trailing commas
  - 80 character line width
  - 2-space indentation

### React/TypeScript (Frontend)

- Use functional components with hooks
- Follow React best practices
- Use TypeScript interfaces for props
- Implement proper error boundaries

### Node.js/TypeScript (Backend)

- Follow SOLID principles
- Use proper error handling
- Implement comprehensive logging
- Follow RESTful API conventions

### Code Organization

- **Backend**: Organized by feature (models, controllers, routes, services)
- **Frontend**: Component-based architecture with hooks and stores
- **Path aliases**: Use configured path aliases (`@/` for imports)

## Testing

### Running Tests

**Backend:**
```bash
cd backend
npm test
npm run test:watch  # Watch mode
```

**Frontend:**
```bash
cd frontend
npm test
```

### Test Coverage

- Write unit tests for new features
- Test critical user flows
- Maintain test coverage above 80%
- Use Jest for both frontend and backend testing

### Pre-push Testing

Tests run automatically on pre-push hooks:
- Frontend Jest tests
- Backend Jest tests
- All tests must pass before pushing

## Submitting Changes

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Your Changes

- Write clean, readable code
- Follow the established patterns
- Add tests for new functionality
- Update documentation if needed

### 3. Commit Your Changes

```bash
git add .
git commit -m "feat: add new feature description"
# or
git commit -m "fix: resolve issue with description"
```

**Commit Message Format:**
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for adding tests
- `chore:` for maintenance tasks

### 4. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear description of changes
- Reference to any related issues
- Screenshots for UI changes
- Testing instructions

## Project Structure

```
musable/
├── backend/                 # Node.js/TypeScript backend
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Express middleware
│   │   └── utils/           # Utility functions
│   ├── package.json
│   └── tsconfig.json
├── frontend/                # React/TypeScript frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # API services
│   │   ├── stores/          # Zustand stores
│   │   └── types/           # TypeScript types
│   ├── package.json
│   └── tsconfig.json
├── .pre-commit-config.yaml  # Pre-commit configuration
├── biome.json              # Biome configuration
├── docker-compose.yml      # Docker setup
└── README.md
```

## Development Workflow

### 1. Stay Updated

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

### 2. Feature Development

1. Create feature branch from `main`
2. Make changes with proper commits
3. Run tests locally
4. Push and create PR
5. Address review feedback
6. Merge after approval

### 3. Bug Fixes

1. Create fix branch from `main`
2. Reproduce and fix the issue
3. Add tests to prevent regression
4. Document the fix
5. Submit PR with clear description

## Code Review Process

### For Contributors

- Ensure all pre-commit hooks pass
- Write clear commit messages
- Keep PRs focused and small
- Respond to review feedback promptly
- Test your changes thoroughly

### For Reviewers

- Review code for correctness and style
- Check test coverage
- Verify documentation updates
- Be constructive and helpful
- Approve when ready

## Docker Development

For containerized development:

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Access container
docker-compose exec musable sh
```

## Troubleshooting

### Common Issues

1. **Pre-commit hooks failing**: Run `pre-commit run --all-files` to fix issues
2. **TypeScript errors**: Check `tsconfig.json` configuration
3. **Test failures**: Ensure all dependencies are installed
4. **Database issues**: Run `npm run db:init` in backend directory

### Getting Help

- Check existing GitHub issues
- Join our Discord community: https://discord.gg/A4ymNnQkP2
- Create a new issue with detailed information

## License

By contributing to Musable, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Musable! Your contributions help make this project better for everyone.
