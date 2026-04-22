export interface UsageMetrics {
  promptTokens: number;
  completionTokens: number;
  toolCalls: number;
  executionMs: number;
}

export interface OptimizationGoals {
  tokenReductionPct: number;
  toolCallReductionPct: number;
  executionTimeReductionPct: number;
}

export interface BenchmarkReport {
  baseline: UsageMetrics;
  candidate: UsageMetrics;
  improvements: OptimizationGoals;
  tokenDelta: number;
  toolCallDelta: number;
}

export function totalTokens(metrics: UsageMetrics): number {
  return metrics.promptTokens + metrics.completionTokens;
}

export function summarizeGoals(before: UsageMetrics, after: UsageMetrics): OptimizationGoals {
  const reduction = (baseline: number, next: number): number =>
    baseline === 0 ? 0 : Number((((baseline - next) / baseline) * 100).toFixed(2));

  return {
    tokenReductionPct: reduction(totalTokens(before), totalTokens(after)),
    toolCallReductionPct: reduction(before.toolCalls, after.toolCalls),
    executionTimeReductionPct: reduction(before.executionMs, after.executionMs)
  };
}

export function validateUsageMetrics(data: unknown): UsageMetrics {
  if (
    typeof data !== 'object' ||
    data === null ||
    typeof (data as Record<string, unknown>)['promptTokens'] !== 'number' ||
    typeof (data as Record<string, unknown>)['completionTokens'] !== 'number' ||
    typeof (data as Record<string, unknown>)['toolCalls'] !== 'number' ||
    typeof (data as Record<string, unknown>)['executionMs'] !== 'number'
  ) {
    throw new Error(
      'Invalid usage metrics: expected numeric fields promptTokens, completionTokens, toolCalls, executionMs'
    );
  }
  const d = data as Record<string, unknown>;
  return {
    promptTokens: d['promptTokens'] as number,
    completionTokens: d['completionTokens'] as number,
    toolCalls: d['toolCalls'] as number,
    executionMs: d['executionMs'] as number
  };
}

export function benchmarkUsage(baseline: UsageMetrics, candidate: UsageMetrics): BenchmarkReport {
  return {
    baseline,
    candidate,
    improvements: summarizeGoals(baseline, candidate),
    tokenDelta: totalTokens(baseline) - totalTokens(candidate),
    toolCallDelta: baseline.toolCalls - candidate.toolCalls
  };
}
