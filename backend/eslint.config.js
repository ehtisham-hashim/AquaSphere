import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      // Possible Problems / Logical Bugs
      'no-undef': 'error',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],
      'no-constant-condition': 'error',
      'no-duplicate-imports': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unreachable-loop': 'error',
      'no-unsafe-optional-chaining': 'error',
      'no-useless-backreference': 'error',
      'no-promise-executor-return': 'error',
      'no-loss-of-precision': 'error',
      'no-constructor-return': 'error',
      'no-async-promise-executor': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'no-unreachable': 'error',
      'no-fallthrough': 'error',

      // Best Practices & Clean Code
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'smart'],
      'no-throw-literal': 'error',
      'no-useless-catch': 'error',
      'no-useless-return': 'error',
      'no-useless-rename': 'error',
      'no-shadow-restricted-names': 'error',
      'no-redeclare': 'error',
      'no-prototype-builtins': 'error',
      'no-caller': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-new-wrappers': 'error',
      'no-with': 'error',
      'radix': 'error',
      'no-console': 'off'
    }
  },
  {
    ignores: [
      'node_modules/',
      'uploads/',
      'prisma/migrations/'
    ]
  }
];
