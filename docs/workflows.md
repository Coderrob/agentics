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

GitHub Agentic Workflows are installed in a repository under `.github/workflows/*.md`. The
`workflows/` directory in this repository is a distribution source for reusable workflow templates,
not the final installed location.

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

Compile reusable markdown sources when you need a local syntax/security check:

```bash
npm run workflows:compile
```

The compile command scans `workflows/` for `.md` files. It does not compile this repository's normal
GitHub Actions YAML files.

Generated `/workflows/*.lock.yml` files are ignored in this source repository because reusable
templates are not installed here. When a template is copied into another repository as
`.github/workflows/<name>.md`, run `gh aw compile` in that target repository and commit both the
installed `.md` source and the generated `.lock.yml` file there.

## Install A Reusable Workflow

To install `workflows/workflow-factory.md` in another repository:

```bash
mkdir -p .github/workflows
cp workflows/workflow-factory.md .github/workflows/workflow-factory.md
gh aw compile --workflow .github/workflows/workflow-factory.md
git add .github/workflows/workflow-factory.md
git add .github/workflows/workflow-factory.lock.yml
```

After installation, configure any required secrets or engine settings for the target repository.
