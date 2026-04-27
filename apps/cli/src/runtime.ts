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

/** JSON indentation level for command output. */
const JSON_INDENT = 2;

/** Runtime boundary for command-line process and output interactions. */
export interface ICommandRuntime {
  readonly argv: readonly string[];
  writeStderr(output: string): void;
  writeStdout(output: string): void;
}

/** Node.js implementation of the command runtime boundary. */
class NodeCommandRuntime implements ICommandRuntime {
  /**
   * Returns command-line arguments from the current Node.js process.
   * @returns Command-line arguments.
   */
  get argv(): readonly string[] {
    /* v8 ignore next -- production process adapter; command behavior is tested with injected runtimes */
    return process.argv;
  }

  /**
   * Writes output to the current process standard output stream.
   * @param output - Text to write.
   */
  writeStdout(output: string): void {
    /* v8 ignore next -- production process adapter; command behavior is tested with injected runtimes */
    process.stdout.write(output);
  }

  /**
   * Writes output to the current process standard error stream.
   * @param output - Text to write.
   */
  writeStderr(output: string): void {
    /* v8 ignore next -- production process adapter; command behavior is tested with injected runtimes */
    process.stderr.write(output);
  }
}

/**
 * Creates a runtime adapter from explicit process arguments and output writer.
 * @param argv - Command-line arguments to expose to the CLI.
 * @param writeStderr - Function used to write standard error.
 * @param writeStdout - Function used to write standard output.
 * @returns A command runtime adapter.
 */
export function createCommandRuntime(
  argv: readonly string[],
  writeStdout: (output: string) => void,
  writeStderr: (output: string) => void = ignoreOutput,
): ICommandRuntime {
  return {
    argv,
    writeStderr,
    writeStdout,
  };
}

/**
 * Creates the default Node.js runtime adapter for production CLI execution.
 * @returns A command runtime backed by the current Node.js process.
 */
export function createNodeCommandRuntime(): ICommandRuntime {
  return new NodeCommandRuntime();
}

/**
 * Ignores output when no standard error writer is provided.
 * @param _output - Text intentionally ignored.
 */
function ignoreOutput(_output: string): void {
  // Intentionally empty.
}

/**
 * Writes a value as formatted JSON to standard output.
 * @param runtime - Runtime adapter used for writing output.
 * @param value - Value to serialize.
 */
export function writeJson(runtime: Readonly<ICommandRuntime>, value: unknown): void {
  runtime.writeStdout(`${JSON.stringify(value, null, JSON_INDENT)}\n`);
}
