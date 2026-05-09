import tsParser from "@typescript-eslint/parser";
import auditLog from "eslint-plugin-audit-log";

export default [
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    plugins: {
      "audit-log": auditLog
    },
    rules: {
      "audit-log/mutating-service-must-audit": "error",
      "audit-log/audit-write-must-be-fire-and-forget": [
        "error",
        { allowAwaitInsidePatterns: ["tests/**/*.ts"] }
      ],
      "audit-log/audit-metadata-no-pii": "warn"
    }
  }
];
