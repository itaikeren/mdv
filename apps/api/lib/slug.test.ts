import { describe, expect, it } from "vitest";
import { SLUG_REGEX, slugify } from "./slug.js";

describe("slugify", () => {
  it("lowercases and hyphenates a file name", () => {
    expect(slugify("Release Notes.md")).toBe("release-notes-md");
  });

  it("collapses runs of non-alphanumerics into a single hyphen", () => {
    expect(slugify("a   b___c!!!d")).toBe("a-b-c-d");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  --hello--  ")).toBe("hello");
  });

  it("strips characters outside [a-z0-9]", () => {
    expect(slugify("Ünïcødé ✨ name")).toBe("n-c-d-name");
  });

  it("caps the length at 32 characters and leaves no trailing hyphen", () => {
    const out = slugify("a".repeat(40));
    expect(out.length).toBe(32);

    // A cut landing on a hyphen must not leave the slug ending in one.
    const cut = slugify(`${"a".repeat(31)} tail`);
    expect(cut.length).toBeLessThanOrEqual(32);
    expect(cut.endsWith("-")).toBe(false);
  });

  it("pads a too-short result so it still satisfies SLUG_REGEX", () => {
    expect(slugify("a")).toBe("a00");
    expect(slugify("ab")).toBe("ab0");
  });

  it("falls back to 'file' when nothing survives", () => {
    expect(slugify("!!!")).toBe("file");
    expect(slugify("")).toBe("file");
  });

  it("always produces output that matches SLUG_REGEX", () => {
    const inputs = [
      "Release Notes.md",
      "a",
      "!!!",
      "  --hello--  ",
      "a".repeat(40),
      "Ünïcødé ✨ name",
      "2024 Q3 — plan",
    ];
    for (const input of inputs) {
      expect(slugify(input), `slugify(${JSON.stringify(input)})`).toMatch(SLUG_REGEX);
    }
  });
});
