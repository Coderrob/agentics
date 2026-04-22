import { describe, expect, it } from 'vitest';
import { benchmarkUsage, summarizeGoals, totalTokens, validateUsageMetrics } from '../index.js';

const BASELINE_PROMPT = 100;
const BASELINE_COMPLETION = 100;
const BASELINE_TOOLS = 10;
const BASELINE_MS = 1000;

const CANDIDATE_PROMPT = 75;
const CANDIDATE_COMPLETION = 75;
const CANDIDATE_TOOLS = 8;
const CANDIDATE_MS = 800;

const BENCH_BASELINE_PROMPT = 200;
const BENCH_BASELINE_COMPLETION = 100;
const BENCH_BASELINE_TOOLS = 10;
const BENCH_BASELINE_MS = 2000;

const BENCH_CANDIDATE_PROMPT = 150;
const BENCH_CANDIDATE_COMPLETION = 80;
const BENCH_CANDIDATE_TOOLS = 7;
const BENCH_CANDIDATE_MS = 1500;

const SAMPLE_PROMPT = 50;
const SAMPLE_COMPLETION = 30;
const SAMPLE_TOOLS = 5;
const SAMPLE_MS = 900;

const TOTAL_PROMPT = 10;
const TOTAL_COMPLETION = 15;
const TOTAL_TOOLS = 2;
const TOTAL_MS = 100;
const EXPECTED_TOTAL = 25;

const TOKEN_REDUCTION_25 = 25;
const REDUCTION_20 = 20;
const TOKEN_DELTA_70 = 70;
const TOOL_DELTA_3 = 3;
const TOOL_REDUCTION_30 = 30;

describe('core metrics', () => {
  it('should compute token totals correctly', () => {
    expect(
      totalTokens({ completionTokens: TOTAL_COMPLETION, executionMs: TOTAL_MS, promptTokens: TOTAL_PROMPT, toolCalls: TOTAL_TOOLS })
    ).toBe(EXPECTED_TOTAL);
  });

  it('should compute percentage reductions', () => {
    const summary = summarizeGoals(
      { completionTokens: BASELINE_COMPLETION, executionMs: BASELINE_MS, promptTokens: BASELINE_PROMPT, toolCalls: BASELINE_TOOLS },
      { completionTokens: CANDIDATE_COMPLETION, executionMs: CANDIDATE_MS, promptTokens: CANDIDATE_PROMPT, toolCalls: CANDIDATE_TOOLS }
    );
    expect(summary.tokenReductionPct).toBe(TOKEN_REDUCTION_25);
    expect(summary.toolCallReductionPct).toBe(REDUCTION_20);
    expect(summary.executionTimeReductionPct).toBe(REDUCTION_20);
  });

  it('should produce benchmark deltas and improvements', () => {
    const baseline = { completionTokens: BENCH_BASELINE_COMPLETION, executionMs: BENCH_BASELINE_MS, promptTokens: BENCH_BASELINE_PROMPT, toolCalls: BENCH_BASELINE_TOOLS };
    const candidate = { completionTokens: BENCH_CANDIDATE_COMPLETION, executionMs: BENCH_CANDIDATE_MS, promptTokens: BENCH_CANDIDATE_PROMPT, toolCalls: BENCH_CANDIDATE_TOOLS };
    const report = benchmarkUsage(baseline, candidate);
    expect(report.baseline).toEqual(baseline);
    expect(report.candidate).toEqual(candidate);
    expect(report.tokenDelta).toBe(TOKEN_DELTA_70);
    expect(report.toolCallDelta).toBe(TOOL_DELTA_3);
    expect(report.improvements.toolCallReductionPct).toBe(TOOL_REDUCTION_30);
    expect(report.improvements.tokenReductionPct).toBeGreaterThan(0);
  });

  it('should accept valid usage metrics input', () => {
    const raw = { completionTokens: SAMPLE_COMPLETION, executionMs: SAMPLE_MS, promptTokens: SAMPLE_PROMPT, toolCalls: SAMPLE_TOOLS };
    expect(validateUsageMetrics(raw)).toEqual(raw);
  });

  it('should reject invalid usage metrics input', () => {
    expect(() => validateUsageMetrics(null)).toThrow('Invalid usage metrics');
    expect(() =>
      validateUsageMetrics({ completionTokens: 0, executionMs: 0, promptTokens: 'x', toolCalls: 0 })
    ).toThrow('Invalid usage metrics');
    expect(() => validateUsageMetrics({})).toThrow('Invalid usage metrics');
  });
});

describe('summarizeGoals edge cases', () => {
  it('should return zero reduction when baseline is zero', () => {
    const zero = { completionTokens: 0, executionMs: 0, promptTokens: 0, toolCalls: 0 };
    const candidate = { completionTokens: 0, executionMs: 0, promptTokens: 0, toolCalls: 0 };
    const result = summarizeGoals(zero, candidate);
    expect(result.tokenReductionPct).toBe(0);
    expect(result.toolCallReductionPct).toBe(0);
    expect(result.executionTimeReductionPct).toBe(0);
  });
});
