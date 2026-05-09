import { auditMetadataNoPiiRule } from "./audit-metadata-no-pii";
import { auditWriteMustBeFireAndForgetRule } from "./audit-write-must-be-fire-and-forget";
import { mutatingServiceMustAuditRule } from "./mutating-service-must-audit";

export const rules = {
  "mutating-service-must-audit": mutatingServiceMustAuditRule,
  "audit-write-must-be-fire-and-forget": auditWriteMustBeFireAndForgetRule,
  "audit-metadata-no-pii": auditMetadataNoPiiRule
};
