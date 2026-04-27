# Refinement Process

Refinement is the process of turning a workflow run into concrete changes that reduce wasted tokens,
unnecessary tool calls, and execution time while preserving successful outcomes.

## Inputs You Need

Start with these three things:

- A workflow YAML file, such as `workflows/analysis/workflow-analysis.yaml`.
- A run ID from the system that executed the workflow.
- Artifacts for the run: `prompt.txt`, `conversation.txt`, and `usage.json`.

The expected artifact layout is:

```text
refinements/
  123/
    prompt.txt
    conversation.txt
    usage.json
```

## Step 1: Create A Run Plan

Generate the plan for the workflow and run ID.

```bash
npm run cli -- refine run --workflow workflows/analysis/workflow-analysis.yaml --run-id 123
```

Use the JSON output as the checklist for the run. It includes the GitHub commands and the artifact
paths expected by Agentics.

## Step 2: Compile And Run The Workflow

If you are using GitHub Agentic Workflows tooling, run the emitted commands manually or from CI.

```bash
gh aw compile --workflow workflows/analysis/workflow-analysis.yaml
gh aw run --workflow workflows/analysis/workflow-analysis.yaml
```

Capture the resulting run ID. If the run ID changes after execution, regenerate the Agentics plan
with the final run ID.

## Step 3: Download Artifacts

Download artifacts into the run directory.

```bash
gh run download 123 -D refinements/123
```

Confirm that the directory contains:

```text
prompt.txt
conversation.txt
usage.json
```

If your artifact names differ, normalize them before running the benchmark or downstream scripts.

## Step 4: Analyze The Conversation

Analyze a transcript directly:

```bash
npm run cli -- refine analyze --conversation "Reasoning about tools before invoking a tool call."
```

For file-based workflows, pass the file content through your shell or automation. On PowerShell:

```powershell
$conversation = Get-Content refinements/123/conversation.txt -Raw
npm run cli -- refine analyze --conversation $conversation
```

Use the output to identify repeated reasoning patterns, unnecessary setup language, and tool
invocation loops.

## Step 5: Create A Candidate Workflow

Make a focused change to the workflow or prompt. Prefer one change per candidate run so the
benchmark result is attributable.

Good candidate changes:

- Move repeated instructions into the workflow definition.
- Replace ambiguous tool instructions with direct commands.
- Remove repeated planning language when the next action is deterministic.
- Combine adjacent artifact inspection steps when they read the same run output.

Avoid broad edits that change both task scope and execution style at the same time. They are hard to
evaluate.

## Step 6: Benchmark Baseline Against Candidate

After running the candidate workflow, compare usage files.

```bash
npm run cli -- refine benchmark \
  --baseline refinements/123/usage.json \
  --candidate refinements/124/usage.json
```

Read the report in this order:

1. `tokenDelta`: positive values mean the candidate used fewer total tokens.
2. `toolCallDelta`: positive values mean the candidate made fewer tool calls.
3. `improvements.executionTimeReductionPct`: positive values mean the candidate ran faster.
4. Raw baseline and candidate fields: use these to sanity-check outliers.

## Step 7: Decide Whether To Keep The Change

Keep a candidate when it improves at least one target metric without reducing task success.

Reject or revise a candidate when:

- It reduces tokens but skips required work.
- It reduces tool calls by batching unrelated actions into fragile commands.
- It improves one run but relies on run-specific paths, IDs, or artifact names.
- It makes future workflow failures harder to diagnose.

## Usage Metrics Schema

`usage.json` must use this shape:

```json
{
  "completionTokens": 100,
  "executionMs": 2000,
  "promptTokens": 200,
  "toolCalls": 10
}
```

All fields are required and must be numbers.

## Refinement Checklist

- The baseline run artifacts are preserved.
- The candidate run artifacts are preserved.
- The candidate changes are narrow enough to explain.
- `refine analyze` findings are addressed or explicitly rejected.
- `refine benchmark` shows the expected metric direction.
- Repository gates pass after implementation changes.
