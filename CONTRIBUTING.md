# Contributing to Electrical Supplier B2B Website

Thank you for your interest in contributing to this project! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and professional in all interactions
- Focus on constructive feedback
- Help maintain a welcoming environment for all contributors

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your feature or bugfix
4. Make your changes
5. Test your changes thoroughly
6. Submit a pull request

## Development Setup

Follow the installation instructions in the main README.md file to set up your local development environment.

## Coding Standards

### TypeScript

- Use explicit types for all function parameters and return values
- Avoid using `any` type - use `unknown` or create proper interfaces
- Define interfaces for all data structures
- Use meaningful variable and function names

### Code Formatting

- Code is formatted using Prettier
- Run `npm run format` before committing
- ESLint is configured for code quality checks
- Run `npm run lint` to check for issues

### Naming Conventions

- **Variables and Functions**: camelCase (`getUserData`, `productList`)
- **Components and Classes**: PascalCase (`ProductCard`, `AdminDashboard`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`, `MAX_FILE_SIZE`)
- **Files**: kebab-case for utilities, PascalCase for components (`api-client.ts`, `ProductCard.tsx`)

### File Structure

```
backend/src/
├── config/         # Configuration files
├── middlewares/    # Express middlewares
├── modules/        # Feature modules (auth, products, etc.)
│   └── [feature]/
│       ├── [feature].controller.ts
│       ├── [feature].service.ts
│       ├── [feature].routes.ts
│       └── [feature].types.ts
├── utils/          # Utility functions
└── app.ts          # Main application file

frontend/src/
├── components/     # React components
│   ├── common/     # Shared components
│   ├── layout/     # Layout components
│   └── ui/         # UI components
├── pages/          # Page components
├── services/       # API services
├── hooks/          # Custom React hooks
├── types/          # TypeScript types
└── utils/          # Utility functions
```

## Commit Message Guidelines

Use clear, descriptive commit messages following this format:

```
[Component] Brief description

Detailed explanation if needed
```

Examples:

- `[Backend] Add pagination to product endpoints`
- `[Frontend] Fix responsive layout on mobile devices`
- `[Database] Add index to improve query performance`
- `[Docs] Update installation instructions`

## Pull Request Process

1. **Update Documentation**: If your changes require documentation updates, include them in the PR
2. **Add Tests**: Include tests for new features when possible
3. **Check Build**: Ensure `npm run build` succeeds for both frontend and backend
4. **Lint Code**: Run `npm run lint` and fix any issues
5. **Describe Changes**: Provide a clear description of what your PR does and why
6. **Reference Issues**: Link to any related issues using `#issue-number`

## Testing

### Backend Testing

```bash
cd backend
npm test
```

### Frontend Testing

```bash
cd frontend
npm test
```

## Areas for Contribution

### High Priority

- [ ] Implement pagination for product listings
- [ ] Add full-text search functionality
- [ ] Write comprehensive test suites
- [ ] Implement file validation on client side
- [ ] Add email queue system for background processing

### Medium Priority

- [ ] Improve mobile responsiveness of admin panel
- [ ] Add password change functionality
- [ ] Implement refresh token mechanism
- [ ] Add loading states and error boundaries
- [ ] Optimize database queries

### Documentation

- [ ] API documentation improvements
- [ ] Add code comments for complex logic
- [ ] Create video tutorials
- [ ] Write deployment guides

### UI/UX Enhancements

- [ ] Improve accessibility (ARIA labels, keyboard navigation)
- [ ] Add dark mode support
- [ ] Enhance animation performance
- [ ] Create better error messages

## Reporting Bugs

When reporting bugs, please include:

1. **Description**: Clear description of the bug
2. **Steps to Reproduce**: Detailed steps to reproduce the issue
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**: OS, browser, Node.js version, etc.
6. **Screenshots**: If applicable

## Suggesting Features

When suggesting features, please include:

1. **Use Case**: Describe the problem or need
2. **Proposed Solution**: Your suggested implementation
3. **Alternatives**: Other solutions you've considered
4. **Additional Context**: Any other relevant information

## Questions?

If you have questions about contributing, please open an issue with the label "question" or reach out to the maintainers.

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.
