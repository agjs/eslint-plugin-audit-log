declare const repo: { insert: (v: unknown) => Promise<{ id: string }> };
declare const audit: {
  record: (event: { action: string; metadata?: object }) => Promise<void>;
};

export async function createUser(input: unknown): Promise<{ id: string }> {
  const user = await repo.insert(input);
  void audit.record({
    action: "user.created",
    metadata: { userId: user.id }
  });
  return user;
}
