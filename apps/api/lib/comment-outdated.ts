// Line-anchored comments (GitHub-style): the anchor is a static source-line
// range plus a snapshot of the anchored text at comment time. "Outdated" is
// derived on read by re-slicing the current file content and comparing.

const MAX_ANCHOR_TEXT_LENGTH = 2000;

// Longest span (in source lines) a single comment anchor may cover.
const MAX_ANCHOR_LINES = 200;

function computeAnchorText(content: string, startLine: number, endLine: number): string {
  return content
    .split("\n")
    .slice(startLine - 1, endLine)
    .join("\n")
    .slice(0, MAX_ANCHOR_TEXT_LENGTH);
}

export interface ResolvedAnchor {
  anchorStartLine: number;
  anchorEndLine: number;
  anchorText: string;
}

export type AnchorResolution = { ok: true; anchor: ResolvedAnchor } | { ok: false; error: string };

// Validate a requested line anchor against the CURRENT file content and, when
// valid, snapshot the anchored text. `endLine` defaults to `startLine`. Shared
// by the REST comment route and the MCP `add_comment` tool so both enforce the
// exact same rules (never trust a client-supplied anchorText).
export function resolveAnchor(
  content: string,
  startLine: number,
  endLine?: number,
): AnchorResolution {
  const start = startLine;
  const end = endLine ?? start;

  if (!Number.isInteger(start) || start < 1) {
    return { ok: false, error: "anchorStartLine must be an integer >= 1" };
  }
  if (!Number.isInteger(end) || end < start) {
    return { ok: false, error: "anchorEndLine must be an integer >= anchorStartLine" };
  }
  if (end - start + 1 > MAX_ANCHOR_LINES) {
    return { ok: false, error: `Anchor range must be ${MAX_ANCHOR_LINES} lines or fewer` };
  }

  const fileLineCount = content.split("\n").length;
  if (end > fileLineCount) {
    return { ok: false, error: "Anchor range exceeds the file's current line count" };
  }

  return {
    ok: true,
    anchor: {
      anchorStartLine: start,
      anchorEndLine: end,
      anchorText: computeAnchorText(content, start, end),
    },
  };
}

interface AnchoredComment {
  anchorStartLine: number | null;
  anchorEndLine: number | null;
  anchorText: string | null;
}

export function isCommentOutdated(comment: AnchoredComment, content: string): boolean {
  if (
    comment.anchorStartLine === null ||
    comment.anchorEndLine === null ||
    comment.anchorText === null
  ) {
    return false;
  }

  const lineCount = content.split("\n").length;
  if (comment.anchorEndLine > lineCount) {
    return true;
  }

  return (
    computeAnchorText(content, comment.anchorStartLine, comment.anchorEndLine) !==
    comment.anchorText
  );
}
