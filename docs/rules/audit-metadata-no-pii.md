# audit-metadata-no-pii

The `metadata:` field of an audit-record options object must not include
PII keys.

## Why

Audit logs are typically retained for compliance — months or years.
Stuffing PII into the metadata column expands GDPR/PIPEDA scope to the
audit table, makes deletion requests harder, and turns a
retention-policy mistake into a data-leak.

Store identifiers (user ID, organisation ID) in metadata. Store the PII
itself in a separate, retention-bounded table — or hash it before
logging.

## How it works

For each call matching `auditCallees` whose first argument is an
`ObjectExpression`, the rule looks for a `metadata:` property whose value
is also an `ObjectExpression` and reports any key in `piiFields`.

A spread element (`metadata: { ...external }`) is skipped — there's no
way to statically inspect it.

## Options

```ts
{
  auditCallees?: string[];   // default: ["auditLogService.record", "audit.record"]
  piiFields?: string[];      // default: ["email", "phone", "password", "token", "apiKey", "ssn", "ipAddress"]
}
```

## Examples

Valid:

```ts
auditLogService.record({
  action: "user.created",
  metadata: { userId: "u1" }
});

audit.record({ action: "x", metadata: { ipHash: hashIp(ip) } });
audit.record({ action: "x" });   // no metadata
```

Invalid:

```ts
auditLogService.record({
  action: "user.created",
  metadata: { email: user.email }
});

audit.record({
  action: "x",
  metadata: { phone: u.phone, password: pwd }
});

audit.record({ action: "x", metadata: { ipAddress: ip } });
```
