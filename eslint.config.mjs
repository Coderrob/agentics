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

import zeroTolerance from '@coderrob/eslint-plugin-zero-tolerance';
import tsParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/.turbo/**', 'site/**', 'tendril/**'],
  },
  {
    ...zeroTolerance.configs.strict,
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.base.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...zeroTolerance.configs.strict.rules,
      'zero-tolerance/prefer-result-return': 'off',
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      'zero-tolerance/max-function-lines': 'off',
      'zero-tolerance/no-magic-numbers': 'off',
      'zero-tolerance/no-magic-strings': 'off',
      'zero-tolerance/prefer-result-return': 'off',
      'zero-tolerance/require-jsdoc-anonymous-functions': 'off',
      'zero-tolerance/require-jsdoc-functions': 'off',
    },
  },
  eslintConfigPrettier,
];
