// Agent mode: mint a one-time sign-in link for automated testing in dev.
//
// Usage (from repo root):
//   pnpm agent:login
//
// Prints a URL like http://localhost:5173/?__agent_ticket=... — opening it signs
// the browser in as the shared agent test user via a Clerk sign-in ticket, no
// email/password/captcha involved. The ticket is single-use and expires in 10
// minutes. The frontend consumer only exists in dev builds, and this script
// refuses to run against a non-test Clerk instance.
//
// Env overrides: AGENT_EMAIL (default agent@example.com), APP_URL (default
// http://localhost:5173).

const SECRET = process.env.CLERK_SECRET_KEY;

if (!SECRET) {
  console.error("CLERK_SECRET_KEY is not set. Run with: node --env-file=.env.local scripts/agent-login.mjs");
  process.exit(1);
}
if (!SECRET.startsWith("sk_test_")) {
  console.error("Refusing to run: CLERK_SECRET_KEY is not a test-instance key (sk_test_...).");
  process.exit(1);
}

const AGENT_EMAIL = process.env.AGENT_EMAIL || "agent@example.com";
const APP_URL = process.env.APP_URL || "http://localhost:5173";
const API = "https://api.clerk.com/v1";

async function clerk(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Clerk API ${path} failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

// Find or create the agent user
const existing = await clerk(`/users?email_address=${encodeURIComponent(AGENT_EMAIL)}`);
let user = existing[0];
if (!user) {
  user = await clerk("/users", {
    method: "POST",
    body: {
      email_address: [AGENT_EMAIL],
      first_name: "Agent",
      last_name: "Test",
      skip_password_requirement: true,
    },
  });
  console.error(`Created agent user ${AGENT_EMAIL} (${user.id})`);
}

// Mint a single-use sign-in ticket
const token = await clerk("/sign_in_tokens", {
  method: "POST",
  body: { user_id: user.id, expires_in_seconds: 600 },
});

console.log(`${APP_URL}/?__agent_ticket=${token.token}`);
