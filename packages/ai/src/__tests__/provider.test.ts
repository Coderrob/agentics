import { describe, expect, it } from 'vitest';
import { createProvider } from '../index.js';

describe('ai provider', () => {
  it('returns ollama provider analysis', () => {
    const provider = createProvider('ollama');
    const result = provider.analyzeConversation('Reasoning before call tool and invoke next tool call.');
    expect(result.redundantReasoningMentions).toBeGreaterThan(0);
    expect(result.toolCallMentions).toBeGreaterThan(0);
  });
});
