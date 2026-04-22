import { createRefinementPlan } from '@agentics/agentics';
import { Command } from 'commander';

/** JSON indentation level for command output. */
const JSON_INDENT = 2;

/**
 * Runs the run action for the refine run command.
 * @param options - Parsed command options containing the workflow path and run ID.
 */
function handleRun(options: Readonly<{ runId: string; workflow: string }>): void {
  const plan = createRefinementPlan(options.workflow, options.runId);
  process.stdout.write(`${JSON.stringify(plan, null, JSON_INDENT)}\n`);
}

/**
 * Registers the `refine run` subcommand on the given parent command.
 * @param parent - The Commander.js parent command to attach to.
 */
export function registerRunCommand(parent: Readonly<Command>): void {
  parent
    .command('run')
    .description('Compile and execute a workflow, then create a refinement plan')
    .requiredOption('-w, --workflow <path>', 'Workflow YAML path')
    .requiredOption('-r, --run-id <id>', 'Workflow run ID')
    .action(handleRun);
}
