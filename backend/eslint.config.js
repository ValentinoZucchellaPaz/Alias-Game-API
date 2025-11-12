import { defineConfig } from "eslint/config";
import eslintRecommended from "@eslint/js";
import prettier from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";

export default defineConfig([
  // Config base para Node
  eslintRecommended.configs.recommended,

  {
    files: ["**/*.js", "**/*.mjs"],
    ignores: ["node_modules/**", "dist/**", "coverage/**"],

    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Node.js
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        crypto: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },

    plugins: { prettier },

    rules: {
      ...eslintConfigPrettier.rules,
      "prettier/prettier": "error",
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },

  // Config for test files
  {
    files: ["**/*.test.js", "**/__tests__/**/*.js"],
    languageOptions: {
      globals: {
        // Jest
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        jest: "readonly",

        // Node globals used in tests
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        crypto: "readonly",
      },
    },
  },
]);
