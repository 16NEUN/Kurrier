# 16:NEUN Webmail — Mittwald login

Branch: `feature/16neun-mittwald-webmail`  
Status: **feature-gated development, not approved for customer access**  
Upstream baseline: `855add7`; repository: `16NEUN/Kurrier`

## Goal

- Customer logs in using **the existing Mittwald mailbox email address and password**.
- No customer-managed Kurrier password and no public signup.
- The first successful login transparently creates a separate, private user and workspace.
- One mailbox owner must never gain access to another customer's mailbox or to
  the existing local Kurrier administrator.
- IMAP: `mail.agenturserver.de:993`, authenticated with verified TLS.
- SMTP: `mail.agenturserver.de:587`, STARTTLS (not implicit TLS).
- Branded, German-language UI on `https://mail.16neun.com`.
- Administration remains separate from the customer mailbox interface.

## Implemented in development

- Fixed-host TLS-verified IMAP credential verification and fail-closed errors.
- Explicit mailbox allowlist, disabled-by-default feature flag and Redis
  sliding-window-style fixed-window attempt counter.
- Atomic user/workspace/login-binding creation with advisory transaction lock.
- Existing local user/address collision is rejected, including case variants.
- Internal password is random and unknown to customers.
- Restricted four-hour mailbox session; original local admin login unchanged.
- Auto-provisioning or encrypted password refresh for the owner's own mailbox;
  server settings pinned to Mittwald, not taken from client form.
- Existing signup initialization jobs queued for new users.
- Branded `/de/auth/mail` login; exact-host homepage redirect only under
  `mail.16neun.com` with the feature enabled.
- Bound mailbox accounts redirected away from the platform administration UI.
- Partial native German language support: login, common actions, key mail
  strings. Other untranslated content still falls back to English.
- Offline IMAP validation tests, allowlist tests and TypeScript CI.

## Feature gates (do NOT configure on production yet)

```dotenv
ENABLE_MITTWALD_MAILBOX_LOGIN=false
MITTWALD_ALLOWED_MAILBOXES=
DISABLE_SIGNUP=true
```

The page returns 404 unless the feature is enabled and a nonempty allowlist
exists. For a *fully isolated staging instance only*, set the flag to `true`
and include only your own test mailbox addresses, comma-separated. Never
commit real mailbox addresses, passwords, env files or customer data.

## Critical pre-release verification

1. Build from the branch with the full monorepo CI; test against a separate
   staging database and volumes, **not** the live Kurrier database.
2. Apply `012_migration.sql` to staging only and confirm binding RLS and
   constraints; restore a staging backup successfully.
3. Two unrelated Mittwald test mailboxes: login, inbox, send/reply, attachments,
   folders, credential rotation, logout, expired session.
4. Confirm a Mittwald mailbox address equal (case-insensitively) to a
   pre-existing local Kurrier administrator **cannot** take over that account.
5. Attempt direct URLs and server actions as a customer: platform tools,
   workspace switching, API keys, account export and other users' identities
   must be prohibited. The current platform UI guard alone is not sufficient
   to close privileged server actions.
6. Rate-limit load/abuse tests and trusted-proxy client-IP throttling at Nginx.
   Deny on Redis failure. Review account recovery / revoked mailboxes.
7. Review behavior if SMTP is down while IMAP works; verify queued workers
   process backfill and prevent accidental duplicate accounts.
8. Complete all German translations and test desktop/mobile.
9. Restrict the old local admin login route at the reverse proxy to authorized
   management access; do not expose it to the public.
10. Check AGPL-3.0-or-later network-use source availability and license notices.
11. Only then build and pin 16:NEUN images, do a staged deployment, migrate the
    tested production DB, switch DNS for `mail.16neun.com` and monitor.

**Do not deploy or activate the current feature branch on `hostingsrv`.**
The existing official Kurrier v4.3.0 instance remains unmodified and exposed
only via SSH forwarding.
