import path from "node:path";

import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import type { JSONSchema4 } from "@typescript-eslint/utils/json-schema";
import micromatch from "micromatch";

import { createRule } from "../utils/createRule";
import {
  DEFAULT_AUDIT_CALLEES,
  calleePathMatchesAny,
  getCalleePath
} from "../utils/audit";

export const RULE_NAME = "audit-write-must-be-fire-and-forget";

export interface AuditWriteMustBeFireAndForgetOptions {
  readonly auditCallees?: readonly string[];
  readonly allowAwaitInsidePatterns?: readonly string[];
}

type RuleOptions = [AuditWriteMustBeFireAndForgetOptions];
type MessageIds = "awaitedAudit";

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
    allowAwaitInsidePatterns: {
      type: "array",
      items: { type: "string" },
      uniqueItems: true
    }
  }
};

function toPosixRelative(filename: string, cwd: string): string {
  return path.relative(cwd, filename).split(path.sep).join("/");
}

export const auditWriteMustBeFireAndForgetRule = createRule<
  RuleOptions,
  MessageIds
>({
  name: RULE_NAME,
  meta: {
    type: "problem",
    docs: {
      description:
        "Audit-log writes must be fire-and-forget (`void audit.record(...)`). Awaiting an audit write makes a flaky audit table block real requests."
    },
    fixable: "code",
    schema: [optionSchema],
    messages: {
      awaitedAudit:
        "Audit log writes must be fire-and-forget (`void {{callee}}(...)`) — awaiting an audit write means a flaky audit table can break a request."
    }
  },
  defaultOptions: [
    {
      auditCallees: [...DEFAULT_AUDIT_CALLEES],
      allowAwaitInsidePatterns: []
    }
  ],
  create(context, [options]) {
    const auditCallees = options.auditCallees ?? DEFAULT_AUDIT_CALLEES;
    const allowAwaitInsidePatterns = options.allowAwaitInsidePatterns ?? [];

    const relative = toPosixRelative(context.filename, context.cwd);
    if (
      allowAwaitInsidePatterns.length > 0 &&
      micromatch.isMatch(relative, [...allowAwaitInsidePatterns], {
        dot: true
      })
    ) {
      return {};
    }

    function isAuditCall(node: TSESTree.Node): node is TSESTree.CallExpression {
      if (node.type !== AST_NODE_TYPES.CallExpression) {
        return false;
      }
      const p = getCalleePath(node);
      if (p === null) {
        return false;
      }
      return calleePathMatchesAny(p, auditCallees);
    }

    function reportAwait(
      awaitNode: TSESTree.AwaitExpression,
      call: TSESTree.CallExpression
    ): void {
      const callPath = getCalleePath(call) ?? "audit.record";
      context.report({
        node: awaitNode,
        messageId: "awaitedAudit",
        data: { callee: callPath },
        fix(fixer) {
          // Replace `await <call>` with `void <call>`.
          return fixer.replaceTextRange(
            [awaitNode.range[0], awaitNode.range[0] + "await".length],
            "void"
          );
        }
      });
    }

    return {
      AwaitExpression(node) {
        const arg = node.argument;
        if (isAuditCall(arg)) {
          reportAwait(node, arg);
          return;
        }
      },
      // Catch `await Promise.all([audit.record(...), ...])` — the awaited
      // expression is a CallExpression to `Promise.all` whose array
      // contains the audit call.
      ArrayExpression(node) {
        for (const element of node.elements) {
          if (element === null) {
            continue;
          }
          if (element.type !== AST_NODE_TYPES.CallExpression) {
            continue;
          }
          if (!isAuditCall(element)) {
            continue;
          }
          // Walk parents: ArrayExpression → CallExpression(Promise.all) →
          // AwaitExpression.
          const arrParent = (element as { parent?: TSESTree.Node }).parent;
          if (arrParent === undefined) {
            continue;
          }
          const callParent = (arrParent as { parent?: TSESTree.Node })
            .parent;
          if (
            callParent === undefined ||
            callParent.type !== AST_NODE_TYPES.CallExpression
          ) {
            continue;
          }
          const awaitParent = (callParent as { parent?: TSESTree.Node })
            .parent;
          if (
            awaitParent === undefined ||
            awaitParent.type !== AST_NODE_TYPES.AwaitExpression
          ) {
            continue;
          }
          context.report({
            node: element,
            messageId: "awaitedAudit",
            data: { callee: getCalleePath(element) ?? "audit.record" }
          });
        }
      }
    };
  }
});
