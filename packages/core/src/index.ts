// Copyright 2026 Robert Lindley
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

import { isNumber, isObject } from '@coderrob/typescript-type-guards';

/** Constant for percentage calculation base. */
const PERCENTAGE_BASE = 100;

/** Fixed decimal places for percentage rounding. */
const DECIMAL_PLACES = 2;

/** Tracks token usage and execution timing for a single workflow run. */
export interface IUsageMetrics {
  readonly completionTokens: number;
  readonly executionMs: number;
  readonly promptTokens: number;
  readonly toolCalls: number;
}

/** Percentage improvements achieved after optimization. */
export interface IOptimizationGoals {
  readonly executionTimeReductionPct: number;
  readonly tokenReductionPct: number;
  readonly toolCallReductionPct: number;
}

/** Comparison report between a baseline and candidate run. */
export interface IBenchmarkReport {
  readonly baseline: IUsageMetrics;
  readonly candidate: IUsageMetrics;
  readonly improvements: IOptimizationGoals;
  readonly tokenDelta: number;
  readonly toolCallDelta: number;
}

/**
 * Compares two usage snapshots and returns a full benchmark report.
 * @param baseline - Metrics from the original workflow run.
 * @param candidate - Metrics from the optimized workflow run.
 * @returns A complete benchmark report with deltas and improvement percentages.
 */
export function benchmarkUsage(
  baseline: Readonly<IUsageMetrics>,
  candidate: Readonly<IUsageMetrics>,
): IBenchmarkReport {
  return {
    baseline,
    candidate,
    improvements: summarizeGoals(baseline, candidate),
    tokenDelta: totalTokens(baseline) - totalTokens(candidate),
    toolCallDelta: baseline.toolCalls - candidate.toolCalls,
  };
}

/**
 * Computes percentage reductions across tokens, tool calls, and execution time.
 * @param before - Baseline usage metrics.
 * @param after - Candidate usage metrics.
 * @returns Percentage improvement for each tracked dimension.
 */
export function summarizeGoals(before: Readonly<IUsageMetrics>, after: Readonly<IUsageMetrics>): IOptimizationGoals {
  /**
   * Computes the percentage reduction from a baseline value to a next value.
   * @param baseline - Original value.
   * @param next - New value.
   * @returns Reduction as a percentage (0–100).
   */
  const reduction = (baseline: number, next: number): number =>
    baseline === 0 ? 0 : Number((((baseline - next) / baseline) * PERCENTAGE_BASE).toFixed(DECIMAL_PLACES));

  return {
    executionTimeReductionPct: reduction(before.executionMs, after.executionMs),
    tokenReductionPct: reduction(totalTokens(before), totalTokens(after)),
    toolCallReductionPct: reduction(before.toolCalls, after.toolCalls),
  };
}

/**
 * Returns the total token count (prompt + completion) for a run.
 * @param metrics - Usage metrics for the run.
 * @returns Sum of prompt and completion tokens.
 */
export function totalTokens(metrics: Readonly<IUsageMetrics>): number {
  return metrics.promptTokens + metrics.completionTokens;
}

/**
 * Parses and validates an unknown value as {@link IUsageMetrics}.
 * @param data - Raw input to validate.
 * @returns A validated {@link IUsageMetrics} object.
 * @throws {Error} If the value is missing or has non-numeric fields.
 */
export function validateUsageMetrics(data: unknown): IUsageMetrics {
  const errorMessage =
    'Invalid usage metrics: expected numeric fields promptTokens, completionTokens, toolCalls, executionMs';

  if (!isObject(data)) {
    throw new Error(errorMessage);
  }

  const { promptTokens, completionTokens, toolCalls, executionMs } = data;

  if (!isNumber(promptTokens) || !isNumber(completionTokens) || !isNumber(toolCalls) || !isNumber(executionMs)) {
    throw new Error(errorMessage);
  }

  return { completionTokens, executionMs, promptTokens, toolCalls };
}
