import { notFound } from "next/navigation";
import { connection } from "next/server";
import { MittwaldMailboxLoginForm } from "@/components/auth/mittwald-mailbox-login-form";

// Cache Components requires connection() to defer feature checks to runtime.

/** Customer-only route. The existing admin login remains separate. */
export default async function MailLoginPage() {
  await connection();
  if (
    process.env.ENABLE_MITTWALD_MAILBOX_LOGIN !== "true" ||
    !process.env.MITTWALD_ALLOWED_MAILBOXES?.trim()
  ) {
    notFound();
  }

  return <MittwaldMailboxLoginForm />;
}
