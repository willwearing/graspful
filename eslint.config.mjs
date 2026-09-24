import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";

// Package checks share the same correctness rules. Apps add React/Next rules.
export default [
  { ignores: ["**/node_modules/**", "**/dist/**", "**/coverage/**"] },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...js.configs.recommended.rules,
      // TypeScript resolves declarations and globals; the JS rules misread types.
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-redeclare": "off",
    },
  },
];
