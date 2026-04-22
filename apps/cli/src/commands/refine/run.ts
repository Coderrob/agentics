import { Command } from 'commander';
import { createRefinementPlan } from '@agentics/agentics';

export function registerRunCommand(parent: Command): void {
  parent
    .command('run')
    .description('Compile and execute a workflow, then create a refinement plan')
    .requiredOption('-w, --workflow <path>', 'Workflow YAML path')
    .requiredOption('-r, --run-id <id>', 'Workflow run ID')
    .action((options: { workflow: string; runId: string }) => {
      const plan = createRefinementPlan(options.workflow, options.runId);
      process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    });
}
