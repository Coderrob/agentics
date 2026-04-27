# Workflow Catalog

Workflows are grouped into:

- `analysis`
- `generation`
- `refinement`
- `evaluation`

Each workflow is YAML-defined with metadata, inputs, outputs, and execution steps.

## Directory Layout

Workflow files live under `workflows/{category}`.

```text
workflows/
  analysis/
    workflow-analysis.yaml
  evaluation/
    workflow-evaluation.yaml
  generation/
    workflow-generation.yaml
  refinement/
    workflow-refinement.yaml
```

## Workflow File Shape

Every workflow should define:

- `name`: stable workflow identifier.
- `category`: one of `analysis`, `generation`, `refinement`, or `evaluation`.
- `description`: one sentence describing the workflow purpose.
- `inputs`: named inputs and their primitive types.
- `outputs`: named outputs and their primitive types.
- `steps`: ordered shell commands or Agentics CLI commands.

Example:

```yaml
name: workflow-analysis
category: analysis
description: Analyze workflow traces for redundant reasoning and tool call inefficiencies.
inputs:
  workflow_path:
    type: string
  run_id:
    type: string
outputs:
  optimization_findings:
    type: object
steps:
  - name: compile
    run: gh aw compile --workflow ${inputs.workflow_path}
  - name: execute
    run: gh aw run --workflow ${inputs.workflow_path}
  - name: extract
    run: gh run download ${inputs.run_id} -D refinements/${inputs.run_id}
```

## Choose The Right Category

Use `analysis` for workflows that inspect existing traces, artifacts, or run metadata.

Use `generation` for workflows that create new workflow scaffolds or metadata.

Use `refinement` for workflows that inspect a run and produce suggested changes.

Use `evaluation` for workflows that compare baseline and candidate outcomes.

## Author A New Workflow

1. Create a YAML file under the matching category directory.
2. Give the workflow a stable lowercase `name`.
3. Define inputs before writing steps.
4. Keep each step deterministic and directly executable.
5. Prefer Agentics CLI commands for refinement operations.
6. Run repository checks before committing the workflow.

## Use Agentics Commands In Workflow Steps

For refinement planning:

```yaml
steps:
  - name: plan
    run: agentics refine run --workflow ${inputs.workflow_path} --run-id ${inputs.run_id}
```

For transcript analysis:

```yaml
steps:
  - name: analyze
    run: agentics refine analyze --conversation "${inputs.conversation}"
```

For usage comparison:

```yaml
steps:
  - name: compare
    run: >-
      agentics refine benchmark --baseline ${inputs.baseline_usage} --candidate
      ${inputs.candidate_usage}
```

When an input points to a file, name the input as a path, such as `baseline_usage_path`, so the
workflow is clear to both humans and scripts.

## Validate Workflow Changes

Workflow YAML is not typechecked by TypeScript, so validate it through review and command execution.

Before committing:

```bash
npm run format:check
npm run lint
npm test
```

If the workflow calls GitHub Agentic Workflows commands, also run the compile command:

```bash
gh aw compile --workflow workflows/analysis/workflow-analysis.yaml
```

## Current Catalog Notes

`workflow-analysis.yaml` contains direct GitHub command steps for compile, execute, and artifact
download.

`workflow-refinement.yaml` demonstrates the Agentics analysis and artifact path commands.

`workflow-generation.yaml` is a scaffold example that currently calls `refine run`.

`workflow-evaluation.yaml` is a placeholder for benchmark automation. Replace its `echo` command
with `agentics refine benchmark` when baseline and candidate usage file paths are available.
