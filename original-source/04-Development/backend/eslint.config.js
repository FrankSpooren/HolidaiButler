/**
 * ESLint 9 Flat Configuration (CommonJS)
 * Enterprise-level code quality standards for HolidAIbutler Backend
 */

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  // Base recommended rules
  js.configs.recommended,

  // Global configuration
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021,
        ...globals.jest
      }
    },

    rules: {
      // Error Prevention
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',

      // Code Quality
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-duplicate-imports': 'error',

      // Best Practices
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-return-await': 'error',
      'require-await': 'warn',

      // Security
      'no-new-func': 'error',
      'no-script-url': 'error',

      // Node.js Best Practices
      'no-process-exit': 'warn',
      'handle-callback-err': 'error',

      // Code Style (Airbnb-inspired)
      'indent': ['error', 2, { SwitchCase: 1 }],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'max-len': ['warn', {
        code: 120,
        ignoreComments: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true
      }],

      // Arrow Functions
      'arrow-parens': ['error', 'as-needed'],
      'arrow-spacing': 'error',
      'prefer-arrow-callback': 'warn',

      // Async/Await
      'no-async-promise-executor': 'error',
      'prefer-promise-reject-errors': 'error'
    }
  },

  // Ignore patterns (replaces .eslintignore)
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'build/**',
      'logs/**',
      '*.config.js',
      'scripts/**'
    ]
  }
];
