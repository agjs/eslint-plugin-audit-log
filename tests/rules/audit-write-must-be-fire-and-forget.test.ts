import {
  RULE_NAME,
  auditWriteMustBeFireAndForgetRule
} from "../../src/rules/audit-write-must-be-fire-and-forget";
import { ruleTester } from "../test-utils/ruleTester";

ruleTester.run(RULE_NAME, auditWriteMustBeFireAndForgetRule, {
  valid: [
    {
      code: `void auditLogService.record({ action: "x" });`
    },
    {
      code: `audit.record({ action: "x" });`
    },
    {
      code: `void this.audit.record({ action: "x" });`
    },
    {
      // Exempted file.
      filename: "tests/audit.test.ts",
      options: [{ allowAwaitInsidePatterns: ["tests/**/*.ts"] }],
      code: `await audit.record({ action: "x" });`
    }
  ],
  invalid: [
    {
      code: `await auditLogService.record({ action: "x" });`,
      errors: [{ messageId: "awaitedAudit" }],
      output: `void auditLogService.record({ action: "x" });`
    },
    {
      code: `await audit.record({ action: "x" });`,
      errors: [{ messageId: "awaitedAudit" }],
      output: `void audit.record({ action: "x" });`
    },
    {
      code: `await this.audit.record({ action: "x" });`,
      errors: [{ messageId: "awaitedAudit" }],
      output: `void this.audit.record({ action: "x" });`
    },
    {
      code: `const _ = await audit.record({ action: "x" });`,
      errors: [{ messageId: "awaitedAudit" }],
      output: `const _ = void audit.record({ action: "x" });`
    },
    {
      // Inside Promise.all.
      code: `await Promise.all([audit.record({ action: "x" }), other()]);`,
      errors: [{ messageId: "awaitedAudit" }]
    }
  ]
});
