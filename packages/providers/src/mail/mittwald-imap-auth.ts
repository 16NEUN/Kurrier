import { ImapFlow } from "imapflow";

/**
 * Verify a Mittwald mailbox password against the provider's IMAP endpoint.
 *
 * This helper deliberately does NOT create an application session, provision an
 * account, persist credentials, or expose arbitrary hostnames to the caller.
 * Those operations require a separate, audited login flow with server-side
 * throttling, ownership checks and secure session handling.
 *
 * The IMAP host is pinned to the configured Mittwald mail infrastructure.
 * Never log credentials or return server errors to the login form.
 */
const IMAP_HOST = "mail.agenturserver.de";
const IMAP_PORT = 993;
const MAX_PASSWORD_LENGTH = 1024;

export function isValidMailboxAddress(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 254 || value.length < 3) {
    return false;
  }
  if (value.trim() !== value || /[\r\n\s]/.test(value)) return false;
  const at = value.lastIndexOf("@");
  return (
    at > 0 &&
    at === value.indexOf("@") &&
    at < value.length - 3 &&
    value.slice(at + 1).includes(".")
  );
}

/**
 * Fail closed: false means authentication was not proved, whether because of
 * invalid credentials or a temporary mail-server outage.
 */
export async function verifyMittwaldImapCredentials(
  mailboxEmail: unknown,
  mailboxPassword: unknown,
): Promise<boolean> {
  if (
    !isValidMailboxAddress(mailboxEmail) ||
    typeof mailboxPassword !== "string" ||
    mailboxPassword.length === 0 ||
    mailboxPassword.length > MAX_PASSWORD_LENGTH
  ) {
    return false;
  }

  const client = new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: true,
    auth: { user: mailboxEmail, pass: mailboxPassword },
    tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });

  try {
    await client.connect();
    return client.authenticated === true;
  } catch {
    // Do not disclose remote server diagnostics, usernames or credentials.
    return false;
  } finally {
    try {
      if (client.authenticated) {
        await client.logout();
      } else {
        await client.close();
      }
    } catch {
      // Cleanup errors must not make an unsuccessful login succeed.
    }
  }
}
