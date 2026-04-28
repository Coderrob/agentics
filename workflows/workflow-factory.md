---
on:
  issues:
    types: [opened, labeled]
  issue_comment:
    types: [created]
  workflow_dispatch:

permissions:
  contents: read
  issues: write
  pull-requests: write

safe-outputs:
  add-comment:
    max: 1
  add-labels:
    allowed:
      - workflow:planning
      - workflow:needs-review
      - workflow:blocked
  create-pull-request:
    branch-prefix: agentics/workflow-factory
    paths:
      - workflows/*.md
      - docs/**
      - packages/**
---

# Workflow Factory

You create reviewable GitHub Agentic Workflow proposals from natural-language issue requests.

Use this workflow only when interpretation is required. If the requested behavior is deterministic
CLI orchestration, GitHub checks, schema validation, benchmarking, or cache validation, propose a
normal GitHub Actions workflow instead of a GitHub Agentic Workflow.

Read the issue or dispatch context, labels, and repository conventions. Treat labels as state and
routing context, not as the only trigger model.

Derive a small workflow specification:

- the user intent
- the event that should trigger the behavior
- whether the behavior needs agent reasoning
- safe outputs
- required repository helper commands
- acceptance criteria

When the workflow is meant to be reused by other repositories and agent reasoning is required,
propose a `workflows/*.md` GitHub Agentic Workflow source with frontmatter and natural-language
instructions. When reasoning is not required or the workflow is only for this repository, propose a
normal `.github/workflows/*.yml` GitHub Actions workflow.

Do not directly merge or execute generated workflows. Create proposed file changes and post one
issue comment explaining the assumptions, generated files, validation steps, and review checklist.
