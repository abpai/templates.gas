import eslintPluginTs from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import eslintPluginGAS from 'eslint-plugin-googleappsscript'
import eslintPluginPrettier from 'eslint-plugin-prettier'
import globals from 'globals'

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: false },
      },
      globals: {
        ...globals.es2021,
        ...eslintPluginGAS.environments.googleappsscript.globals,
      },
    },
    plugins: {
      gas: eslintPluginGAS,
      prettier: eslintPluginPrettier,
      '@typescript-eslint': eslintPluginTs,
    },
    rules: {
      // style
      'prettier/prettier': 'error',
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'never'],
      indent: ['error', 2],
      'func-style': ['error', 'expression'],
      // ts-specific (enable via eslint-plugin)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
]
