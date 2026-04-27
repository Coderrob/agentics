# CLI Usage

The Agentics CLI is a Commander.js application focused on refinement support commands. It produces
machine-readable JSON so the output can be piped into scripts, CI jobs, or workflow automation.

Run commands from the repository root.

```bash
npm run cli -- refine run --workflow workflows/analysis/workflow-analysis.yaml --run-id 123
npm run cli -- refine analyze --conversation "Agent reasoning about tools"
npm run cli -- refine extract --run-id 123
```

## Command Group

All current commands are under `refine`.

```bash
npm run cli -- refine --help
```

## Generate A Refinement Plan

Use `refine run` when you know the workflow file and run ID and want a structured plan for the
refinement lifecycle.

```bash
npm run cli -- refine run --workflow workflows/analysis/workflow-analysis.yaml --run-id 123
```

Output shape:

```json
{
  "artifactPaths": {
    "baseDir": "refinements/123",
    "conversation": "refinements/123/conversation.txt",
    "prompt": "refinements/123/prompt.txt",
    "usage": "refinements/123/usage.json"
  },
  "commands": {
    "compile": "gh aw compile --workflow workflows/analysis/workflow-analysis.yaml",
    "downloadArtifacts": "gh run download 123 -D refinements/123",
    "run": "gh aw run --workflow workflows/analysis/workflow-analysis.yaml"
  },
  "runId": "123",
  "workflowPath": "workflows/analysis/workflow-analysis.yaml"
}
```

Current behavior: this command prints the plan only. It does not call `gh aw compile`, `gh aw run`,
or `gh run download`.

## Find Artifact Paths

Use `refine extract` to calculate where a run's refinement artifacts should live.

```bash
npm run cli -- refine extract --run-id 123
```

Use a custom output directory when your automation stores run artifacts somewhere else.

```bash
npm run cli -- refine extract --run-id 123 --dir tmp/refinements
```

Expected output:

```json
{
  "baseDir": "tmp/refinements/123",
  "conversation": "tmp/refinements/123/conversation.txt",
  "prompt": "tmp/refinements/123/prompt.txt",
  "usage": "tmp/refinements/123/usage.json"
}
```

## Analyze A Conversation

Use `refine analyze` to inspect conversation text for optimization signals.

```bash
npm run cli -- refine analyze --conversation "Reasoning about tool call setup. Invoke the tool."
```

Expected output:

```json
{
  "recommendations": ["Reduce repeated reasoning loops before direct execution."],
  "redundantReasoningMentions": 1,
  "toolCallMentions": 1
}
```

The analyzer is deterministic. It currently looks for repeated reasoning language and tool-call
language; it does not call an external model.

## Benchmark Two Runs

Use `refine benchmark` to compare a baseline run against a candidate run.

```bash
npm run cli -- refine benchmark \
  --baseline refinements/baseline/usage.json \
  --candidate refinements/candidate/usage.json
```

Each usage file must contain numeric fields:

```json
{
  "completionTokens": 100,
  "executionMs": 2000,
  "promptTokens": 200,
  "toolCalls": 10
}
```

The benchmark report includes raw metrics, deltas, and percentage reductions.

```json
{
  "baseline": {
    "completionTokens": 100,
    "executionMs": 2000,
    "promptTokens": 200,
    "toolCalls": 10
  },
  "candidate": {
    "completionTokens": 80,
    "executionMs": 1500,
    "promptTokens": 150,
    "toolCalls": 7
  },
  "improvements": {
    "executionTimeReductionPct": 25,
    "tokenReductionPct": 23.33,
    "toolCallReductionPct": 30
  },
  "tokenDelta": 70,
  "toolCallDelta": 3
}
```

## Common Failures

Invalid JSON in a usage file causes the command to fail before validation. Fix the file so it is
valid JSON, then rerun the command.

Missing or non-numeric usage fields cause an `Invalid usage metrics` error. Ensure all four required
fields are numbers.

If `npm run cli` cannot find workspace packages, run `npm install` from the repository root.
