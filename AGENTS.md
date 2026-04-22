# AGENTS.md — Agentics Repository Quality Contract

This file defines the non-negotiable quality gates that **every agent and contributor** must satisfy
before a change is considered complete. All checks must pass with zero failures on every PR.

---

## Quality Gates

### 1. Lint — Zero Tolerance

Run from the repository root:

```bash
npm run lint
```

This runs two sub-checks in sequence:

- **`npm run lint:es`** — ESLint 10.x with **`@coderrob/eslint-plugin-zero-tolerance` strict**
  config.
  - Applies to **all TypeScript files** across the entire monorepo, including config files
    (`vitest.config.ts`, etc.) and the `refinements/` folder.
  - `--max-warnings 0` is enforced — warnings are treated as errors.
  - **Inline `eslint-disable` comments are strictly forbidden.** The
    `zero-tolerance/no-eslint-disable` rule enforces this automatically.
  - Do not add per-file or per-line overrides to bypass rules. If a rule is inappropriate for a
    specific file category (e.g., test files), update `eslint.config.mjs` at the config level —
    never inline in source.
- **`npm run lint:md`** — markdownlint-cli2 with rules in `.markdownlint.json`.
  - All Markdown files are checked; `node_modules/` is excluded.
  - Line length is capped at 120 characters; code blocks and tables are exempt.

### 2. Tests — All Must Pass

Run from the repository root:

```bash
npm test
```

- Executes all Vitest test suites across every workspace package via TurboRepo.
- Every test file must be in `src/**/*.test.ts`.
- Test descriptions **must** start with `"should"` (enforced by
  `zero-tolerance/require-test-description-style`).

### 3. Type Check — Zero Errors

Run from the repository root:

```bash
npm run typecheck
```

- Runs `tsc --noEmit` in every workspace package.
- No TypeScript errors are permitted.

### 4. Test Coverage — ≥ 95%

Run from the repository root:

```bash
npm run coverage
```

- Uses `@vitest/coverage-v8` with enforced thresholds of **95%** for lines, functions, branches, and
  statements.
- Thresholds are configured in `vitest.package.config.ts` and cannot be lowered.
- Coverage is checked per-package. A package that drops below 95% in any dimension fails the gate.

### 5. Circular Reference Check — Zero Cycles

Run from the repository root:

```bash
npm run circular
```

- Uses **madge** to detect circular imports within package source trees.
- No circular dependencies are permitted.

### 6. Unused Code — Knip

Run from the repository root:

```bash
npm run knip
```

- Uses **knip** to identify unused exports, unreferenced files, and unlisted dependencies.
- Every exported symbol must be reachable from a package entry point.
- Fix partial implementations: if a function is exported but never consumed, either use it or remove
  it.

### 7. Code Duplication — JSCPD < 1 %

Run from the repository root:

```bash
npm run jscpd
```

- Uses **jscpd** to measure copy-paste duplication across all TypeScript source files.
- Duplication must remain **below 1 %**.
- Configuration is in `.jscpd.json`. The `exitCode: 1` setting means jscpd will fail the build if
  the threshold is exceeded.
- If duplication is detected, extract shared logic into `packages/core` as a pure utility.

### 8. Formatting — Prettier

Run from the repository root:

```bash
npm run format:check
```

- Uses **Prettier 3.x** with the configuration in `prettier.config.mjs`.
- All TypeScript, JSON, YAML, and Markdown files must be formatted consistently.
- Run `npm run format` to auto-fix formatting before committing.
- The `eslint-config-prettier` integration disables any ESLint rules that conflict with Prettier.

---

## Forbidden Patterns

| Pattern                                                             | Reason                                                                           |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `// eslint-disable`                                                 | Bypasses zero-tolerance rules — automatically caught by `no-eslint-disable` rule |
| `// eslint-disable-next-line`                                       | Same as above                                                                    |
| `/* eslint-disable */`                                              | Same as above                                                                    |
| Lowering coverage thresholds in `vitest.package.config.ts`          | Hides under-tested code                                                          |
| Adding a package to knip `ignoreDependencies` without justification | Hides unused dependencies                                                        |
| Raising `threshold` in `.jscpd.json`                                | Allows duplication to grow                                                       |
| Exporting symbols that are never imported                           | Creates dead code — caught by knip                                               |
| Committing unformatted files                                        | Caught by `npm run format:check`                                                 |

---

## Running All Gates

To run every quality gate in one command (recommended before opening a PR):

```bash
npm run typecheck && npm run lint && npm test && npm run coverage && npm run circular && npm run knip && npm run jscpd && npm run format:check
```

---

## Architecture Reminders

- **Functional-first**: keep pure logic in `packages/core`. Avoid side effects in exported
  functions.
- **No type assertions** (`as T`): use type guards or `unknown`-narrowing instead.
- **No array/object mutation**: use immutable spread patterns.
- **All exported functions require full JSDoc** with `@param`, `@returns`, and `@throws` tags where
  applicable.
- **Interface names must start with `I`** (e.g., `IUsageMetrics`).
- **Functions must be sorted alphabetically** within each file.
- **Imports must be sorted alphabetically** within each file.
