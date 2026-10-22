-- Internal-only link between a verified Mittwald mailbox and a dedicated
-- Kurrier user. The local administrator is never auto-linked by email.
CREATE TABLE IF NOT EXISTS auth.mailbox_login_bindings (
  mailbox_address text PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mailbox_login_address_normalized
    CHECK (mailbox_address = lower(mailbox_address))
);

ALTER TABLE auth.mailbox_login_bindings ENABLE ROW LEVEL SECURITY;

-- No RLS policies for the unprivileged kurrier role: trusted login code
-- must use the database owner/privileged server-side DB connection.
