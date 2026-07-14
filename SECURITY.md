# Security Policy

## Reporting a vulnerability

**Please do not open a public issue for a security bug.**

Report it privately through
[GitHub Security Advisories](https://github.com/itaikeren/mdv/security/advisories/new),
which lets us discuss and fix the issue before any details are published.

Please include what you found, how to reproduce it, and what an attacker could achieve.
We will acknowledge your report, keep you updated as we work on a fix, and credit you when
the advisory is published — unless you would rather stay anonymous.

## Scope

The hosted instance is **https://mdv.itai.sh**. Findings in the code here that also affect
self-hosted deployments are in scope.

Areas worth the most scrutiny:

- **Share links** — a share token grants read access to a document to anyone holding it.
  Anything that lets a token be guessed, enumerated, or leaked is a real issue.
- **MCP API keys** (`mdv_...`) — only a sha256 hash is stored, and a key is scoped `docs` or
  `full`. Any way to use a `docs` key for a `full`-scoped action is in scope.
- **Cross-user access** — reading, updating, or deleting a document, share, or comment
  belonging to another user.
- **Comments** — anonymous commenting is allowed on shares that enable it. Stored XSS or
  markdown-rendering escapes are in scope.

## Not in scope

- **Rate limits and storage quotas.** These are anti-abuse measures, not security
  boundaries, and rate limiting deliberately **fails open** — if the database errors, the
  request is allowed. Reports that a limit can be exceeded, or that the fail-open behavior
  exists, are working as designed. Reports of a *bypass that enables real abuse* are welcome.
- **Dev-only agent auth** (`?__agent_ticket=`). This is guarded by `import.meta.env.DEV`, is
  tree-shaken out of production builds, and its login script refuses non-test Clerk keys.
  If you can reach it on a production build, that **is** in scope — please tell us.
- Missing hardening headers with no demonstrated impact, and findings from automated
  scanners without a working proof of concept.

## Supported versions

This is a single actively developed branch (`main`). Fixes land there; there are no
backported release branches.
