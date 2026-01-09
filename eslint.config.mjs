import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginSort from "eslint-plugin-sort";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import eslintPluginUnusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import importPlugin from "eslint-plugin-import";

export default defineConfig(
  {
    ignores: ["node_modules/**", "dist/**", "*.config.*"],
  },
  ...tseslint.configs.recommended,
  eslintPluginUnicorn.configs.recommended,
  eslintPluginSort.configs["flat/recommended"],
  {
    extends: [
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.typescript,
    ],
    plugins: {
      "unused-imports": eslintPluginUnusedImports,
    },
    rules: {
      "import/no-unresolved": "off",
      "import/order": [
        "error",
        {
          alphabetize: {
            order: "asc",
          },
          "newlines-between": "always",
        },
      ],
      "unicorn/prefer-top-level-await": "off",
      "unicorn/import-style": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      // Sort plugin rules
      "sort/imports": "off",
      "sort/exports": "error",
      "sort/object-properties": "error",
      "sort/type-properties": "error",
      "sort/string-enums": "error",
      "sort/string-unions": "error",
      "sort/destructuring-properties": "error",
      "unicorn/filename-case": [
        "error",
        {
          case: "kebabCase",
        },
      ],
      "unicorn/prevent-abbreviations": "off",
    },
  },
  eslintConfigPrettier,
);
