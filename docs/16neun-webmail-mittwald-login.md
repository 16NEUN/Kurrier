# 16:NEUN Webmail: Mittwald mailbox login

Status: **development / not approved for public access**. Branch:
`feature/16neun-mittwald-webmail`. Upstream baseline: `855add7`.

## Intended behavior

- `https://mail.16neun.com` shows a German-language 16:NEUN login.
- The customer supplies their **existing mailbox email address and password**.
- The server validates these only against pinned Mittwald IMAP
  (`mail.agenturserver.de:993`, verified TLS).
- The user needs no separately managed Kurrier password. A private
  Kurrier account/workspace is provisioned internally after verified IMAP
  authentication, with an unusable random local password.
- One authenticated mailbox owner gets only their own data. Mailbox
  provisioning, password rotation, reauthentication, rate limiting, anti-CSRF,
  session lifetime, and user/workspace isolation require integration tests.
- Existing platform admin must **not** be granted access merely because an
  external mailbox uses the same email address. Existing local users are
  never silently linked to IMAP users.
- SMTP uses `mail.agenturserver.de:587` with STARTTLS and TLS certificate
  verification; inbound IMAP uses port 993 with implicit TLS.
- Registration remains disabled (`DISABLE_SIGNUP=true`) in production.
  The administrative login must be reachable only through separately
  controlled access. User credentials must not be logged.
- Self-service password resets do not reset Mittwald passwords.
- The app must not be publicly available before a security review, multi-user
  isolation tests, replay/CSRF checks, and a documented backup/restore test.

## Completed in first development slice

- Pinned-host, TLS-verified IMAP credential verification helper.
- Input bounds and fail-closed behavior; no session or persistent secret
  changes.
- Basic validation unit tests.

## Further implementation required

1. Dedicated feature-gated 16:NEUN login route and branded sign-in UI.
2. Persisted identity mapping between verified mailbox and internal account;
   keep current local administrator separate.
3. Server-side request throttling and generic authentication errors.
4. Provision and reconnect one isolated workspace and mailbox per user;
   update encrypted connection credentials after successful IMAP verification.
5. Force reauthentication on credential change, use shorter sessions, and test
   user revocation/logout behavior.
6. Native German locale (login, mail interface, errors, settings) with
   dictionary completeness checks.
7. Automated unit, integration and adversarial multi-user security tests;
   peer review and a nonproduction deployment before DNS change.

## Licensing

Kurrier is AGPL-3.0-or-later. Any modified network-hosted service must satisfy
the source-availability and appropriate-notice obligations. Do not place
mailbox passwords, `.env`, or customer data in this public repository.
