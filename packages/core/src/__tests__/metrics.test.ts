import { describe, expect, it } from 'vitest';
import { summarizeGoals, totalTokens } from '../index.js';

describe('core metrics', () => {
  it('computes token totals and reductions', () => {
    expect(totalTokens({ promptTokens: 10, completionTokens: 15, toolCalls: 2, executionMs: 100 })).toBe(25);

    const summary = summarizeGoals(
      { promptTokens: 100, completionTokens: 100, toolCalls: 10, executionMs: 1000 },
      { promptTokens: 75, completionTokens: 75, toolCalls: 8, executionMs: 800 }
    );

    expect(summary).toEqual({
      tokenReductionPct: 25,
      toolCallReductionPct: 20,
      executionTimeReductionPct: 20
    });
  });
});
