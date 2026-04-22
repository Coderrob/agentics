import zeroTolerance from '@coderrob/eslint-plugin-zero-tolerance';
import tsParser from '@typescript-eslint/parser';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      '**/*.config.{ts,js,mjs}',
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.turbo/**',
      'refinements/**'
    ]
  },
  {
    ...zeroTolerance.configs.strict,
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.base.json',
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      'zero-tolerance/max-function-lines': 'off',
      'zero-tolerance/no-magic-numbers': 'off',
      'zero-tolerance/no-magic-strings': 'off',
      'zero-tolerance/prefer-result-return': 'off',
      'zero-tolerance/require-jsdoc-anonymous-functions': 'off',
      'zero-tolerance/require-jsdoc-functions': 'off'
    }
  }
];
