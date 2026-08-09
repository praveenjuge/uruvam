import eslint from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".vite",
      "out",
      "dist",
      "vendor",
      "test-results",
      "playwright-report",
    ],
  },
  eslint.configs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        AbortSignal: "readonly",
        Buffer: "readonly",
        clearTimeout: "readonly",
        document: "readonly",
        fetch: "readonly",
        process: "readonly",
        setTimeout: "readonly",
      },
    },
    rules: { "no-useless-assignment": "off" },
  },
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  })),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-useless-assignment": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-useless-assignment": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
    },
  },
  {
    files: ["src/renderer/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "warn",
    },
  },
);
