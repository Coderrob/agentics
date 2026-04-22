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
