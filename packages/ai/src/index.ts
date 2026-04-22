/** Ollama provider name constant. */
const OLLAMA_PROVIDER_NAME = 'ollama';

/** Maximum tool call mentions before recommending consolidation. */
const MAX_TOOL_CALL_MENTIONS = 3;

/** Findings from analyzing a workflow conversation transcript. */
export interface IConversationAnalysis {
  readonly recommendations: readonly string[];
  readonly redundantReasoningMentions: number;
  readonly toolCallMentions: number;
}

/** Contract for AI provider implementations. */
export interface IAIProvider {
  readonly name: string;
  analyzeConversation(content: string): IConversationAnalysis;
}

/**
 * Creates an AI provider instance for the given provider name.
 * Defaults to {@link OllamaProvider} when no argument is supplied.
 * @param provider - Provider name identifier (defaults to 'ollama').
 * @returns An {@link IAIProvider} instance for the requested provider.
 * @throws {Error} If the requested provider name is not supported.
 */
export function createProvider(provider = OLLAMA_PROVIDER_NAME): IAIProvider {
  if (provider === OLLAMA_PROVIDER_NAME) {
    return new OllamaProvider();
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

/** Ollama-backed AI provider that performs local conversation analysis. */
export class OllamaProvider implements IAIProvider {
  readonly name = OLLAMA_PROVIDER_NAME;

  /**
   * Analyzes a conversation transcript for redundant reasoning and excessive tool calls.
   * @param content - The conversation transcript text to analyze.
   * @returns Analysis findings including recommendations.
   */
  analyzeConversation(content: Readonly<string>): IConversationAnalysis {
    const redundantReasoningMentions = (content.match(/reason(ing)?/gi) ?? []).length;
    const toolCallMentions = (content.match(/tool call|call tool|invoke/gi) ?? []).length;

    const redundancyRecs =
      redundantReasoningMentions > 0
        ? ['Reduce repeated reasoning loops before direct execution.']
        : [];

    const toolCallRecs =
      toolCallMentions > MAX_TOOL_CALL_MENTIONS
        ? ['Consolidate tool usage where possible to minimize call count.']
        : [];

    const allRecs = [...redundancyRecs, ...toolCallRecs];
    const recommendations =
      allRecs.length > 0 ? allRecs : ['Workflow appears lean; benchmark to confirm performance goals.'];

    return { recommendations, redundantReasoningMentions, toolCallMentions };
  }
}
