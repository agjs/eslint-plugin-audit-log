import path from "node:path";

import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/utils";
import type { JSONSchema4 } from "@typescript-eslint/utils/json-schema";
import micromatch from "micromatch";

import { createRule } from "../utils/createRule";
import {
  DEFAULT_AUDIT_CALLEES,
  DEFAULT_MUTATING_PREFIXES,
  calleePathMatchesAny,
  getCalleePath
} from "../utils/audit";

export const RULE_NAME = "mutating-service-must-audit";

export interface MutatingServiceMustAuditOptions {
  readonly fileGlob?: string;
  readonly mutatingPrefixes?: readonly string[];
  readonly auditCallees?: readonly string[];
  readonly allowFunctions?: readonly string[];
}

type RuleOptions = [MutatingServiceMustAuditOptions];
type MessageIds = "mutationWithoutAudit";

const DEFAULT_FILE_GLOB = "**/*.service.ts";

const optionSchema: JSONSchema4 = {
  type: "object",
  additionalProperties: false,
  properties: {
    fileGlob: { type: "string", minLength: 1 },
    mutatingPrefixes: {
      type: "array",
      items: { type: "string" },
      uniqueItems: true,
      minItems: 1
    },
    auditCallees: {
      type: "array",
      items: { type: "string" },
      uniqueItems: true,
      minItems: 1
    },
    allowFunctions: {
      type: "array",
      items: { type: "string" },
      uniqueItems: true
    }
  }
};

type FunctionLike =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

interface NamedFunctionFrame {
  readonly node: FunctionLike;
  readonly name: string;
  hasAudit: boolean;
}

function toPosixRelative(filename: string, cwd: string): string {
  return path.relative(cwd, filename).split(path.sep).join("/");
}

export const mutatingServiceMustAuditRule = createRule<
  RuleOptions,
  MessageIds
>({
  name: RULE_NAME,
  meta: {
    type: "problem",
    docs: {
      description:
        "Mutating service methods (create/update/delete/...) must record an audit event somewhere in the body."
    },
    schema: [optionSchema],
    messages: {
      mutationWithoutAudit:
        "Mutating method '{{method}}' does not record an audit event — call {{auditCallee}}(...) before returning."
    }
  },
  defaultOptions: [
    {
      fileGlob: DEFAULT_FILE_GLOB,
      mutatingPrefixes: [...DEFAULT_MUTATING_PREFIXES],
      auditCallees: [...DEFAULT_AUDIT_CALLEES],
      allowFunctions: []
    }
  ],
  create(context, [options]) {
    const fileGlob = options.fileGlob ?? DEFAULT_FILE_GLOB;
    const mutatingPrefixes = options.mutatingPrefixes ?? DEFAULT_MUTATING_PREFIXES;
    const auditCallees = options.auditCallees ?? DEFAULT_AUDIT_CALLEES;
    const allowFunctions = new Set(options.allowFunctions ?? []);

    const relative = toPosixRelative(context.filename, context.cwd);
    if (!micromatch.isMatch(relative, fileGlob, { dot: true })) {
      return {};
    }

    const compiledPrefixes = mutatingPrefixes.map((p) => new RegExp(p));
    const stack: NamedFunctionFrame[] = [];

    function nameMatches(name: string): boolean {
      if (allowFunctions.has(name)) {
        return false;
      }
      for (const re of compiledPrefixes) {
        if (re.test(name)) {
          return true;
        }
      }
      return false;
    }

    function getDeclaredName(
      node: FunctionLike
    ): string | null {
      if (
        node.type === AST_NODE_TYPES.FunctionDeclaration &&
        node.id !== null
      ) {
        return node.id.name;
      }
      const parent = (node as { parent?: TSESTree.Node }).parent;
      if (parent === undefined) {
        return null;
      }
      if (
        parent.type === AST_NODE_TYPES.VariableDeclarator &&
        parent.id.type === AST_NODE_TYPES.Identifier
      ) {
        return parent.id.name;
      }
      if (
        parent.type === AST_NODE_TYPES.MethodDefinition &&
        parent.key.type === AST_NODE_TYPES.Identifier
      ) {
        return parent.key.name;
      }
      if (
        parent.type === AST_NODE_TYPES.Property &&
        parent.key.type === AST_NODE_TYPES.Identifier
      ) {
        return parent.key.name;
      }
      return null;
    }

    function visitFn(node: FunctionLike): void {
      const name = getDeclaredName(node);
      if (name === null || !nameMatches(name)) {
        return;
      }
      stack.push({ node, name, hasAudit: false });
    }

    function exitFn(node: FunctionLike): void {
      const top = stack[stack.length - 1];
      if (top === undefined || top.node !== node) {
        return;
      }
      stack.pop();
      if (top.hasAudit) {
        return;
      }
      context.report({
        node,
        messageId: "mutationWithoutAudit",
        data: {
          method: top.name,
          auditCallee: auditCallees[0] ?? "audit.record"
        }
      });
    }

    return {
      FunctionDeclaration: visitFn,
      "FunctionDeclaration:exit": exitFn,
      FunctionExpression: visitFn,
      "FunctionExpression:exit": exitFn,
      ArrowFunctionExpression: visitFn,
      "ArrowFunctionExpression:exit": exitFn,

      CallExpression(node) {
        if (stack.length === 0) {
          return;
        }
        const callPath = getCalleePath(node);
        if (callPath === null) {
          return;
        }
        if (!calleePathMatchesAny(callPath, auditCallees)) {
          return;
        }
        // Mark every enclosing tracked frame as audited.
        for (const frame of stack) {
          frame.hasAudit = true;
        }
      }
    };
  }
});
