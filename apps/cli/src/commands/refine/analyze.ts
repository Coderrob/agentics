import { Command } from 'commander';
import { analyzeConversation } from '@agentics/agentics';

export function registerAnalyzeCommand(parent: Command): void {
  parent
    .command('analyze')
    .description('Analyze a conversation transcript for optimization opportunities')
    .requiredOption('-c, --conversation <text>', 'Conversation content to analyze')
    .action((options: { conversation: string }) => {
      const result = analyzeConversation(options.conversation);
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    });
}
