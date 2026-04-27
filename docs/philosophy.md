# Agentic Design Philosophy

Prioritize deterministic, direct tool execution over verbose deliberation loops to reduce token
usage, minimize tool calls, and improve predictability.

## Practical Rules

Use direct commands when the next action is known. A workflow step should not ask an agent to decide
whether to run a command that is already required.

Keep repeated instructions in workflow definitions instead of restating them in every prompt.

Prefer structured outputs over prose when another tool or script will consume the result.

Measure improvements with baseline and candidate runs. A prompt that feels shorter is not
necessarily cheaper or faster.

## What To Optimize

Optimize in this order:

1. Correctness: the workflow must still complete the required task.
2. Repeatability: the workflow should behave consistently across similar runs.
3. Tool count: remove avoidable tool calls and repeated inspections.
4. Token use: remove repeated planning, duplicated context, and unused instructions.
5. Execution time: reduce waiting, retries, and unnecessary serial steps.

## What Not To Optimize

Do not remove validation steps that catch real failures.

Do not combine unrelated shell actions into dense commands just to reduce visible step count.

Do not hide important assumptions inside prompts. Put stable assumptions in workflow inputs,
metadata, or documented defaults.

Do not treat lower token usage as success when the candidate skipped required work.

## Writing Better Workflow Steps

Weak step:

```yaml
- name: inspect
  run: agent should think about whether it needs to inspect the artifacts
```

Better step:

```yaml
- name: inspect-artifacts
  run: agentics refine extract --run-id ${inputs.run_id}
```

Weak step:

```yaml
- name: compare
  run: check if the new run is better
```

Better step:

```yaml
- name: compare
  run: >-
    agentics refine benchmark --baseline ${inputs.baseline_usage} --candidate
    ${inputs.candidate_usage}
```

## Refinement Decision Standard

A refinement is worth keeping when it is understandable, measurable, and reversible.

Document the reason for the change, the metric it targets, and the benchmark result that supports
it. If the result is mixed, keep the safer workflow unless there is a clear product reason to accept
the tradeoff.
