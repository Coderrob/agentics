# Contributing to Agentics

Thank you for your interest in contributing to Agentics. This document describes the process for
reporting issues, proposing changes, and submitting pull requests.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By
participating you agree to uphold its standards.

## Getting Started

1. **Fork** the repository and clone your fork locally.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Confirm the quality gates pass on the unmodified codebase:

   ```bash
   npm run typecheck && npm run lint && npm test && npm run coverage \
     && npm run circular && npm run knip && npm run jscpd && npm run format:check
   ```

## Development Workflow

### Branching

- Branch from `main` using a descriptive name: `feat/`, `fix/`, `chore/`, `docs/`.
- Keep branches focused on a single concern.

### Making Changes

- Follow the architecture guidelines in [AGENTS.md](AGENTS.md).
- All exported functions require full JSDoc (`@param`, `@returns`, `@throws`).
- Interface names must start with `I` (e.g. `IUsageMetrics`).
- Use immutable spread patterns; never mutate arrays or objects in-place.
- Do not use type assertions (`as T`); use type guards or `unknown`-narrowing instead.
- Functions and imports must be sorted alphabetically within each file.

### Formatting

This project uses [Prettier](https://prettier.io) for consistent formatting. Run the formatter
before committing:

```bash
npm run format
```

### Quality Gates

Every pull request must pass all eight quality gates with zero failures:

| Gate               | Command                |
| ------------------ | ---------------------- |
| Type check         | `npm run typecheck`    |
| Lint               | `npm run lint`         |
| Tests              | `npm test`             |
| Coverage (≥ 95%)   | `npm run coverage`     |
| Circular refs      | `npm run circular`     |
| Unused code        | `npm run knip`         |
| Duplication (< 1%) | `npm run jscpd`        |
| Formatting         | `npm run format:check` |

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org):

```
<type>(<scope>): <short description>
```

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`.

## Submitting a Pull Request

1. Ensure all quality gates pass locally.
2. Push your branch and open a pull request against `main`.
3. Fill in the pull request template completely.
4. A maintainer will review your changes and may request modifications.
5. Once approved and all required checks pass, your PR will be merged.

## Reporting Issues

Use one of the issue templates in `.github/ISSUE_TEMPLATE/`:

- **Refinement Task** — workflow inefficiency or quality issue.
- **Performance Improvement** — token or tool-call optimization opportunity.
- **Workflow Creation** — request a new agentic workflow.

## Questions

Open a [GitHub Discussion](../../discussions) for general questions or design proposals.
