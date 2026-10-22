import "server-only";

import { db, mailboxLoginBindings } from "@db";
import { eq } from "drizzle-orm";
import { isSignedIn } from "@/lib/actions/auth";

/** The account class comes from a server-side login binding, not cookies. */
export async function isMittwaldMailboxCustomer(): Promise<boolean> {
  const user = await isSignedIn();
  if (!user) return false;
  const [binding] = await db
    .select({ userId: mailboxLoginBindings.userId })
    .from(mailboxLoginBindings)
    .where(eq(mailboxLoginBindings.userId, user.id))
    .limit(1);
  return Boolean(binding);
}

/**
 * Guard sensitive platform server functions; hiding links is not authorization.
 * This is only one layer of the required full server-action and API review.
 */
export async function requireKurrierPlatformAdministrator(): Promise<void> {
  const user = await isSignedIn();
  if (!user) throw new Error("Not authenticated");
  if (await isMittwaldMailboxCustomer()) {
    throw new Error("Platform administration is unavailable");
  }
}
