declare const repo: { insert: (v: unknown) => Promise<{ id: string }> };
declare const audit: {
  record: (event: { action: string; metadata?: object }) => Promise<void>;
};
declare const user: { email: string };

// mutating-service-must-audit: no audit recorded
export async function createUser(input: unknown): Promise<{ id: string }> {
  return repo.insert(input);
}

export async function deleteUser(id: string): Promise<void> {
  // audit-write-must-be-fire-and-forget: awaited
  await audit.record({
    action: "user.deleted",
    // audit-metadata-no-pii: email leaks PII into the audit table
    metadata: { email: user.email }
  });
  void id;
}
