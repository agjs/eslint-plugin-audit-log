import { TSESLint } from '@typescript-eslint/utils';
import * as _typescript_eslint_utils_ts_eslint from '@typescript-eslint/utils/ts-eslint';

interface AuditMetadataNoPiiOptions {
    readonly auditCallees?: readonly string[];
    readonly piiFields?: readonly string[];
}
type RuleOptions$2 = [AuditMetadataNoPiiOptions];
declare const auditMetadataNoPiiRule: _typescript_eslint_utils_ts_eslint.RuleModule<"piiInMetadata", RuleOptions$2, unknown, _typescript_eslint_utils_ts_eslint.RuleListener>;

interface AuditWriteMustBeFireAndForgetOptions {
    readonly auditCallees?: readonly string[];
    readonly allowAwaitInsidePatterns?: readonly string[];
}
type RuleOptions$1 = [AuditWriteMustBeFireAndForgetOptions];
declare const auditWriteMustBeFireAndForgetRule: _typescript_eslint_utils_ts_eslint.RuleModule<"awaitedAudit", RuleOptions$1, unknown, _typescript_eslint_utils_ts_eslint.RuleListener>;

interface MutatingServiceMustAuditOptions {
    readonly fileGlob?: string;
    readonly mutatingPrefixes?: readonly string[];
    readonly auditCallees?: readonly string[];
    readonly allowFunctions?: readonly string[];
}
type RuleOptions = [MutatingServiceMustAuditOptions];
declare const mutatingServiceMustAuditRule: _typescript_eslint_utils_ts_eslint.RuleModule<"mutationWithoutAudit", RuleOptions, unknown, _typescript_eslint_utils_ts_eslint.RuleListener>;

declare const rules: {
    "mutating-service-must-audit": _typescript_eslint_utils_ts_eslint.RuleModule<"mutationWithoutAudit", [MutatingServiceMustAuditOptions], unknown, _typescript_eslint_utils_ts_eslint.RuleListener>;
    "audit-write-must-be-fire-and-forget": _typescript_eslint_utils_ts_eslint.RuleModule<"awaitedAudit", [AuditWriteMustBeFireAndForgetOptions], unknown, _typescript_eslint_utils_ts_eslint.RuleListener>;
    "audit-metadata-no-pii": _typescript_eslint_utils_ts_eslint.RuleModule<"piiInMetadata", [AuditMetadataNoPiiOptions], unknown, _typescript_eslint_utils_ts_eslint.RuleListener>;
};

type AuditLogPlugin = TSESLint.FlatConfig.Plugin & {
    configs: Record<string, TSESLint.FlatConfig.Config>;
};
declare const plugin: AuditLogPlugin;

declare const configs: TSESLint.FlatConfig.SharedConfigs & Record<string, TSESLint.FlatConfig.Config>;

export { auditMetadataNoPiiRule, auditWriteMustBeFireAndForgetRule, configs, plugin as default, mutatingServiceMustAuditRule, rules };
