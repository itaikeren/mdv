import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { API_KEY_PREFIX, generateApiKey, requireFullScope } from "./auth.js";
import type { AuthContext } from "./auth.js";

describe("generateApiKey", () => {
  it("issues a key with the mdv_ prefix and a 12-char display prefix", async () => {
    const { key, prefix } = await generateApiKey();
    expect(key.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(prefix).toBe(key.slice(0, 12));
    expect(prefix.length).toBe(12);
  });

  it("stores the sha256 of the FULL key, never the key itself", async () => {
    const { key, hash, prefix } = await generateApiKey();
    expect(hash).toBe(createHash("sha256").update(key).digest("hex"));
    expect(hash).toHaveLength(64);
    // What we persist (prefix + hash) must not contain the secret.
    expect(hash).not.toContain(key);
    expect(key).not.toContain(hash);
    expect(key.slice(prefix.length)).not.toBe("");
  });

  it("uses 32 bytes of entropy, so keys are not guessable or repeated", async () => {
    const keys = await Promise.all(Array.from({ length: 50 }, () => generateApiKey()));
    const unique = new Set(keys.map((k) => k.key));
    expect(unique.size).toBe(50);

    // 32 random bytes -> 43 base64url chars after the prefix.
    const secret = keys[0].key.slice(API_KEY_PREFIX.length);
    expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

// A `docs`-scope key must not be able to perform account-shaping actions
// (claiming a username, publishing publicly). Clerk sessions are always full.

describe("requireFullScope", () => {
  const ctx = () => {
    const json = vi.fn((body: unknown, status: number) => ({ body, status }));
    return { json } as never;
  };

  const auth = (over: Partial<AuthContext>): AuthContext => ({
    userId: "user_1",
    email: null,
    viaApiKey: true,
    scope: "docs",
    ...over,
  });

  it("refuses a docs-scope API key with a 403", () => {
    const c = ctx();
    const res = requireFullScope(c, auth({ viaApiKey: true, scope: "docs" }));
    expect(res).not.toBeNull();
    expect((c as unknown as { json: ReturnType<typeof vi.fn> }).json).toHaveBeenCalledWith(
      { error: "This action requires a full-scope API key" },
      403,
    );
  });

  it("allows a full-scope API key", () => {
    expect(requireFullScope(ctx(), auth({ viaApiKey: true, scope: "full" }))).toBeNull();
  });

  it("allows a Clerk session regardless of scope", () => {
    expect(requireFullScope(ctx(), auth({ viaApiKey: false, scope: "docs" }))).toBeNull();
  });
});
