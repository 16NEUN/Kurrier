import { notFound } from "next/navigation";
import { MittwaldMailboxLoginForm } from "@/components/auth/mittwald-mailbox-login-form";

// Feature flags are read at runtime, never during static prerender.
export const dynamic = "force-dynamic";

/** Customer-only route. The existing admin login remains separate. */
export default function MailLoginPage() {
  if (
    process.env.ENABLE_MITTWALD_MAILBOX_LOGIN !== "true" ||
    !process.env.MITTWALD_ALLOWED_MAILBOXES?.trim()
  ) {
    notFound();
  }

  return <MittwaldMailboxLoginForm />;
}
