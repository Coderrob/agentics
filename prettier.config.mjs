/** @type {import('prettier').Config} */
const config = {
  printWidth: 120,
  singleQuote: true,
  semi: true,
  tabWidth: 2,
  trailingComma: 'all',
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  overrides: [
    {
      files: ['*.json', '*.jsonc'],
      options: {
        printWidth: 80,
      },
    },
    {
      files: ['*.yml', '*.yaml'],
      options: {
        singleQuote: false,
      },
    },
    {
      files: ['*.md'],
      options: {
        printWidth: 100,
        proseWrap: 'always',
      },
    },
  ],
};

export default config;
