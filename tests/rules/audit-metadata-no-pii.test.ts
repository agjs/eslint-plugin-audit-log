import {
  RULE_NAME,
  auditMetadataNoPiiRule
} from "../../src/rules/audit-metadata-no-pii";
import { ruleTester } from "../test-utils/ruleTester";

ruleTester.run(RULE_NAME, auditMetadataNoPiiRule, {
  valid: [
    {
      code: `auditLogService.record({ action: "user.created", metadata: { userId: "u1" } });`
    },
    {
      code: `audit.record({ action: "x", metadata: { ipHash: "abc" } });`
    },
    {
      // No metadata at all.
      code: `audit.record({ action: "x" });`
    },
    {
      // Spread of external metadata — can't statically inspect, skip.
      code: `audit.record({ action: "x", metadata: { ...external } });`
    },
    {
      // Custom piiFields.
      options: [{ piiFields: ["customField"] }],
      code: `audit.record({ action: "x", metadata: { email: "a@b.com" } });`
    }
  ],
  invalid: [
    {
      code: `auditLogService.record({ action: "user.created", metadata: { email: user.email } });`,
      errors: [{ messageId: "piiInMetadata" }]
    },
    {
      code: `audit.record({ action: "x", metadata: { phone: u.phone, password: pwd } });`,
      errors: [
        { messageId: "piiInMetadata" },
        { messageId: "piiInMetadata" }
      ]
    },
    {
      code: `audit.record({ action: "x", metadata: { token: t } });`,
      errors: [{ messageId: "piiInMetadata" }]
    },
    {
      code: `audit.record({ action: "x", metadata: { ipAddress: ip } });`,
      errors: [{ messageId: "piiInMetadata" }]
    }
  ]
});
