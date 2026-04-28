# Workflow Sources

This repository uses two different workflow formats. Keep them separate.

## GitHub Actions

Use normal `.github/workflows/*.yml` files for deterministic automation that does not need an agent
to interpret context or make judgment calls. These workflows are for this repository.

Examples:

- `.github/workflows/ci.yml`
- `.github/workflows/context-cache.yml`
- `.github/workflows/context-cache-effectiveness.yml`
- `.github/workflows/validate-workflows.yml`

Good fits for GitHub Actions:

- linting, testing, typechecking, coverage, and static validation
- running deterministic Agentics CLI commands
- validating or benchmarking existing files
- uploading reports as artifacts

## GitHub Agentic Workflows

Use `workflows/*.md` files for reusable GitHub Agentic Workflows that are meant to be installed in
other repositories. A GitHub Agentic Workflow is markdown with frontmatter and natural-language
instructions. It is compiled by `gh aw compile` into a hardened GitHub Actions lock file.

Example:

- `workflows/workflow-factory.md`

Good fits for GitHub Agentic Workflows:

- interpreting natural-language issue requests
- deciding whether a requested workflow should be Actions YAML or GH-AW markdown
- generating reviewable workflow proposals
- choosing safe outputs based on repository context

## Authoring Rule

Before creating a workflow, ask whether the behavior requires reasoning.

If it does not, write a normal GitHub Actions `.yml` workflow.

If it does and it is meant for other repositories, write a GitHub Agentic Workflow `.md` source
under `workflows/` with:

- frontmatter triggers
- least-privilege permissions
- safe outputs for write operations
- concise natural-language instructions
- explicit review requirements for generated files

## Compile Agentic Workflows

Compile markdown agentic workflow sources only:

```bash
npm run workflows:compile
```

The compile command scans `workflows/` for `.md` files. It does not compile this repository's normal
GitHub Actions YAML files.
