# Agentics

Agentics provides a monorepo for workflow orchestration, refinement automation, and optimization
validation.

Use Agentics when you need a repeatable way to inspect agentic workflow runs, collect run artifacts,
analyze conversation traces, and compare optimization attempts with measurable usage data.

## What You Can Do

- Generate a refinement plan for a workflow run.
- Locate the expected prompt, conversation, and usage artifact paths for a run.
- Analyze a conversation transcript for repeated reasoning and excessive tool invocation language.
- Compare baseline and candidate `usage.json` files.
- Keep workflow definitions organized by analysis, generation, refinement, and evaluation stage.

## Install Dependencies

Run all commands from the repository root.

```bash
npm install
```

For reproducible CI-style installs, use the lockfile.

```bash
npm ci
```

## Run The CLI

The CLI is exposed through the root `cli` script.

```bash
npm run cli -- refine --help
```

Generate a refinement plan for a known workflow path and run ID.

```bash
npm run cli -- refine run --workflow workflows/analysis/workflow-analysis.yaml --run-id 123
```

The command prints JSON. It does not execute the GitHub workflow itself. Use the emitted commands
when you want to run the lifecycle manually or from another automation layer.

## Validate The Repository

Before opening a pull request, run the same gates expected by the repository quality contract.

```bash
npm run typecheck
npm run lint
npm test
npm run coverage
npm run circular
npm run knip
npm run jscpd
npm run format:check
```

## Documentation Map

- [CLI](cli.md): command usage, inputs, outputs, and examples.
- [Refinement](refinement.md): end-to-end how-to guidance for improving a workflow.
- [Workflows](workflows.md): how to read and author workflow YAML files.
- [Architecture](architecture.md): package responsibilities and extension points.
- [Philosophy](philosophy.md): design rules for lean agentic workflows.
