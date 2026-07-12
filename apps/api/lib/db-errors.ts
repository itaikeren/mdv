// Postgres error-code helpers shared by routes.

// True when `err` is a unique-constraint violation (SQLSTATE 23505) — the
// DB-level backstop behind our check-then-write uniqueness validations.
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}
