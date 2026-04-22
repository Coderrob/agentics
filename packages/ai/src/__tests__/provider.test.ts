// Copyright 2024 Robert Lindley
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { describe, expect, it } from 'vitest';
import { OllamaProvider, createProvider } from '../index.js';

describe('createProvider', () => {
  it('should return an OllamaProvider for the default provider', () => {
    const provider = createProvider();
    expect(provider).toBeInstanceOf(OllamaProvider);
  });

  it('should return an OllamaProvider when provider is ollama', () => {
    const provider = createProvider('ollama');
    expect(provider.name).toBe('ollama');
  });

  it('should throw for an unsupported provider name', () => {
    expect(() => createProvider('unknown-provider')).toThrow('Unsupported provider');
  });
});

describe('OllamaProvider.analyzeConversation', () => {
  it('should detect reasoning and return a redundancy recommendation', () => {
    const provider = new OllamaProvider();
    const result = provider.analyzeConversation('The agent was reasoning about the problem.');
    expect(result.redundantReasoningMentions).toBeGreaterThan(0);
    expect(result.recommendations).toContain('Reduce repeated reasoning loops before direct execution.');
  });

  it('should detect excessive tool calls and return a consolidation recommendation', () => {
    const provider = new OllamaProvider();
    const result = provider.analyzeConversation('invoke tool, invoke tool, invoke tool, invoke tool');
    expect(result.toolCallMentions).toBeGreaterThan(3);
    expect(result.recommendations).toContain('Consolidate tool usage where possible to minimize call count.');
  });

  it('should return lean recommendation when no issues are detected', () => {
    const provider = new OllamaProvider();
    const result = provider.analyzeConversation('Clean workflow with no redundancy.');
    expect(result.redundantReasoningMentions).toBe(0);
    expect(result.recommendations).toContain('Workflow appears lean; benchmark to confirm performance goals.');
  });

  it('should return ollama provider analysis via createProvider', () => {
    const provider = createProvider('ollama');
    const result = provider.analyzeConversation('Reasoning before call tool and invoke next tool call.');
    expect(result.redundantReasoningMentions).toBeGreaterThan(0);
    expect(result.toolCallMentions).toBeGreaterThan(0);
  });
});
