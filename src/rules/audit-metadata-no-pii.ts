import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import type { JSONSchema4 } from "@typescript-eslint/utils/json-schema";

import { createRule } from "../utils/createRule";
import {
  DEFAULT_AUDIT_CALLEES,
  DEFAULT_PII_FIELDS,
  calleePathMatchesAny,
  getCalleePath
} from "../utils/audit";

export const RULE_NAME = "audit-metadata-no-pii";

export interface AuditMetadataNoPiiOptions {
  readonly auditCallees?: readonly string[];
  readonly piiFields?: readonly string[];
}

type RuleOptions = [AuditMetadataNoPiiOptions];
type MessageIds = "piiInMetadata";

const optionSchema: JSONSchema4 = {
  type: "object",
  additionalProperties: false,
  properties: {
    auditCallees: {
      type: "array",
      items: { type: "string" },
      uniqueItems: true,
      minItems: 1
    },
    piiFields: {
      type: "array",
      items: { type: "string" },
      uniqueItems: true,
      minItems: 1
    }
  }
};

function getPropertyKeyName(
  prop: TSESTree.Property
): string | null {
  if (prop.computed) {
    return null;
  }
  if (prop.key.type === AST_NODE_TYPES.Identifier) {
    return prop.key.name;
  }
  if (
    prop.key.type === AST_NODE_TYPES.Literal &&
    typeof prop.key.value === "string"
  ) {
    return prop.key.value;
  }
  return null;
}

function findMetadataObject(
  options: TSESTree.ObjectExpression
): TSESTree.ObjectExpression | null {
  for (const prop of options.properties) {
    if (prop.type !== AST_NODE_TYPES.Property) {
      continue;
    }
    if (getPropertyKeyName(prop) !== "metadata") {
      continue;
    }
    if (prop.value.type !== AST_NODE_TYPES.ObjectExpression) {
      return null;
    }
    return prop.value;
  }
  return null;
}

export const auditMetadataNoPiiRule = createRule<RuleOptions, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: "problem",
    docs: {
      description:
        "Audit-record `metadata` must not include PII keys — audit logs are typically retained for compliance and PII expands GDPR scope."
    },
    schema: [optionSchema],
    messages: {
      piiInMetadata:
        "Audit metadata field '{{field}}' looks like PII — store it in a separate, retention-bounded table or hash it before logging."
    }
  },
  defaultOptions: [
    {
      auditCallees: [...DEFAULT_AUDIT_CALLEES],
      piiFields: [...DEFAULT_PII_FIELDS]
    }
  ],
  create(context, [options]) {
    const auditCallees = options.auditCallees ?? DEFAULT_AUDIT_CALLEES;
    const piiFields = new Set(options.piiFields ?? DEFAULT_PII_FIELDS);

    return {
      CallExpression(node) {
        const callPath = getCalleePath(node);
        if (callPath === null) {
          return;
        }
        if (!calleePathMatchesAny(callPath, auditCallees)) {
          return;
        }
        const arg = node.arguments[0];
        if (arg === undefined || arg.type !== AST_NODE_TYPES.ObjectExpression) {
          return;
        }
        const metadata = findMetadataObject(arg);
        if (metadata === null) {
          return;
        }
        for (const prop of metadata.properties) {
          if (prop.type === AST_NODE_TYPES.SpreadElement) {
            // Spread of external object — can't statically inspect.
            continue;
          }
          if (prop.type !== AST_NODE_TYPES.Property) {
            continue;
          }
          const name = getPropertyKeyName(prop);
          if (name === null || !piiFields.has(name)) {
            continue;
          }
          context.report({
            node: prop,
            messageId: "piiInMetadata",
            data: { field: name }
          });
        }
      }
    };
  }
});
