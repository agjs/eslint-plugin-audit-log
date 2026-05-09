// src/configs/recommended.ts
var recommendedRules = {
  "audit-log/mutating-service-must-audit": "error",
  "audit-log/audit-write-must-be-fire-and-forget": "error",
  "audit-log/audit-metadata-no-pii": "warn"
};

// src/rules/audit-metadata-no-pii.ts
import { AST_NODE_TYPES as AST_NODE_TYPES2 } from "@typescript-eslint/utils";

// src/utils/createRule.ts
import { ESLintUtils } from "@typescript-eslint/utils";
var createRule = ESLintUtils.RuleCreator(
  (ruleName) => `https://github.com/eslint-custom-plugins/eslint-plugin-audit-log/blob/main/docs/rules/${ruleName}.md`
);

// src/utils/audit.ts
import { AST_NODE_TYPES } from "@typescript-eslint/utils";
var DEFAULT_AUDIT_CALLEES = [
  "auditLogService.record",
  "audit.record"
];
var DEFAULT_PII_FIELDS = [
  "email",
  "phone",
  "password",
  "token",
  "apiKey",
  "ssn",
  "ipAddress"
];
var DEFAULT_MUTATING_PREFIXES = [
  "^(create|update|delete|insert|register|approve|reject|activate|deactivate|enable|disable|complete|cancel|grant|revoke)"
];
function getCalleePath(node) {
  const segments = [];
  function walk(n) {
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
function calleePathMatchesAny(path3, patterns) {
  for (const pat of patterns) {
    if (path3 === pat) {
      return true;
    }
    if (path3.endsWith(`.${pat}`)) {
      return true;
    }
  }
  return false;
}

// src/rules/audit-metadata-no-pii.ts
var RULE_NAME = "audit-metadata-no-pii";
var optionSchema = {
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
function getPropertyKeyName(prop) {
  if (prop.computed) {
    return null;
  }
  if (prop.key.type === AST_NODE_TYPES2.Identifier) {
    return prop.key.name;
  }
  if (prop.key.type === AST_NODE_TYPES2.Literal && typeof prop.key.value === "string") {
    return prop.key.value;
  }
  return null;
}
function findMetadataObject(options) {
  for (const prop of options.properties) {
    if (prop.type !== AST_NODE_TYPES2.Property) {
      continue;
    }
    if (getPropertyKeyName(prop) !== "metadata") {
      continue;
    }
    if (prop.value.type !== AST_NODE_TYPES2.ObjectExpression) {
      return null;
    }
    return prop.value;
  }
  return null;
}
var auditMetadataNoPiiRule = createRule({
  name: RULE_NAME,
  meta: {
    type: "problem",
    docs: {
      description: "Audit-record `metadata` must not include PII keys \u2014 audit logs are typically retained for compliance and PII expands GDPR scope."
    },
    schema: [optionSchema],
    messages: {
      piiInMetadata: "Audit metadata field '{{field}}' looks like PII \u2014 store it in a separate, retention-bounded table or hash it before logging."
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
        if (arg === void 0 || arg.type !== AST_NODE_TYPES2.ObjectExpression) {
          return;
        }
        const metadata = findMetadataObject(arg);
        if (metadata === null) {
          return;
        }
        for (const prop of metadata.properties) {
          if (prop.type === AST_NODE_TYPES2.SpreadElement) {
            continue;
          }
          if (prop.type !== AST_NODE_TYPES2.Property) {
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

// src/rules/audit-write-must-be-fire-and-forget.ts
import path from "path";
import { AST_NODE_TYPES as AST_NODE_TYPES3 } from "@typescript-eslint/utils";
import micromatch from "micromatch";
var RULE_NAME2 = "audit-write-must-be-fire-and-forget";
var optionSchema2 = {
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
function toPosixRelative(filename, cwd) {
  return path.relative(cwd, filename).split(path.sep).join("/");
}
var auditWriteMustBeFireAndForgetRule = createRule({
  name: RULE_NAME2,
  meta: {
    type: "problem",
    docs: {
      description: "Audit-log writes must be fire-and-forget (`void audit.record(...)`). Awaiting an audit write makes a flaky audit table block real requests."
    },
    fixable: "code",
    schema: [optionSchema2],
    messages: {
      awaitedAudit: "Audit log writes must be fire-and-forget (`void {{callee}}(...)`) \u2014 awaiting an audit write means a flaky audit table can break a request."
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
    if (allowAwaitInsidePatterns.length > 0 && micromatch.isMatch(relative, [...allowAwaitInsidePatterns], {
      dot: true
    })) {
      return {};
    }
    function isAuditCall(node) {
      if (node.type !== AST_NODE_TYPES3.CallExpression) {
        return false;
      }
      const p = getCalleePath(node);
      if (p === null) {
        return false;
      }
      return calleePathMatchesAny(p, auditCallees);
    }
    function reportAwait(awaitNode, call) {
      const callPath = getCalleePath(call) ?? "audit.record";
      context.report({
        node: awaitNode,
        messageId: "awaitedAudit",
        data: { callee: callPath },
        fix(fixer) {
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
          if (element.type !== AST_NODE_TYPES3.CallExpression) {
            continue;
          }
          if (!isAuditCall(element)) {
            continue;
          }
          const arrParent = element.parent;
          if (arrParent === void 0) {
            continue;
          }
          const callParent = arrParent.parent;
          if (callParent === void 0 || callParent.type !== AST_NODE_TYPES3.CallExpression) {
            continue;
          }
          const awaitParent = callParent.parent;
          if (awaitParent === void 0 || awaitParent.type !== AST_NODE_TYPES3.AwaitExpression) {
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

// src/rules/mutating-service-must-audit.ts
import path2 from "path";
import { AST_NODE_TYPES as AST_NODE_TYPES4 } from "@typescript-eslint/utils";
import micromatch2 from "micromatch";
var RULE_NAME3 = "mutating-service-must-audit";
var DEFAULT_FILE_GLOB = "**/*.service.ts";
var optionSchema3 = {
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
function toPosixRelative2(filename, cwd) {
  return path2.relative(cwd, filename).split(path2.sep).join("/");
}
var mutatingServiceMustAuditRule = createRule({
  name: RULE_NAME3,
  meta: {
    type: "problem",
    docs: {
      description: "Mutating service methods (create/update/delete/...) must record an audit event somewhere in the body."
    },
    schema: [optionSchema3],
    messages: {
      mutationWithoutAudit: "Mutating method '{{method}}' does not record an audit event \u2014 call {{auditCallee}}(...) before returning."
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
    const relative = toPosixRelative2(context.filename, context.cwd);
    if (!micromatch2.isMatch(relative, fileGlob, { dot: true })) {
      return {};
    }
    const compiledPrefixes = mutatingPrefixes.map((p) => new RegExp(p));
    const stack = [];
    function nameMatches(name) {
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
    function getDeclaredName(node) {
      if (node.type === AST_NODE_TYPES4.FunctionDeclaration && node.id !== null) {
        return node.id.name;
      }
      const parent = node.parent;
      if (parent === void 0) {
        return null;
      }
      if (parent.type === AST_NODE_TYPES4.VariableDeclarator && parent.id.type === AST_NODE_TYPES4.Identifier) {
        return parent.id.name;
      }
      if (parent.type === AST_NODE_TYPES4.MethodDefinition && parent.key.type === AST_NODE_TYPES4.Identifier) {
        return parent.key.name;
      }
      if (parent.type === AST_NODE_TYPES4.Property && parent.key.type === AST_NODE_TYPES4.Identifier) {
        return parent.key.name;
      }
      return null;
    }
    function visitFn(node) {
      const name = getDeclaredName(node);
      if (name === null || !nameMatches(name)) {
        return;
      }
      stack.push({ node, name, hasAudit: false });
    }
    function exitFn(node) {
      const top = stack[stack.length - 1];
      if (top === void 0 || top.node !== node) {
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
        for (const frame of stack) {
          frame.hasAudit = true;
        }
      }
    };
  }
});

// src/rules/index.ts
var rules = {
  "mutating-service-must-audit": mutatingServiceMustAuditRule,
  "audit-write-must-be-fire-and-forget": auditWriteMustBeFireAndForgetRule,
  "audit-metadata-no-pii": auditMetadataNoPiiRule
};

// src/index.ts
var plugin = {
  meta: {
    name: "eslint-plugin-audit-log",
    version: "0.1.0"
  },
  rules,
  configs: {}
};
plugin.configs.recommended = {
  plugins: {
    "audit-log": plugin
  },
  rules: recommendedRules
};
var configs = plugin.configs;
var src_default = plugin;
export {
  auditMetadataNoPiiRule,
  auditWriteMustBeFireAndForgetRule,
  configs,
  src_default as default,
  mutatingServiceMustAuditRule,
  rules
};
