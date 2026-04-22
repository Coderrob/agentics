import { analyzeConversation } from '@agentics/agentics';
import { Command } from 'commander';

/** JSON indentation level for command output. */
const JSON_INDENT = 2;

/** Runs the analyze action for the refine analyze command. */
function handleAnalyze(options: Readonly<{ conversation: string }>): void {
  const result = analyzeConversation(options.conversation);
  process.stdout.write(`${JSON.stringify(result, null, JSON_INDENT)}\n`);
}

/** Registers the `refine analyze` subcommand on the given parent command. */
export function registerAnalyzeCommand(parent: Readonly<Command>): void {
  parent
    .command('analyze')
    .description('Analyze a conversation transcript for optimization opportunities')
    .requiredOption('-c, --conversation <text>', 'Conversation content to analyze')
    .action(handleAnalyze);
}
