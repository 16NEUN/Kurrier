import { randomUUID } from "node:crypto";
import {
  db,
  getSecretAdmin,
  identities,
  smtpAccounts,
  smtpAccountSecrets,
  updateSecretAdmin,
} from "@db";
import { and, eq } from "drizzle-orm";
import { createSMTPAccount, createEmailIdentity } from "@/lib/actions/email-identity";

const HOST = "mail.agenturserver.de";

function newMailboxConfig(email: string, password: string) {
  return {
    SMTP_HOST: HOST,
    SMTP_PORT: "587",
    SMTP_SECURE: "false",
    SMTP_POOL: "false",
    SMTP_USERNAME: email,
    SMTP_PASSWORD: password,
    IMAP_HOST: HOST,
    IMAP_PORT: "993",
    IMAP_SECURE: "true",
    IMAP_USERNAME: email,
    IMAP_PASSWORD: password,
  };
}

/**
 * Called only after a successful IMAP verification and after server-side
 * session + workspace cookies are established.
 *
 * The workspace and user identities are NEVER inferred from client input.
 * A user's unique verified mailbox can only be attached to their own
 * transactionally provisioned workspace.
 */
export async function ensureVerifiedMittwaldMailbox(
  email: string,
  password: string,
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  const [existing] = await db
    .select({
      id: identities.id,
      smtpAccountId: identities.smtpAccountId,
      ownerId: identities.ownerId,
      workspaceId: identities.workspaceId,
    })
    .from(identities)
    .where(
      and(
        eq(identities.ownerId, userId),
        eq(identities.workspaceId, workspaceId),
        eq(identities.value, email),
        eq(identities.kind, "email"),
      ),
    )
    .limit(1);

  if (existing) {
    if (
      existing.ownerId !== userId ||
      existing.workspaceId !== workspaceId ||
      !existing.smtpAccountId
    ) {
      return false;
    }

    const [entry] = await db
      .select({ secretId: smtpAccountSecrets.secretId })
      .from(smtpAccountSecrets)
      .innerJoin(smtpAccounts, eq(smtpAccounts.id, smtpAccountSecrets.accountId))
      .where(
        and(
          eq(smtpAccountSecrets.accountId, existing.smtpAccountId),
          eq(smtpAccounts.ownerId, userId),
          eq(smtpAccounts.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!entry) return false;
    const { vault } = await getSecretAdmin(entry.secretId);
    const stored = JSON.parse(vault.decrypted_secret) as Record<string, unknown>;

    // Fail closed instead of repointing any unexpected mail connection.
    if (
      stored.SMTP_HOST !== HOST ||
      stored.IMAP_HOST !== HOST ||
      stored.SMTP_PORT !== "587" ||
      stored.IMAP_PORT !== "993" ||
      stored.SMTP_SECURE !== "false" ||
      stored.IMAP_SECURE !== "true" ||
      stored.SMTP_USERNAME !== email ||
      stored.IMAP_USERNAME !== email
    ) {
      return false;
    }

    // This also refreshes encrypted credentials after a Mittwald password change.
    await updateSecretAdmin(entry.secretId, {
      value: JSON.stringify({ ...stored, ...newMailboxConfig(email, password) }),
    });
    return true;
  }

  const [orphanAccount] = await db
    .select({ id: smtpAccounts.id })
    .from(smtpAccounts)
    .where(
      and(eq(smtpAccounts.ownerId, userId), eq(smtpAccounts.workspaceId, workspaceId)),
    )
    .limit(1);
  if (orphanAccount) return false; // Manual repair; never guess ownership.

  const created = await createSMTPAccount({
    ulid: randomUUID(),
    label: `Mittwald (${email})`,
    required: newMailboxConfig(email, password),
  });
  if (!created.success || !created.data?.accountId) return false;

  const identity = await createEmailIdentity({
    email,
    displayName: email,
    smtpAccountId: created.data.accountId,
  });

  return identity.success === true;
}
