import { db, mailboxLoginBindings, users } from "@db";
import { eq } from "drizzle-orm";

/**
 * This lookup must happen ONLY AFTER successful IMAP authentication.
 * Never allow a valid external mailbox to take over an existing local Kurrier
 * administrator/user just because the email addresses happen to match.
 *
 * A binding is created only by a dedicated, trusted provisioning transaction.
 */
export async function resolveVerifiedMailboxBinding(
  authenticatedEmail: string,
): Promise<
  | { kind: "bound"; userId: string }
  | { kind: "new" }
  | { kind: "reserved" }
> {
  const email = authenticatedEmail.trim().toLowerCase();

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const [binding] = await db
    .select({ userId: mailboxLoginBindings.userId })
    .from(mailboxLoginBindings)
    .where(eq(mailboxLoginBindings.mailboxAddress, email))
    .limit(1);

  if (binding) {
    // A missing or conflicting user mapping must fail closed.
    if (!existingUser || existingUser.id !== binding.userId) {
      return { kind: "reserved" };
    }
    return { kind: "bound", userId: binding.userId };
  }

  // Existing users without a mailbox binding are LOCAL accounts.
  // In particular, this protects the pre-existing 16:NEUN admin account.
  if (existingUser) return { kind: "reserved" };
  return { kind: "new" };
}
