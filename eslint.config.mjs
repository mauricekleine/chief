import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginSort from "eslint-plugin-sort";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import eslintPluginUnusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["node_modules/**", "dist/**", "*.config.*"],
  },
  ...tseslint.configs.recommended,
  eslintPluginUnicorn.configs.recommended,
  eslintPluginSort.configs["flat/recommended"],
  {
    plugins: {
      "unused-imports": eslintPluginUnusedImports,
    },
    rules: {
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
      "sort/imports": "error",
      "sort/exports": "error",
      "sort/object-properties": "error",
      "sort/type-properties": "error",
      "sort/string-enums": "error",
      "sort/string-unions": "error",
      "sort/destructuring-properties": "error",
    },
  },
  eslintConfigPrettier,
);
