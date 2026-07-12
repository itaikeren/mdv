// Author display + email masking for comments. Older comments stored the
// author's full email in `userEmail`; newer comments store a display name at
// creation time. These helpers keep the public projection consistent between
// the REST comment route and the MCP `get_comments` tool so an email is never
// leaked from either surface.

// "john@example.com" -> "j***@example.com"
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "";
  return `${email[0]}***@${email.slice(at + 1)}`;
}

// Public-safe author string for a stored comment.
export function toPublicAuthor(comment: { userId: string | null; userEmail: string }): string {
  if (comment.userId && comment.userEmail.includes("@")) {
    return maskEmail(comment.userEmail) || "user";
  }
  return comment.userEmail || "user";
}
