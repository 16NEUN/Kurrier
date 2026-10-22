#!/usr/bin/env python3
"""Create strictly separate 16:NEUN Webmail staging secrets and SQL.

Run as root on the intended staging host. Refuses to overwrite any output.
Never prints generated credentials. Do not store the output in the git checkout.
"""
from pathlib import Path
import base64
import os
import re
import secrets
import sys

SOURCE = Path(__file__).resolve().parents[2]
RUNTIME = Path("/opt/kurrier-staging-runtime")
TEMPLATE = SOURCE / "db/example.env"
INIT_SQL = SOURCE / "db/init/init.sql"
GARAGE_CONFIG = SOURCE / "db/init/garage/garage.toml"

if os.geteuid() != 0:
    sys.exit("STOP: run this on the staging host with sudo")
if RUNTIME.exists():
    sys.exit("STOP: staging runtime already exists; never overwrite secrets")
for p in (TEMPLATE, INIT_SQL, GARAGE_CONFIG):
    if not p.is_file():
        sys.exit(f"STOP: required upstream template missing: {p.name}")

def secret() -> str:
    return secrets.token_urlsafe(36)

postgres_password = secret()
rls_password = secret()
garage_key = secrets.token_hex(16)
garage_password = secret()
sql = INIT_SQL.read_text()
if sql.count("replace_with_your_password") != 1:
    sys.exit("STOP: unexpected SQL password template")
sql = sql.replace("replace_with_your_password", rls_password)
sql += """
CREATE TABLE IF NOT EXISTS public.migrations (
  version text PRIMARY KEY,
  applied_at timestamptz DEFAULT now()
);
INSERT INTO public.migrations(version) VALUES ('001_migration')
ON CONFLICT DO NOTHING;
"""

values = {
    "WEB_URL": "https://localhost:3443",
    "WEB_PORT": "3000",
    "NITRO_PORT": "3001",
    "POSTGRES_USER": "postgres",
    "POSTGRES_PASSWORD": postgres_password,
    "POSTGRES_DB": "postgres",
    "DATABASE_URL": f"postgresql://postgres:{postgres_password}@postgres:5432/postgres",
    "DATABASE_RLS_URL": f"postgresql://kurrier:{rls_password}@postgres:5432/postgres",
    "REDIS_PASSWORD": secret(),
    "REDIS_HOST": "redis",
    "REDIS_PORT": "6379",
    "TYPESENSE_API_KEY": secret(),
    "TYPESENSE_HOST": "typesense",
    "TYPESENSE_PORT": "8108",
    "TYPESENSE_PROTOCOL": "http",
    "SEARCH_REBUILD_ON_BOOT": "false",
    "JWT_SECRET": secret(),
    "APP_SECRET_ENCRYPTION_KEY": base64.b64encode(secrets.token_bytes(32)).decode(),
    "DISABLE_DRIVE": "true",
    "DISABLE_LOCAL_LOGIN": "false",
    "DISABLE_SIGNUP": "true",
    "ENABLE_MITTWALD_MAILBOX_LOGIN": "false",
    "MITTWALD_ALLOWED_MAILBOXES": "",
    "DAV_URL": "http://dav",
    "WORKER_URL": "http://worker:3001",
    "GARAGE_ACCESS_KEY": garage_key,
    "GARAGE_SECRET_KEY": garage_password,
    "GARAGE_RPC_SECRET": secrets.token_hex(32),
    "GARAGE_BUCKET": "kurrier-stage",
    "S3_ENDPOINT": "http://garage:3900",
    "S3_ACCESS_KEY": garage_key,
    "S3_SECRET_KEY": garage_password,
    "S3_REGION": "garage",
    "S3_BUCKET": "kurrier-stage",
    "S3_FORCE_PATH_STYLE": "true",
    "STAGING_ENV_FILE": str(RUNTIME / "staging.env"),
    "STAGING_RUNTIME_DIR": str(RUNTIME),
    "CUSTOM_EMAIL_PROVIDERS": "[]",
}

contents = []
seen = set()
for line in TEMPLATE.read_text().splitlines():
    m = re.match(r"^([A-Z][A-Z_0-9]*)=(.*)$", line)
    if m and m.group(1) in values:
        key = m.group(1)
        contents.append(f"{key}={values[key]}")
        seen.add(key)
    else:
        contents.append(line)
for key, value in values.items():
    if key not in seen:
        contents.append(f"{key}={value}")

os.umask(0o077)
RUNTIME.mkdir(mode=0o700, parents=False)
try:
    def write_private(name: str, data: str) -> None:
        p = RUNTIME / name
        with p.open("x", encoding="utf-8") as f:
            f.write(data)
        p.chmod(0o600)
    write_private("staging.env", "\n".join(contents) + "\n")
    write_private("postgres-init.sql", sql)
    write_private("garage.toml", GARAGE_CONFIG.read_text())
except Exception:
    print("ERROR: incomplete runtime setup — do not start staging", file=sys.stderr)
    raise

print("OK: isolated staging secrets and SQL created")
print(f"Runtime: {RUNTIME}")
print("Public enrollment: DISABLED")
print("Mittwald customer login: DISABLED")
print("No credentials printed")
