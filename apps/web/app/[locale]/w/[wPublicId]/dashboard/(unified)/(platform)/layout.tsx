import { db, mailboxLoginBindings } from "@db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDefaultWorkspacePath, isSignedIn } from "@/lib/actions/auth";
import { withLocale } from "@/lib/utils";
import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import {getWorkspacePublicId} from "@/lib/actions/clients";
import {Suspense} from "react";
import Loading from "@/app/loading";
import NavUserWrapper from "@/components/ui/dashboards/workspace/nav-user-wrapper";
import * as React from "react";
import NavMainWrapper from "@/components/nav-main-wrapper";
import WorkspaceLogo from "@/components/common/workspace-logo";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
  // Customer-only Mittwald sessions cannot open Kurrier's platform panel.
  // The mail UI is separate from the platform administration.
  const signedIn = await isSignedIn();
  if (signedIn) {
    const [mailboxUser] = await db
      .select({ userId: mailboxLoginBindings.userId })
      .from(mailboxLoginBindings)
      .where(eq(mailboxLoginBindings.userId, signedIn.id))
      .limit(1);
    if (mailboxUser) {
      const inboxPath = await getDefaultWorkspacePath(signedIn);
      if (!inboxPath.includes("/dashboard/mail/")) {
        throw new Error("Mailbox is not ready");
      }
      redirect(withLocale("de", inboxPath));
    }
  }

	const workspacePublicId = await getWorkspacePublicId()

	return (
		<>
			<AppSidebar
				sidebarTopContent={
					<Suspense fallback={<div className="h-9" />} key={workspacePublicId}>
						<WorkspaceLogo />
					</Suspense>
				}
				workspacePublicId={workspacePublicId}
				sidebarSectionContent={
					<Suspense fallback={<Loading />} key={workspacePublicId}>
						<NavMainWrapper />
					</Suspense>}
				navUserContent={<Suspense key={workspacePublicId} fallback={<Loading />}><NavUserWrapper /></Suspense>}
			/>
			<SidebarInset>{children}</SidebarInset>
		</>
	);
}
