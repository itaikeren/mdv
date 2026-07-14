import { describe, expect, it } from "vitest";
import { isCommentOutdated, resolveAnchor } from "./comment-outdated.js";

const DOC = "line one\nline two\nline three\nline four";

// resolveAnchor validates client-supplied line anchors (REST + MCP `add_comment`)
// and snapshots the anchored text itself — the client's anchorText is never trusted.

describe("resolveAnchor", () => {
  it("resolves a single line and snapshots its text", () => {
    const r = resolveAnchor(DOC, 2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.anchor).toEqual({ anchorStartLine: 2, anchorEndLine: 2, anchorText: "line two" });
  });

  it("defaults endLine to startLine", () => {
    const r = resolveAnchor(DOC, 3);
    expect(r.ok && r.anchor.anchorEndLine).toBe(3);
  });

  it("snapshots a multi-line range inclusively", () => {
    const r = resolveAnchor(DOC, 2, 3);
    expect(r.ok && r.anchor.anchorText).toBe("line two\nline three");
  });

  it("anchors the final line (off-by-one boundary)", () => {
    const r = resolveAnchor(DOC, 4, 4);
    expect(r.ok && r.anchor.anchorText).toBe("line four");
  });

  it("rejects a range past the end of the file", () => {
    const r = resolveAnchor(DOC, 4, 5);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/line count/i);
  });

  it("rejects a non-positive or non-integer start line", () => {
    expect(resolveAnchor(DOC, 0).ok).toBe(false);
    expect(resolveAnchor(DOC, -1).ok).toBe(false);
    expect(resolveAnchor(DOC, 1.5).ok).toBe(false);
    expect(resolveAnchor(DOC, NaN).ok).toBe(false);
  });

  it("rejects an end line before the start line", () => {
    const r = resolveAnchor(DOC, 3, 2);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/anchorEndLine/);
  });

  it("caps the anchor span at 200 lines", () => {
    const long = Array.from({ length: 500 }, (_, i) => `l${i}`).join("\n");
    expect(resolveAnchor(long, 1, 200).ok).toBe(true);
    const tooLong = resolveAnchor(long, 1, 201);
    expect(tooLong.ok).toBe(false);
    expect(!tooLong.ok && tooLong.error).toMatch(/200 lines or fewer/);
  });

  it("truncates the snapshot at 2000 characters", () => {
    const huge = ["x".repeat(5000), "next"].join("\n");
    const r = resolveAnchor(huge, 1);
    expect(r.ok && r.anchor.anchorText.length).toBe(2000);
  });
});

// "Outdated" is derived on read: re-slice the current content and compare it to
// the snapshot taken when the comment was written.

describe("isCommentOutdated", () => {
  const anchored = { anchorStartLine: 2, anchorEndLine: 2, anchorText: "line two" };

  it("is false when the anchored text is unchanged", () => {
    expect(isCommentOutdated(anchored, DOC)).toBe(false);
  });

  it("is true when the anchored line's text changed", () => {
    const edited = DOC.replace("line two", "line 2 (edited)");
    expect(isCommentOutdated(anchored, edited)).toBe(true);
  });

  it("is true when a line is inserted above, shifting the anchor", () => {
    expect(isCommentOutdated(anchored, `new first\n${DOC}`)).toBe(true);
  });

  it("is true when the file shrank past the anchor", () => {
    expect(isCommentOutdated(anchored, "line one")).toBe(true);
  });

  it("is false when an unrelated line further down changes", () => {
    expect(isCommentOutdated(anchored, DOC.replace("line four", "line 4!"))).toBe(false);
  });

  it("is false for an unanchored (whole-document) comment", () => {
    expect(
      isCommentOutdated({ anchorStartLine: null, anchorEndLine: null, anchorText: null }, DOC),
    ).toBe(false);
  });
});
