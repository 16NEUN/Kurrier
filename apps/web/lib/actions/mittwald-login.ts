"use server";

import { db, users } from "@db";
import { verifyMittwaldImapCredentials, isValidMailboxAddress } from "@providers";
import { FormState } from "@schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionForUser, getWorkspaceRedirectUrl, initializeProvisionedMailboxWorkspace } from "@/lib/actions/auth";
import {
  allowMittwaldLoginAttempt,
  isMittwaldLoginEnabledFor,
} from "@/lib/mittwald-login-policy";
import { provisionVerifiedMailboxUser } from "@/lib/mittwald-provisioning";
import { ensureVerifiedMittwaldMailbox } from "@/lib/mittwald-mailbox-account";
import { withLocale } from "@/lib/utils";

const LOGIN_ERROR = "Die Anmeldung ist fehlgeschlagen. Bitte Zugangsdaten prüfen.";
const SESSION_LIFETIME_SECONDS = 4 * 60 * 60;

/**
 * Separate, opt-in Mittwald customer login.
 *
 * The existing Kurrier local administrator login remains unchanged.
 * This entry point is unavailable unless both the feature flag and an
 * explicit mailbox allowlist are configured. No account can be provisioned
 * without a successful, TLS-validated Mittwald IMAP authentication.
 */
export async function loginWithMittwald(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const rawEmail = formData.get("email");
  const password = formData.get("password");
  if (
    !isValidMailboxAddress(rawEmail) ||
    typeof password !== "string" ||
    password.length === 0 ||
    password.length > 1024
  ) {
    return { success: false, error: LOGIN_ERROR };
  }

  const email = rawEmail.toLowerCase();
  if (!isMittwaldLoginEnabledFor(email)) {
    return { success: false, error: LOGIN_ERROR };
  }

  if (!(await allowMittwaldLoginAttempt(email))) {
    return { success: false, error: LOGIN_ERROR };
  }

  if (!(await verifyMittwaldImapCredentials(email, password))) {
    return { success: false, error: LOGIN_ERROR };
  }

  let target: string | null = null;
  let issuedSession = false;
  try {
    const identity = await provisionVerifiedMailboxUser(email);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, identity.userId))
      .limit(1);

    if (!user) return { success: false, error: LOGIN_ERROR };

    if (identity.created) {
      await initializeProvisionedMailboxWorkspace(user.id, identity.workspaceId, email);
    }

    // Short-lived, server-only session; never place Mittwald passwords in JWTs.
    await createSessionForUser(user.id, SESSION_LIFETIME_SECONDS);
    issuedSession = true;

    // The existing Kurrier actions require workspace context in secure cookies.
    await getWorkspaceRedirectUrl(user);

    const ready = await ensureVerifiedMittwaldMailbox(
      email,
      password,
      user.id,
      identity.workspaceId,
    );

    if (ready) {
      // After first provision, this resolves to the actual user's inbox.
      target = await getWorkspaceRedirectUrl(user);
    }
  } catch {
    // No remote or database error details are shown to unauthenticated users.
  }

  if (!target) {
    if (issuedSession) {
      (await cookies()).delete("session");
    }
    return { success: false, error: LOGIN_ERROR };
  }

  redirect(withLocale("de", target));
}
