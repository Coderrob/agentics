# AGENTS.md - Agentics Repository Quality Contract

This file is the operating contract for AI agents and human contributors working in this repository.
Follow it before, during, and after every code or documentation change.

## Agent Operating Rules

- Work from the repository root unless a command explicitly says otherwise.
- Prefer existing project patterns over new abstractions.
- Keep changes scoped to the user's request.
- Do not revert unrelated user changes.
- Do not bypass lint, test, type, coverage, dependency, duplication, or formatting checks.
- Do not add inline `eslint-disable` comments.
- Treat every failed quality gate as a blocker unless the user explicitly accepts the failure.
- Report any command that could not be run, including the reason.

## Repository Structure

- `apps/cli`: Commander-based CLI application.
- `packages/core`: pure shared logic and reusable utilities.
- `packages/agentics`: workflow, context-cache, and agentic-domain logic.
- `packages/ai`: AI provider abstractions.
- `packages/github`: GitHub integration helpers.
- `docs`: product and how-to documentation.
- `workflows`: reusable GitHub Agentic Workflow Markdown sources for installation in other repos.
- `.github/workflows`: this repository's normal GitHub Actions workflows.

GitHub Agentic Workflows are Markdown files with frontmatter. Reusable sources belong in
`workflows/*.md`. Workflows that only serve this repository and do not require agent reasoning
belong in `.github/workflows/*.yml` as normal GitHub Actions workflows.

## Completion Definition

A change is complete only when:

- The requested behavior is implemented or the requested analysis is delivered.
- Relevant tests or documentation are updated.
- All applicable quality gates pass.
- Any skipped gate is clearly reported with the reason.
- The final response lists what changed and what was verified.

## Quality Gates

Run these commands from the repository root.

### 1. Lint

```bash
npm run lint
```

This runs:

- `npm run lint:es`: ESLint 10.x with `@coderrob/eslint-plugin-zero-tolerance` strict config.
- `npm run lint:md`: markdownlint-cli2 using `.markdownlint.json`.

Requirements:

- ESLint applies to all TypeScript files across the monorepo, including config files.
- `--max-warnings 0` is enforced.
- Inline ESLint disable comments are forbidden.
- Markdown line length is capped at 120 characters, excluding code blocks and tables.

### 2. Type Check

```bash
npm run typecheck
```

Requirements:

- Runs `tsc --noEmit` in every workspace package.
- No TypeScript errors are permitted.

### 3. Tests

```bash
npm test
```

Requirements:

- Runs all Vitest suites across workspace packages through TurboRepo.
- Test files must be in `src/**/*.test.ts`.
- Test descriptions must start with `should`.

### 4. Coverage

```bash
npm run coverage
```

Requirements:

- Uses `@vitest/coverage-v8`.
- Lines, functions, branches, and statements must each be at least 95%.
- Coverage is enforced per package.
- Do not lower thresholds in `vitest.package.config.ts`.

### 5. Circular Dependencies

```bash
npm run circular
```

Requirements:

- Uses madge to inspect package source trees.
- No circular dependencies are permitted.

### 6. Unused Code

```bash
npm run knip
```

Requirements:

- No unused exports, unreferenced files, or unlisted dependencies.
- Every exported symbol must be reachable from a package entry point.
- Remove partial implementations that are not consumed, or wire them into the product.

### 7. Duplication

```bash
npm run jscpd
```

Requirements:

- Copy-paste duplication across TypeScript source files must remain below 1%.
- Do not raise the threshold in `.jscpd.json`.
- Extract repeated logic into `packages/core` when appropriate.

### 8. Formatting

```bash
npm run format:check
```

Requirements:

- Uses Prettier 3.x with `prettier.config.mjs`.
- TypeScript, JSON, YAML, and Markdown must be formatted.
- Use `npm run format` to fix formatting when needed.

## Run All Gates

Use this before considering a change ready:

```bash
npm run typecheck && npm run lint && npm test && npm run coverage && npm run circular && npm run knip && npm run jscpd && npm run format:check
```

## TypeScript Architecture Rules

- Keep pure logic in `packages/core` when it is shared across packages.
- Keep side effects at application boundaries, such as CLI commands or GitHub integration adapters.
- Prefer immutable updates over array or object mutation.
- Avoid type assertions such as `as T`; use type guards and `unknown` narrowing.
- Use `@coderrob/typescript-type-guards` instead of raw `typeof` checks.
- Interface names must start with `I`, for example `IUsageMetrics`.
- Imports must be sorted alphabetically within each file.
- Functions must be sorted alphabetically within each file.
- Exported functions require full JSDoc with `@param`, `@returns`, and `@throws` when applicable.

## Forbidden Patterns

| Pattern                                                             | Reason                                   |
| ------------------------------------------------------------------- | ---------------------------------------- |
| `// eslint-disable`                                                 | Bypasses zero-tolerance rules            |
| `// eslint-disable-next-line`                                       | Bypasses zero-tolerance rules            |
| `/* eslint-disable */`                                              | Bypasses zero-tolerance rules            |
| Lowering coverage thresholds in `vitest.package.config.ts`          | Hides under-tested code                  |
| Adding a package to knip `ignoreDependencies` without justification | Hides unused dependencies                |
| Raising `threshold` in `.jscpd.json`                                | Allows duplication to grow               |
| Exporting symbols that are never imported                           | Creates dead code                        |
| Committing unformatted files                                        | Fails `npm run format:check`             |
| Putting reusable GH-AW Markdown in `.github/workflows`              | Confuses source templates with local CI  |
| Putting repo-local deterministic workflows in `workflows`           | Confuses local automation with templates |

## Final Response Expectations

When finished, report:

- Files changed.
- Tests and quality gates run.
- Any failures or skipped checks.
- Any remaining risk or follow-up that is directly relevant to the user's request.
