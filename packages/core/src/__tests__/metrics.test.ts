import { describe, expect, it } from 'vitest';
import { benchmarkUsage, summarizeGoals, totalTokens, validateUsageMetrics } from '../index.js';

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

  it('benchmarkUsage produces deltas and improvements', () => {
    const baseline = { promptTokens: 200, completionTokens: 100, toolCalls: 10, executionMs: 2000 };
    const candidate = { promptTokens: 150, completionTokens: 80, toolCalls: 7, executionMs: 1500 };

    const report = benchmarkUsage(baseline, candidate);

    expect(report.baseline).toEqual(baseline);
    expect(report.candidate).toEqual(candidate);
    expect(report.tokenDelta).toBe(70);
    expect(report.toolCallDelta).toBe(3);
    expect(report.improvements.tokenReductionPct).toBeGreaterThan(0);
    expect(report.improvements.toolCallReductionPct).toBe(30);
  });

  it('validateUsageMetrics accepts valid input', () => {
    const raw = { promptTokens: 50, completionTokens: 30, toolCalls: 5, executionMs: 900 };
    expect(validateUsageMetrics(raw)).toEqual(raw);
  });

  it('validateUsageMetrics rejects invalid input', () => {
    expect(() => validateUsageMetrics(null)).toThrow('Invalid usage metrics');
    expect(() => validateUsageMetrics({ promptTokens: 'x', completionTokens: 0, toolCalls: 0, executionMs: 0 })).toThrow(
      'Invalid usage metrics'
    );
    expect(() => validateUsageMetrics({})).toThrow('Invalid usage metrics');
  });
});
