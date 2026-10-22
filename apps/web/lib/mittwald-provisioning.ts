import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import {
  db,
  identities,
  mailboxLoginBindings,
  users,
  workspaceMembers,
  workspaces,
} from "@db";
import { eq, sql } from "drizzle-orm";
import { isValidMailboxAddress } from "@providers/mail/mittwald-imap-auth";

/**
 * Only invoke this AFTER the pinned Mittwald IMAP server has authenticated the
 * presented password. This function itself does NOT authenticate callers.
 *
 * A local Kurrier admin or any unbound existing user is never linked by email.
 * Creation is transactionally serialized per address so competing first
 * logins cannot create or gain access to someone else's workspace.
 */
export async function provisionVerifiedMailboxUser(
  verifiedMailboxAddress: string,
): Promise<{ userId: string; workspaceId: string; created: boolean }> {
  const email = verifiedMailboxAddress.trim().toLowerCase();
  if (!isValidMailboxAddress(email)) {
    throw new Error("MAILBOX_LOGIN_UNAVAILABLE");
  }

  return db.transaction(async (tx) => {
    // Lock by mailbox address for the lifetime of the transaction.
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${email}, 0))`,
    );

    const [binding] = await tx
      .select({ userId: mailboxLoginBindings.userId })
      .from(mailboxLoginBindings)
      .where(eq(mailboxLoginBindings.mailboxAddress, email))
      .limit(1);

    const [existingUser] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (binding) {
      // Fail closed for corrupted mappings and for any other local accounts.
      if (!existingUser || binding.userId !== existingUser.id) {
        throw new Error("MAILBOX_LOGIN_UNAVAILABLE");
      }

      const [workspace] = await tx
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.ownerId, binding.userId))
        .limit(1);

      if (!workspace) throw new Error("MAILBOX_LOGIN_UNAVAILABLE");

      return { userId: binding.userId, workspaceId: workspace.id, created: false };
    }

    // Never convert the existing local admin (or any local account) to IMAP
    // authentication simply because its address is also on Mittwald.
    if (existingUser) throw new Error("MAILBOX_LOGIN_UNAVAILABLE");

    const disabledLocalPassword = await argon2.hash(
      randomBytes(48).toString("base64url"),
    );

    const [user] = await tx
      .insert(users)
      .values({ email, passwordHash: disabledLocalPassword })
      .returning({ id: users.id });

    const [workspace] = await tx
      .insert(workspaces)
      .values({
        name: email,
        ownerId: user.id,
        theme: "teal",
      })
      .returning({ id: workspaces.id });

    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
    });

    // Unique mailbox_address and user_id constraints defend against races.
    await tx.insert(mailboxLoginBindings).values({
      mailboxAddress: email,
      userId: user.id,
    });

    return { userId: user.id, workspaceId: workspace.id, created: true };
  });
}
