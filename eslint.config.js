import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Reglas de frontera (sección 4.1 del plan maestro):
 *  1. Solo infrastructure/firebase importa `firebase/*`.
 *  2. Solo infrastructure/api hace HTTP (`fetch`).
 *  3. core/ no importa infrastructure, features, app, shared-ui ni React.
 *  4. features/ no importa infrastructure: usa los repositorios con useDeps().
 *  5. Una feature no importa de otra feature.
 */
const FIREBASE = {
  regex: '^firebase(/|$)',
  message: 'Solo src/infrastructure/firebase puede importar Firebase. Usa un repositorio (core/ports.ts).',
};
const INFRA = {
  group: ['@/infrastructure', '@/infrastructure/*', '**/infrastructure/**'],
  message: 'Las features y el núcleo no importan infrastructure. Obtén los repositorios con useDeps().',
};
const OTRA_FEATURE = {
  group: ['@/features', '@/features/*'],
  message: 'Una feature no importa de otra. Lo común va a core/ o shared-ui/.',
};
const CAPAS_ALTAS = {
  group: ['@/app', '@/app/*', '@/features', '@/features/*', '@/shared-ui', '@/shared-ui/*', 'react', 'react/*', 'react-dom', 'react-dom/*'],
  message: 'core/ es puro: no depende de la app, las features, la UI ni React.',
};
const SIN_FETCH = [{ name: 'fetch', message: 'Solo src/infrastructure/api hace llamadas HTTP.' }];

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-restricted-imports': ['error', { patterns: [FIREBASE] }],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [FIREBASE, INFRA, OTRA_FEATURE] }],
      'no-restricted-globals': ['error', ...SIN_FETCH],
    },
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [FIREBASE, INFRA, CAPAS_ALTAS] }],
      'no-restricted-globals': ['error', ...SIN_FETCH],
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}', 'src/shared-ui/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}'],
    rules: { 'no-restricted-globals': ['error', ...SIN_FETCH] },
  },
  {
    files: ['src/infrastructure/firebase/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    rules: { 'no-restricted-imports': 'off', 'no-restricted-globals': 'off' },
  },
);
