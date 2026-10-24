/** A non-authenticating browser hint used only to choose a login page. */
export const MITTWALD_LOGIN_HINT_COOKIE = "16neun.mailbox-login";

type CustomerLoginRequest = {
  host: string;
  path: string;
  enabled: boolean;
  mailboxLoginHint?: string;
};

/**
 * Keep the original Kurrier admin login on private management hosts.
 * On the public mail domain always show the Mittwald login; on staging,
 * redirect only browsers that previously used Mittwald authentication.
 *
 * This is UX routing, never an authorization or session validity check.
 */
export function shouldRouteToMittwaldLogin({
  host,
  path,
  enabled,
  mailboxLoginHint,
}: CustomerLoginRequest): boolean {
  if (!enabled) return false;

  const hostname = host.trim().toLowerCase().replace(/:\d+$/, "");
  const publicWebmail = hostname === "mail.16neun.com";
  const oldLogin = /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?auth\/login\/?$/i.test(path);
  const entryPage = path === "/" || path === "/distribution";

  if (publicWebmail && (oldLogin || entryPage)) return true;

  return oldLogin && mailboxLoginHint === "1";
}
