# Portable Context Cache Workflow

The portable context cache workflow gives AI agents a verified orientation layer before they start
editing a repository. Its current implementation is deterministic, so it runs as a normal GitHub
Actions workflow rather than a GitHub Agentic Workflow.

The workflow maintains two cache layers in the target repository:

- Recursive summaries: tree-shaped summaries for broad orientation.
- Git-pinned claims: short facts pinned to Git blob OIDs so stale claims can be detected.

## Install The Workflow

For this repository, the deterministic workflow lives at `.github/workflows/context-cache.yml`.

For another repository, copy that workflow into the target repository's `.github/workflows/`
directory and make sure the target repository can install and run the Agentics CLI. No
`gh aw compile` step is needed because this workflow is normal GitHub Actions YAML, not GH-AW
markdown.

## Trigger Behavior

The workflow is event-driven. Labels are state, routing, and optional manual commands; they are not
the only trigger mechanism.

Use pull request events to validate claims against changed files and refresh affected summaries.

Use pushes to the default branch to refresh cache state after accepted changes.

Use scheduled runs for repo-wide cache health checks.

Use workflow dispatch for manual full, summaries-only, claims-only, or validation-only maintenance.

Use label commands such as `context-cache:refresh` when a maintainer wants an IssueOps or PROps
manual refresh.

## Label State Snapshot

The workflow reads labels before acting:

- Type: `type:feature`, `type:bug`, `type:docs`, `type:maintenance`
- Priority: `priority:p0`, `priority:p1`, `priority:p2`, `priority:p3`
- State: `state:needs-context`, `state:context-ready`, `state:context-stale`, `state:blocked`
- Workflow: `context-cache:refresh`, `context-cache:claims`, `context-cache:summaries`,
  `context-cache:validated`

Labels influence scope, urgency, and output tone. Git state and event payloads remain authoritative
for changed paths and claim freshness.

## Cache Layout

Target repositories store cache artifacts under `.agentics/context/`:

```text
.agentics/context/
  claims/
    index.json
  summaries/
    index.json
  validation.json
```

All generated artifacts are reviewable proposed file changes. The workflow should not directly
commit cache updates unless a target repository explicitly adds that policy later.

## Local Dry Run

Run the portable helper commands against any checked-out repository:

```bash
agentics context build --repo-root /path/to/repo
agentics context validate --repo-root /path/to/repo
agentics context summarize --repo-root /path/to/repo
agentics context claims refresh --repo-root /path/to/repo
```

Each command prints JSON with proposed artifacts, live claims, stale claims, summaries, label state,
and validation errors.

Use `.github/workflows/context-cache.yml` when you want this creation path represented as
deterministic repository automation. It runs `agentics context build` to create recursive summaries,
git-pinned claims, and validation artifacts, then validates the same target repository.

## Claim Freshness

Each claim contains evidence paths and blob OIDs. The helper computes an evidence OID from sorted
`(path, blobOid)` pairs.

When an evidence file changes, Git produces a new blob OID. Validation then marks the claim stale.
Stale claims are reported but must not be injected into agent-facing context.

## Measure Effectiveness

Use the existing refinement loop to test whether the context cache helps a target repository.

Run the same agentic task twice:

1. Baseline: run the task cold, without injecting context cache summaries or live claims.
2. Candidate: run the task with root-to-target recursive summaries and live git-pinned claims loaded
   before exploration.

Save each run's `usage.json`, then compare the two runs:

```bash
agentics refine benchmark \
  --baseline refinements/context-cache-baseline/usage.json \
  --candidate refinements/context-cache-candidate/usage.json
```

Use `.github/workflows/context-cache-effectiveness.yml` when you want the comparison captured as a
normal GitHub Actions workflow. It validates the current cache and benchmarks cold versus cached
usage.

Tune the cache only when the benchmark and transcript review agree. A useful cache should reduce
tokens, tool calls, or wall time without hiding required repository inspection. If stale claims
appear, refresh or remove them before running another candidate.
