# 16:NEUN Webmail — isolated staging

This directory holds a **non-public test stack** for the modified Kurrier
fork. Do not deploy it directly to production.

## Separation rules

- Source checkout: `/opt/kurrier-staging-src`, not `/opt/kurrier`.
- Secrets/initial SQL: `/opt/kurrier-staging-runtime` with mode 0700.
- Compose project `mail16neun-staging` and dedicated named volumes.
- No explicit container names: staging never takes over `app-postgres`
  or `garage` from production.
- Staging HTTP: `127.0.0.1:3011` (connectivity checks only).
- Staging HTTPS: `127.0.0.1:3443` (internal Caddy CA, self-signed).
- PostgreSQL, Redis, Typesense and Garage have **no host ports**.
- Baikal/Nextcloud/PHP are deliberately not part of the staging stack.
- `ENABLE_MITTWALD_MAILBOX_LOGIN=false` and `DISABLE_SIGNUP=true`
  by default; the IMAP customer login is inaccessible until explicitly
  enabled for known test mailbox addresses.
- Do not use real customer mailboxes in staging. Never reuse production
  secrets, DB data or volumes.

## Preflight — do NOT execute without confirming CI builds first

On `hostingsrv` check available disk, CPU, SSH connectivity and ensure
loopback ports 3011 and 3443 are free.

Clone the feature branch into a new checkout:
```bash
sudo git clone --single-branch \
  --branch feature/16neun-mittwald-webmail \
  https://github.com/16NEUN/Kurrier.git /opt/kurrier-staging-src
```

Generate secrets and an isolated PostgreSQL initializer:
```bash
sudo python3 /opt/kurrier-staging-src/ops/staging/prepare.py
```

The script refuses to overwrite an existing runtime folder. It does not
print credentials. Never commit its outputs.

Validate configuration and **loopback-only** exposed ports:
```bash
cd /opt/kurrier-staging-src
sudo docker compose -f ops/staging/compose.yml \
  --env-file /opt/kurrier-staging-runtime/staging.env config -q
```

Then, after a successful image-build CI and an explicit decision to start
staging, build from source and bring up ONLY the staging project:
```bash
sudo docker compose -f ops/staging/compose.yml \
  --env-file /opt/kurrier-staging-runtime/staging.env \
  build web worker

sudo docker compose -f ops/staging/compose.yml \
  --env-file /opt/kurrier-staging-runtime/staging.env \
  up -d postgres redis typesense garage

sudo docker compose -f ops/staging/compose.yml \
  --env-file /opt/kurrier-staging-runtime/staging.env \
  --profile tools run --rm migrate

sudo docker compose -f ops/staging/compose.yml \
  --env-file /opt/kurrier-staging-runtime/staging.env \
  up -d web worker local-https
```

**No public DNS / Nginx changes** are required. New test resources are
isolated, but container builds and mail synchronizations consume resources
on `hostingsrv`; monitor server load.

## Test access (only after private staging starts)

From the CloudPC, create an SSH local forwarding tunnel with the already
verified, individually authorized private key:
```powershell
ssh -i "$env:USERPROFILE\.ssh\<authorized-private-key>" -o IdentitiesOnly=yes -N `
  -L 3443:127.0.0.1:3443 <ssh-user>@<hostingsrv-tailnet-address>
```

Open `https://localhost:3443` in the CloudPC browser. This is a **local
staging-only certificate** signed by Caddy's internal CA; it is not a
publicly trusted Let's Encrypt certificate. Do not install the test CA as
a general-purpose trusted enterprise root.

For test logins **only**, edit the private staging env file locally,
set `ENABLE_MITTWALD_MAILBOX_LOGIN=true` and add an explicit comma-separated
test-only `MITTWALD_ALLOWED_MAILBOXES` list. Then recreate only staging
web and re-check port isolation. Never enable this on production yet.

## Release blockers

- Build and TypeScript CI green; migrations exercised against fresh DB.
- Verify real IMAP login, SMTP send/reply and worker sync with two independently
  owned, disposable test mailboxes.
- Verify server actions and API endpoints deny access to platform management,
  API keys, credentials and other users' identities. A UI redirect alone
  is not authorization.
- Verify failure recovery, invalid password, expired sessions, password change
  and revocation, SMTP failures, Redis outage, CSRF and brute-force defenses.
- Add per-client IP controls at the eventual trusted HTTPS reverse proxy.
- Complete native German localization and AGPL attribution/source access.
- Document tested backup/restore before any migration to production.

## Teardown safety

Stop ONLY the staging project:
```bash
cd /opt/kurrier-staging-src
sudo docker compose -f ops/staging/compose.yml \
  --env-file /opt/kurrier-staging-runtime/staging.env down
```

`down` without `--volumes` preserves stage data. Do not run `docker system
prune`, `docker volume prune` or `down --volumes` on a shared host.
