export interface ConversationAnalysis {
  redundantReasoningMentions: number;
  toolCallMentions: number;
  recommendations: string[];
}

export interface AIProvider {
  name: string;
  analyzeConversation(content: string): ConversationAnalysis;
}

export class OllamaProvider implements AIProvider {
  name = 'ollama';

  analyzeConversation(content: string): ConversationAnalysis {
    const redundantReasoningMentions = (content.match(/reason(ing)?/gi) ?? []).length;
    const toolCallMentions = (content.match(/tool call|call tool|invoke/gi) ?? []).length;

    const recommendations: string[] = [];
    if (redundantReasoningMentions > 0) {
      recommendations.push('Reduce repeated reasoning loops before direct execution.');
    }
    if (toolCallMentions > 3) {
      recommendations.push('Consolidate tool usage where possible to minimize call count.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Workflow appears lean; benchmark to confirm performance goals.');
    }

    return {
      redundantReasoningMentions,
      toolCallMentions,
      recommendations
    };
  }
}

export function createProvider(provider = 'ollama'): AIProvider {
  if (provider === 'ollama') {
    return new OllamaProvider();
  }

  throw new Error(`Unsupported provider: ${provider}`);
}
