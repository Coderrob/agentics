# LabelOps Workflow Factory

This document defines a future issue-driven workflow factory for Agentics. The goal is to let a
maintainer open a workflow request in plain language, such as "I need a workflow that checks stale
documentation and opens a pull request", and have an agentic workflow produce reviewable workflow
artifacts.

The design adapts Tendril's self-extending capability pattern to GitHub Agentic Workflows. Tendril
creates tools dynamically inside a sandbox. Agentics should use the same capability-first loop, but
it should generate repository artifacts for human review instead of silently trusting new runtime
tools.

Reference material:

- [GitHub Agentic Workflows LabelOps](https://github.github.com/gh-aw/patterns/label-ops/)
- [Getting Started with MCP](https://github.github.com/gh-aw/guides/getting-started-mcp/)
- [Using Custom MCP Servers](https://github.github.com/gh-aw/guides/mcps/)
- [GH-AW as an MCP Server](https://github.github.com/gh-aw/reference/gh-aw-as-mcp-server/)

## Product Flow

The workflow factory starts from a GitHub issue.

1. A user opens a workflow creation issue with general intent.
2. The issue template applies `workflow`, `workflow:requested`, and `needs-triage`.
3. A maintainer or triage automation applies `workflow:generate`.
4. A LabelOps-triggered agentic workflow reads the issue and existing repository context.
5. The workflow derives a typed workflow specification.
6. Repo-owned MCP tools render proposed workflow, MCP, docs, and test artifacts.
7. The workflow emits safe outputs only: issue comments, labels, and proposed file changes.
8. A human reviews, revises, and merges the generated artifacts.

The factory must choose the workflow format based on whether reasoning is required. Deterministic
automation should be generated as `.github/workflows/*.yml` for the target repository. Reusable
automation that requires an agent should be generated as `workflows/*.md` in this repository so it
can be installed elsewhere.

Use `label_command` for the one-shot `workflow:generate` action because the command should be
re-triggerable by applying the label again. Use persistent `names:` filters for state labels such as
`workflow:planning`, `workflow:needs-review`, `workflow:implemented`, and `workflow:blocked`.

## Tendril Architecture

The local `tendril/` repository demonstrates the Agent Capability pattern: keep the hardcoded tool
surface small, search a persistent registry before acting, and grow the registry when no tool
exists.

Tendril's current agent is a TypeScript sidecar in `tendril/tendril-agent`. It uses the Strands SDK
with provider adapters for Bedrock, Ollama, OpenAI, and Anthropic. The sidecar suppresses default
SDK printing and owns transport output itself, which keeps the agent compatible with an ACP-style
host that expects structured events.

The loop is driven by three bootstrap tools:

- `listCapabilities`: returns registered capability summaries.
- `registerCapability`: stores a capability definition and its TypeScript implementation.
- `execute`: runs a registered capability by name.

The system prompt requires the agent to list capabilities before every action. If a relevant
capability exists, the agent executes it. If none exists, the agent writes a new TypeScript tool,
registers it, and then executes it. The model cannot pass arbitrary code directly to `execute`; the
API accepts only a capability name and arguments.

The registry is filesystem-backed:

```text
{workspace}/
  tools/
    index.json
    fetch_url.ts
    summarize_text.ts
```

`index.json` contains capability metadata: name, capability description, triggers, suppression
conditions, tool path, author, creation date, and version. Tool implementations are plain TypeScript
files. This makes capabilities inspectable and version-controllable.

Execution happens through a Deno subprocess. Tendril builds a temporary script with an injected
`args` object and `__workspace` value, then runs Deno with scoped read/write permissions, a network
allowlist, no interactive prompt, timeout enforcement, output-size limits, and best-effort temp file
cleanup. Standard output is the tool result; standard error is diagnostic output.

Tendril also includes an ACP/NDJSON transport layer. The host communicates with the sidecar using
newline-delimited JSON-RPC messages. The sidecar maps agent activity into phases such as thinking,
tool calls, observations, completion, and errors. This split keeps model behavior, capability
storage, sandbox execution, and UI or host transport as separate concerns.

The important architectural lesson for Agentics is not "let workflows execute arbitrary generated
tools." It is "make capability discovery and generation explicit, persistent, auditable, and
repeatable."

## Agentics Adaptation

Agentics should adapt Tendril's loop to repository automation:

- Replace runtime-created Deno tools with reviewable repository artifacts.
- Treat generated workflows and MCP tools as proposals until reviewed.
- Store capability definitions in a repo-owned registry when a workflow generation pattern becomes
  reusable.
- Use GitHub Agentic Workflows safe outputs for writes, comments, labels, and pull request changes.
- Keep custom MCP servers read-oriented or proposal-oriented.

The workflow factory should expose a small set of deterministic repo tools to the agent instead of a
large collection of specialized commands. The agent should first inspect known capabilities, then
decide whether the issue can reuse an existing generation pattern or needs a new proposed
capability.

The persistent registry for Agentics should be a future repository directory, for example:

```text
workflow-capabilities/
  index.json
  tools/
    render_workflow_spec.ts
    scaffold_mcp_tool.ts
```

Unlike Tendril, generated code should not be executed immediately as trusted automation. It should
be emitted as proposed files and validated by tests, schema checks, and human review.

## Target Interfaces

The workflow factory should use interface-driven boundaries so the CLI, MCP server, and agentic
workflow can share the same product logic.

```ts
interface IWorkflowRequest {
  readonly author: string;
  readonly body: string;
  readonly issueNumber: number;
  readonly labels: readonly string[];
  readonly requestText: string;
  readonly title: string;
}

interface ICapabilityDefinition {
  readonly capability: string;
  readonly createdBy: 'agent' | 'human';
  readonly name: string;
  readonly suppression: readonly string[];
  readonly toolPath: string;
  readonly triggers: readonly string[];
  readonly version: string;
}

interface IWorkflowSpec {
  readonly acceptanceCriteria: readonly string[];
  readonly category: 'analysis' | 'generation' | 'refinement' | 'evaluation';
  readonly description: string;
  readonly inputs: Readonly<Record<string, string>>;
  readonly mcpTools: readonly string[];
  readonly name: string;
  readonly outputs: Readonly<Record<string, string>>;
  readonly permissions: Readonly<Record<string, string>>;
  readonly safeOutputs: readonly string[];
  readonly steps: readonly string[];
}

interface IGeneratedWorkflowArtifact {
  readonly content: string;
  readonly path: string;
  readonly purpose: 'workflow' | 'mcp-tool' | 'docs' | 'test';
}
```

Service boundaries:

```ts
interface IWorkflowRequestParser {
  parse(issue: Readonly<IWorkflowRequest>): IWorkflowSpec;
}

interface IWorkflowCapabilityRegistry {
  list(): readonly ICapabilityDefinition[];
  register(definition: Readonly<ICapabilityDefinition>): void;
}

interface IWorkflowArtifactRenderer {
  render(spec: Readonly<IWorkflowSpec>): readonly IGeneratedWorkflowArtifact[];
}

interface IWorkflowFactoryValidator {
  validate(
    spec: Readonly<IWorkflowSpec>,
    artifacts: readonly IGeneratedWorkflowArtifact[],
  ): readonly string[];
}
```

Recommended package ownership:

- `packages/core`: pure validation helpers and schema utilities.
- `packages/agentics`: request parsing, capability registry logic, and artifact planning.
- `packages/github`: GitHub CLI and GH-AW command helpers.
- `packages/mcp`: future stdio MCP server exposing deterministic workflow factory tools.
- `apps/cli`: thin dry-run commands for local testing.

## MCP Tooling Plan

Add a future `packages/mcp` workspace package that exposes stdio MCP tools backed by pure Agentics
logic. The server should be usable from GitHub Agentic Workflows as a custom MCP server and from
local MCP hosts during development.

Initial tool set:

- `parse_workflow_request`: converts issue title, body, labels, and author into `IWorkflowRequest`.
- `derive_workflow_spec`: converts a request into `IWorkflowSpec`.
- `list_workflow_capabilities`: returns existing workflow factory capabilities.
- `render_workflow_artifacts`: returns proposed files without writing them directly.
- `validate_workflow_artifacts`: checks generated artifacts before safe output handling.

The MCP server must not directly merge, push, or mutate repository history. Any GitHub write should
flow through GitHub Agentic Workflow safe outputs or a human-reviewed pull request.

GitHub Agentic Workflows can also expose `gh aw` itself as an MCP server using `gh aw mcp-server`.
That is useful for status and workflow-management operations, but the repo-owned MCP server should
remain focused on deterministic Agentics product logic.

## Agentic Workflow Design

Use `workflows/workflow-factory.md` as the reusable GitHub Agentic Workflow source for the factory.
Its behavior should be:

1. Trigger on issue label activity.
2. Match `workflow:generate` as the one-shot command label.
3. Read issue context through GitHub MCP tools.
4. Call repo MCP tools to parse, derive, render, and validate.
5. Comment with the interpreted spec and assumptions.
6. Apply `workflow:planning` while work is in progress.
7. Apply `workflow:needs-review` when proposed artifacts are ready.
8. Apply `workflow:blocked` with reasons if validation fails.

The workflow should request minimal permissions. Read operations should use MCP tools. Write
operations should be limited to safe outputs such as labels, comments, and proposed file changes.

## Issue Template Guidance

The current workflow creation issue template can remain small. It should accept:

- A workflow name when the requester already has one.
- A natural-language request covering intent, inputs, outputs, and expected behavior.

The most important routing detail is label state. New workflow requests should start with:

```yaml
labels: [workflow, workflow:requested, needs-triage]
```

Maintainers or automation should add `workflow:generate` only when the request is ready for the
workflow factory. This keeps generation opt-in and prevents accidental agentic work on incomplete
issues.

## Generated Artifacts

The factory should produce reviewable artifacts:

- A normal GitHub Actions workflow for deterministic behavior, or a GitHub Agentic Workflow markdown
  source when reasoning is required.
- Optional MCP tool scaffold for new deterministic repo behavior.
- Tests or validation fixtures for parser, renderer, and schema behavior.
- Documentation updates that explain how to run and validate the workflow.
- An issue comment summarizing assumptions, generated paths, and next review steps.

Generated output must not be auto-merged. Generated MCP tools must not be trusted until reviewed,
tested, and included in the normal repository quality gates.

## Implementation Guide

Recommended order:

1. Add pure interfaces and schema validators to core or agentics package code.
2. Build a dry-run CLI command that accepts fixture issue JSON and prints proposed artifacts.
3. Add `packages/mcp` with stdio tools that wrap the same pure functions.
4. Add workflow factory issue fixtures and unit tests.
5. Add a GitHub Agentic Workflow source that uses LabelOps and the repo MCP server.
6. Add safe-output handling for comments, labels, and proposed file changes.
7. Add documentation for maintainers and requesters.

Keep the first implementation proposal-only. The first success milestone is a workflow request issue
that produces a clear spec, proposed files, and a validation report without merging anything.

## Test Plan

Documentation checks:

```bash
npm run lint:md
npm run format:check
```

Future implementation checks:

- Unit test issue parsing from fixture issue bodies.
- Unit test `IWorkflowSpec` derivation for analysis, generation, refinement, and evaluation
  categories.
- Unit test renderer output paths and content for workflow, MCP, docs, and test artifacts.
- Unit test validator failures for missing workflow fields, unsafe permissions, and missing safe
  outputs.
- Add a dry-run CLI or MCP fixture test that returns proposed artifacts without writing GitHub data.
- Keep real `gh aw compile`, GitHub writes, and PR creation out of unit tests.

## Security Rules

- Do not run generated tools automatically.
- Do not allow custom MCP tools to perform direct repository writes.
- Do not grant write permissions by default.
- Do not use broad label names such as `ready`; use namespaced labels like `workflow:generate`.
- Treat issue text as untrusted input.
- Require human review before generated artifacts become executable workflow code.
