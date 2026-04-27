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

import { readFileSync } from 'node:fs';
import type { IBenchmarkReport, IUsageMetrics } from '@agentics/core';
import { benchmarkUsage, validateUsageMetrics } from '@agentics/core';
import { Command } from 'commander';
import type { ICommandRuntime } from '../../runtime.js';
import { writeJson } from '../../runtime.js';

/** File encoding used when reading usage.json files. */
const FILE_ENCODING = 'utf8';

/**
 * Creates the Commander action for the benchmark command.
 * @param runtime - Runtime adapter used for writing command output.
 * @returns A configured Commander action handler.
 */
function createBenchmarkAction(
  runtime: Readonly<ICommandRuntime>,
): (options: Readonly<{ baseline: string; candidate: string }>) => void {
  /**
   * Executes the benchmark command action.
   * @param options - Parsed command options containing baseline and candidate file paths.
   */
  function benchmarkAction(options: Readonly<{ baseline: string; candidate: string }>): void {
    handleBenchmark(options, runtime);
  }

  return benchmarkAction;
}

/**
 * Runs the benchmark action comparing a baseline and candidate usage file.
 * @param options - Parsed command options containing baseline and candidate file paths.
 * @param runtime - Runtime adapter used for writing command output.
 */
function handleBenchmark(
  options: Readonly<{ baseline: string; candidate: string }>,
  runtime: Readonly<ICommandRuntime>,
): void {
  const baseline = readUsageFile(options.baseline);
  const candidate = readUsageFile(options.candidate);
  const report: IBenchmarkReport = benchmarkUsage(baseline, candidate);
  writeJson(runtime, report);
}

/**
 * Reads and parses a usage.json file into a validated metrics object.
 * @param filePath - Absolute or relative path to the usage.json file.
 * @returns Validated usage metrics parsed from the file.
 */
function readUsageFile(filePath: string): IUsageMetrics {
  const raw: unknown = JSON.parse(readFileSync(filePath, FILE_ENCODING));
  return validateUsageMetrics(raw);
}

/**
 * Registers the `refine benchmark` subcommand on the given parent command.
 * @param parent - The Commander.js parent command to attach to.
 * @param runtime - Runtime adapter used for command output.
 */
export function registerBenchmarkCommand(parent: Readonly<Command>, runtime: Readonly<ICommandRuntime>): void {
  parent
    .command('benchmark')
    .description('Compare two usage.json files and report optimization improvements')
    .requiredOption('-b, --baseline <path>', 'Path to the baseline usage.json file')
    .requiredOption('-c, --candidate <path>', 'Path to the candidate usage.json file')
    .action(createBenchmarkAction(runtime));
}
