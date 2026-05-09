# audit-write-must-be-fire-and-forget

Audit-log writes must be fire-and-forget: `void audit.record(...)` —
never `await`-ed.

## Why

If you await the audit write, a flaky audit table (slow disk, replication
lag, lock contention) takes down real user requests. Audit logs are
supposed to be the resilient layer; awaiting them inverts that property.

This rule has an autofix: `await x.record(args)` becomes `void x.record(args)`.

## Patterns flagged

- `await audit.record(...)` — standalone expression statement.
- `const _ = await audit.record(...)` — assigned and discarded.
- `await Promise.all([audit.record(...), other()])` — bundled in a
  Promise.all (the audit write blocks the bundle).

## Options

```ts
{
  auditCallees?: string[];               // default: ["auditLogService.record", "audit.record"]
  allowAwaitInsidePatterns?: string[];   // default: [] — file globs that may legitimately await
}
```

`allowAwaitInsidePatterns` exists for tests, where awaiting the audit
write to confirm it landed is the whole point.

## Examples

Valid:

```ts
void auditLogService.record({ action: "x" });
audit.record({ action: "x" });             // implicit fire-and-forget
void this.audit.record({ action: "x" });
```

Invalid:

```ts
await auditLogService.record({ action: "x" });
const _ = await audit.record({ action: "x" });
await Promise.all([audit.record({ action: "x" }), other()]);
```
