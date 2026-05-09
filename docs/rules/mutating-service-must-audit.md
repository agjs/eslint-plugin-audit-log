# mutating-service-must-audit

Mutating service methods (create/update/delete/...) must record an audit
event somewhere in the body.

## Why

Audit trails are only useful if every mutation actually writes one. The
"forgot to call `audit.record(...)`" mistake silently leaves gaps for
weeks before someone notices. This rule scans service files and confirms
the audit recorder is invoked from every mutating function.

## How it works

For files matching `fileGlob` (default `**/*.service.ts`), the rule visits
every `FunctionDeclaration` / `FunctionExpression` / `ArrowFunctionExpression`
whose name matches one of the configured `mutatingPrefixes` regexes. If
the body contains a call to one of `auditCallees`, the function passes;
otherwise it's reported.

The recorder call may live anywhere in the body — top-level, in a try/catch,
inside a transaction callback. As long as it executes on the success path
in some branch, the rule passes.

## Options

```ts
{
  fileGlob?: string;             // default: "**/*.service.ts"
  mutatingPrefixes?: string[];   // default: ["^(create|update|delete|insert|register|approve|reject|activate|deactivate|enable|disable|complete|cancel|grant|revoke)"]
  auditCallees?: string[];       // default: ["auditLogService.record", "audit.record"]
  allowFunctions?: string[];     // default: []
}
```

`auditCallees` are matched as dotted accessors with a forgiving suffix
match: `audit.record` matches both `audit.record(...)` and
`this.audit.record(...)`.

## Examples

In `src/users/users.service.ts`:

Valid:

```ts
export async function createUser(input) {
  const user = await repo.insert(input);
  await auditLogService.record({ action: "user.created" });
  return user;
}

class UserService {
  async updateUser(id, patch) {
    await this.repo.update(id, patch);
    await this.audit.record({ action: "user.updated" });
  }
}
```

Invalid:

```ts
export async function createUser(input) {
  return repo.insert(input);                  // no audit
}

class UserService {
  async revokeUser(id) {
    return this.repo.delete(id);              // no audit
  }
}
```
