import { describe, expect, it } from "vitest";
import { maskEmail, toPublicAuthor } from "./comment-author.js";

// These helpers are the last line of defence against leaking a commenter's email
// out of the REST route or the MCP `get_comments` tool, so the important cases
// are the ones where an address could escape unmasked.

describe("maskEmail", () => {
  it("keeps only the first character of the local part", () => {
    expect(maskEmail("john@example.com")).toBe("j***@example.com");
  });

  it("does not leak the local part of a single-character address", () => {
    expect(maskEmail("a@example.com")).toBe("a***@example.com");
  });

  it("masks only up to the FIRST @, so a local part containing @ can't smuggle one out", () => {
    expect(maskEmail("weird@name@example.com")).toBe("w***@name@example.com");
  });

  it("returns empty string rather than echoing input when there is no local part", () => {
    expect(maskEmail("@example.com")).toBe("");
    expect(maskEmail("not-an-email")).toBe("");
    expect(maskEmail("")).toBe("");
  });
});

describe("toPublicAuthor", () => {
  it("masks the email of an authenticated commenter", () => {
    expect(toPublicAuthor({ userId: "user_123", userEmail: "john@example.com" })).toBe(
      "j***@example.com",
    );
  });

  it("passes through a display name (newer comments store a name, not an email)", () => {
    expect(toPublicAuthor({ userId: "user_123", userEmail: "itai" })).toBe("itai");
  });

  it("passes through an anonymous commenter's name verbatim", () => {
    expect(toPublicAuthor({ userId: null, userEmail: "Guest" })).toBe("Guest");
  });

  it("falls back to 'user' rather than an empty string", () => {
    expect(toPublicAuthor({ userId: null, userEmail: "" })).toBe("user");
    expect(toPublicAuthor({ userId: "user_123", userEmail: "" })).toBe("user");
  });

  it("never returns a string containing a full address for an authenticated user", () => {
    const out = toPublicAuthor({ userId: "user_1", userEmail: "sensitive.name@corp.example" });
    expect(out).not.toContain("sensitive.name");
    expect(out).toBe("s***@corp.example");
  });
});
