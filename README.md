# eslint-plugin-audit-log

[![CI](https://github.com/agjs/eslint-plugin-audit-log/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/agjs/eslint-plugin-audit-log/actions/workflows/ci.yml)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen)
![Typecheck](https://img.shields.io/badge/typecheck-passing-brightgreen)
![Build](https://img.shields.io/badge/build-passing-brightgreen)

ESLint rules that keep audit trails honest:

- **`mutating-service-must-audit`** — every mutating service method
  (`create*`, `update*`, `delete*`, ...) must record an audit event.
  Catches the silent-gap mistake before it spreads.
- **`audit-write-must-be-fire-and-forget`** — audit-log writes must be
  `void audit.record(...)`, never awaited. A flaky audit table must
  never block a real request. Autofixes `await` → `void`.
- **`audit-metadata-no-pii`** — the `metadata:` of an audit record must
  not include PII keys. Audit tables are retained for compliance and
  shouldn't quietly become a PII reservoir.

## Install

```sh
pnpm add -D eslint-plugin-audit-log
```

Peer deps: `eslint >= 8.57`, `@typescript-eslint/parser >= 8`,
`typescript >= 5`.

## Use (flat config)

```js
import tsParser from "@typescript-eslint/parser";
import auditLog from "eslint-plugin-audit-log";

export default [
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser: tsParser },
    plugins: { "audit-log": auditLog },
    rules: {
      "audit-log/mutating-service-must-audit": "error",
      "audit-log/audit-write-must-be-fire-and-forget": "error",
      "audit-log/audit-metadata-no-pii": "warn"
    }
  }
];
```

Or use the bundled config:

```js
import auditLog from "eslint-plugin-audit-log";

export default [auditLog.configs.recommended];
```

## Rules

| Rule | Description | Default in recommended | Fixable |
| --- | --- | --- | --- |
| [`mutating-service-must-audit`](docs/rules/mutating-service-must-audit.md) | Mutating service methods must call the audit recorder | `error` | – |
| [`audit-write-must-be-fire-and-forget`](docs/rules/audit-write-must-be-fire-and-forget.md) | Audit writes must not be awaited | `error` | yes |
| [`audit-metadata-no-pii`](docs/rules/audit-metadata-no-pii.md) | Audit metadata must not include PII keys | `warn` | – |

## License

MIT.
