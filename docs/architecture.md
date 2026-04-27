# Architecture Overview

- `apps/cli`: Commander.js refinement CLI
- `packages/core`: Pure metrics and comparison logic
- `packages/agentics`: Workflow orchestration and refinement planning
- `packages/github`: GitHub CLI command helpers
- `packages/ai`: AI provider abstraction with Ollama default
- `workflows`: Analysis, generation, refinement, evaluation catalog

## Package Responsibilities

### `packages/core`

Use this package for pure logic that has no process, filesystem, network, or GitHub side effects.

Current responsibilities:

- Validate `usage.json` metrics.
- Compute total token usage.
- Compare baseline and candidate runs.
- Summarize token, tool-call, and execution-time reductions.

Add code here when it can be tested with plain inputs and outputs.

### `packages/ai`

Use this package for conversation analysis provider logic.

Current behavior is deterministic and local. The default provider counts reasoning and tool-call
language and returns recommendations. It does not call an external model.

Add provider behavior here when analysis needs to change independently of the CLI.

### `packages/github`

Use this package for GitHub CLI integration.

Current responsibilities:

- Build display commands for `gh aw compile`, `gh aw run`, and `gh run download`.
- Execute GitHub CLI commands with `execFile`.
- Create artifact directories before downloads.
- Retry artifact downloads through an optional fallback workflow.

Keep shell execution here so command argument handling remains centralized.

### `packages/agentics`

Use this package for product-level orchestration that combines lower-level packages.

Current responsibilities:

- Build artifact paths for a run.
- Build a refinement plan.
- Route conversation analysis through the AI provider package.

Add lifecycle-level behavior here when a feature spans GitHub, AI, and core metrics.

### `apps/cli`

Use this package for command-line parsing and output formatting.

The CLI should stay thin:

- Parse arguments.
- Call package functions.
- Print JSON.
- Let package code own business behavior.

## Add A New CLI Command

1. Add a command module under `apps/cli/src/commands/refine`.
2. Keep command handlers small and typed.
3. Put reusable logic in `packages/core`, `packages/agentics`, or another package.
4. Register the command in `apps/cli/src/commands/refine/index.ts`.
5. Add tests under `apps/cli/src/__tests__`.
6. Run the quality gates.

## Add A New Metric

1. Add the field to the relevant interface in `packages/core`.
2. Update validation logic for unknown input.
3. Update benchmark calculation logic.
4. Add tests for valid input, invalid input, and edge cases.
5. Update `docs/refinement.md` and `docs/cli.md`.

## Add A New Analysis Provider

1. Implement the provider in `packages/ai`.
2. Return the existing `IConversationAnalysis` shape or deliberately extend it.
3. Update `createProvider` to route by provider name.
4. Add tests for supported and unsupported provider names.
5. Document required environment variables or local services.

## Testing Strategy

Pure code belongs in package tests with direct assertions.

Command code should be tested through Commander command registration and captured stdout.

GitHub command execution should be mocked at `node:child_process` boundaries. Do not require a real
GitHub token or network access for unit tests.

Coverage must stay at or above the repository threshold for every package.
