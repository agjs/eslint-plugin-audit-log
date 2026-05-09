import type { TSESLint } from "@typescript-eslint/utils";

import { recommendedRules } from "./configs/recommended";
import { rules } from "./rules";
import { auditMetadataNoPiiRule } from "./rules/audit-metadata-no-pii";
import { auditWriteMustBeFireAndForgetRule } from "./rules/audit-write-must-be-fire-and-forget";
import { mutatingServiceMustAuditRule } from "./rules/mutating-service-must-audit";

type AuditLogPlugin = TSESLint.FlatConfig.Plugin & {
  configs: Record<string, TSESLint.FlatConfig.Config>;
};

const plugin: AuditLogPlugin = {
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

export {
  mutatingServiceMustAuditRule,
  auditWriteMustBeFireAndForgetRule,
  auditMetadataNoPiiRule
};
export { rules };
export const configs = plugin.configs;
export default plugin;
