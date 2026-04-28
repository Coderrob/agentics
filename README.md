# Agentics Monorepo

A TypeScript-first TurboRepo monorepo for building and refining agentic workflows with
GitHub-integrated automation and AI-assisted optimization.

## Project Overview

This repository provides:

- A monorepo architecture for workflow development and refinement
- A Commander.js CLI for refinement operations
- Modular packages for core logic, orchestration, GitHub integration, and AI analysis
- GitHub Actions for deterministic automation and GH-AW markdown for agentic automation
- GitHub workflows, issue templates, and rulesets for governance

## Monorepo Structure

```text
/apps
  /cli
/packages
  /core
  /agentics
  /github
  /ai
/refinements
/docs
/workflows
/.github
  /workflows
  /ISSUE_TEMPLATE
  /rulesets
```

## Agentic Workflow Philosophy

- Favor direct, deterministic tool invocation over repeated deliberation loops
- Minimize unnecessary reasoning about tools, permissions, and state
- Track optimization outcomes with measurable benchmark metrics

## CLI Usage

```bash
npm install
npm run cli -- refine run --workflow workflows/workflow-factory.md --run-id 1001
npm run cli -- refine analyze --conversation "Reasoning about tool call"
npm run cli -- refine extract --run-id 1001
```

## Refinement Lifecycle

1. Compile workflow (`gh aw compile`)
2. Execute workflow (`gh aw run`)
3. Create `refinements/{run_id}` and download artifacts
4. Extract `prompt.txt`, `conversation.txt`, and `usage.json`
5. Analyze transcripts via AI provider abstraction (default: Ollama)
6. Generate actionable tasks and benchmark improvements

## Workflow Examples

- `.github/workflows/context-cache.yml`
- `.github/workflows/context-cache-effectiveness.yml`
- `workflows/workflow-factory.md`

Reusable GH-AW markdown sources live in `/workflows`. Workflows used only by this repository live in
`.github/workflows` as normal GitHub Actions YAML.

## Performance Optimization Philosophy

Optimization targets:

- Token usage reduction
- Tool call count reduction
- Execution time reduction
- Success-rate stability or improvement

## Contributing

1. Install dependencies: `npm install`
2. Run tests: `npm test`
3. Run type checks: `npm run typecheck`
4. Open a pull request using issue templates and required checks
