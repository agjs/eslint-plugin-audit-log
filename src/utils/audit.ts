import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";

export const DEFAULT_AUDIT_CALLEES: readonly string[] = [
  "auditLogService.record",
  "audit.record"
];

export const DEFAULT_PII_FIELDS: readonly string[] = [
  "email",
  "phone",
  "password",
  "token",
  "apiKey",
  "ssn",
  "ipAddress"
];

export const DEFAULT_MUTATING_PREFIXES: readonly string[] = [
  "^(create|update|delete|insert|register|approve|reject|activate|deactivate|enable|disable|complete|cancel|grant|revoke)"
];

/**
 * Returns the dotted accessor path of a CallExpression's callee:
 *   `auditLogService.record(...)` → "auditLogService.record"
 *   `this.audit.record(...)`      → "this.audit.record"
 *   `record(...)`                 → "record"
 * Returns null if the path can't be statically derived (computed access etc.).
 */
export function getCalleePath(node: TSESTree.CallExpression): string | null {
  const segments: string[] = [];

  function walk(n: TSESTree.Node): boolean {
    if (n.type === AST_NODE_TYPES.Identifier) {
      segments.unshift(n.name);
      return true;
    }
    if (n.type === AST_NODE_TYPES.ThisExpression) {
      segments.unshift("this");
      return true;
    }
    if (n.type === AST_NODE_TYPES.MemberExpression && !n.computed) {
      if (n.property.type !== AST_NODE_TYPES.Identifier) {
        return false;
      }
      segments.unshift(n.property.name);
      return walk(n.object);
    }
    return false;
  }

  if (!walk(node.callee)) {
    return null;
  }
  return segments.join(".");
}

/**
 * Returns true if the callee path matches any configured pattern. Patterns
 * are dotted accessors; a match is exact-equal OR an "ends with" match
 * after stripping leading `this.` (so `this.audit.record` matches
 * `audit.record`).
 */
export function calleePathMatchesAny(
  path: string,
  patterns: readonly string[]
): boolean {
  for (const pat of patterns) {
    if (path === pat) {
      return true;
    }
    if (path.endsWith(`.${pat}`)) {
      return true;
    }
  }
  return false;
}
