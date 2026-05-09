import {
  RULE_NAME,
  mutatingServiceMustAuditRule
} from "../../src/rules/mutating-service-must-audit";
import { ruleTester } from "../test-utils/ruleTester";

ruleTester.run(RULE_NAME, mutatingServiceMustAuditRule, {
  valid: [
    {
      // Audit on success path.
      filename: "src/users/users.service.ts",
      code: `
        export async function createUser(input) {
          const user = await repo.insert(input);
          await auditLogService.record({ action: "user.created" });
          return user;
        }
      `
    },
    {
      // Audit nested in a try/catch.
      filename: "src/users/users.service.ts",
      code: `
        export async function deleteUser(id) {
          try {
            await repo.delete(id);
            audit.record({ action: "user.deleted" });
          } catch (e) {
            throw e;
          }
        }
      `
    },
    {
      // Method form on a class.
      filename: "src/users/users.service.ts",
      code: `
        class UserService {
          async updateUser(id, patch) {
            await this.repo.update(id, patch);
            await this.audit.record({ action: "user.updated" });
          }
        }
      `
    },
    {
      // Not in a service file — rule no-ops.
      filename: "src/users/users.controller.ts",
      code: `
        export async function createUser() {
          return { id: 1 };
        }
      `
    },
    {
      // Not a mutating prefix.
      filename: "src/users/users.service.ts",
      code: `
        export async function loadUser(id) {
          return repo.find(id);
        }
      `
    },
    {
      // Exempted by allowFunctions.
      filename: "src/users/users.service.ts",
      options: [{ allowFunctions: ["createInternal"] }],
      code: `
        export async function createInternal() {
          return repo.insert({});
        }
      `
    }
  ],
  invalid: [
    {
      filename: "src/users/users.service.ts",
      code: `
        export async function createUser(input) {
          return repo.insert(input);
        }
      `,
      errors: [{ messageId: "mutationWithoutAudit" }]
    },
    {
      filename: "src/users/users.service.ts",
      code: `
        export async function deleteUser(id) {
          return repo.delete(id);
        }
      `,
      errors: [{ messageId: "mutationWithoutAudit" }]
    },
    {
      filename: "src/users/users.service.ts",
      code: `
        class UserService {
          async revokeUser(id) {
            return this.repo.delete(id);
          }
        }
      `,
      errors: [{ messageId: "mutationWithoutAudit" }]
    }
  ]
});
