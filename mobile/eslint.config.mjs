// https://docs.expo.dev/guides/using-eslint/
// ESM on purpose: the repo root's ESLint also sweeps this file and its ruleset
// forbids require().
import { defineConfig } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat.js';

export default defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*']
  }
]);
