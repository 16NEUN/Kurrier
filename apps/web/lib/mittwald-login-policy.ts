import { createHmac } from "node:crypto";
import Redis from "ioredis";
import { getServerEnv } from "@schema";

const WINDOW_SECONDS = 15 * 60;
const MAX_PER_MAILBOX = 8;
const MAX_GLOBAL_ATTEMPTS = 300;

const INCREMENT_SCRIPT = `
local user = redis.call("INCR", KEYS[1])
if user == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
local all = redis.call("INCR", KEYS[2])
if all == 1 then redis.call("EXPIRE", KEYS[2], ARGV[1]) end
return { user, all }
`;

/**
 * Server-side bounded login attempts; Redis failures deny authentication.
 * Email addresses are HMACed before being stored as Redis key components.
 *
 * This is a defense in depth, not a substitute for a trusted-proxy
 * per-client-IP limiter at the edge.
 */
export async function allowMittwaldLoginAttempt(email: string): Promise<boolean> {
  const settings = getServerEnv();
  const digest = createHmac("sha256", settings.JWT_SECRET)
    .update(email.trim().toLowerCase())
    .digest("hex");

  const redis = new Redis({
    host: settings.REDIS_HOST,
    port: Number(settings.REDIS_PORT),
    password: settings.REDIS_PASSWORD,
    connectTimeout: 2500,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    const counts = await redis.eval(
      INCREMENT_SCRIPT,
      2,
      `mail-login:email:${digest}`,
      "mail-login:global",
      String(WINDOW_SECONDS),
    );
    if (
      !Array.isArray(counts) ||
      counts.length !== 2 ||
      !counts.every((value) => Number.isSafeInteger(Number(value)))
    ) {
      return false;
    }

    return (
      Number(counts[0]) <= MAX_PER_MAILBOX &&
      Number(counts[1]) <= MAX_GLOBAL_ATTEMPTS
    );
  } catch {
    return false;
  } finally {
    redis.disconnect();
  }
}

/**
 * Public logins are disabled by default. Even when enabled, only explicitly
 * authorized mailboxes may authenticate; this avoids becoming an open login
 * service for unrelated Mittwald customers.
 */
export function isMittwaldLoginEnabledFor(email: string): boolean {
  if (process.env.ENABLE_MITTWALD_MAILBOX_LOGIN !== "true") return false;
  const allowed = (process.env.MITTWALD_ALLOWED_MAILBOXES ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) return false;
  return allowed.includes(email.toLowerCase());
}
