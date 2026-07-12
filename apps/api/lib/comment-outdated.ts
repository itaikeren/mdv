// Line-anchored comments (GitHub-style): the anchor is a static source-line
// range plus a snapshot of the anchored text at comment time. "Outdated" is
// derived on read by re-slicing the current file content and comparing.

const MAX_ANCHOR_TEXT_LENGTH = 2000;

export function computeAnchorText(content: string, startLine: number, endLine: number): string {
  return content
    .split("\n")
    .slice(startLine - 1, endLine)
    .join("\n")
    .slice(0, MAX_ANCHOR_TEXT_LENGTH);
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
