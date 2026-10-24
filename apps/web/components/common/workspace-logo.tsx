import KurrierLogo from "@/components/common/kurrier-logo";
import { fetchWorkspace } from "@/lib/actions/workspace";
import { isMittwaldMailboxCustomer } from "@/lib/mittwald-access";
import { Mail } from "lucide-react";

export default async function WorkspaceLogo() {
    const workspace = await fetchWorkspace();
    if (await isMittwaldMailboxCustomer()) {
        return (
            <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#55b8b6] text-white">
                    <Mail className="size-5" aria-hidden="true" />
                </span>
                <span className="truncate text-lg font-semibold">16:NEUN Webmail</span>
            </div>
        );
    }


    return (
        <div className="flex min-w-0 items-center gap-2">
            {workspace.logoKey ? (
                <img
                    src={`/api/workspaces/${encodeURIComponent(workspace.publicId)}/logo?v=${encodeURIComponent(workspace.logoKey.split("/").at(-1) ?? "")}`}
                    alt=""
                    className="size-9 shrink-0 rounded-lg object-contain"
                />
            ) : (
                <KurrierLogo size={36} />
            )}
            <span className="truncate text-lg font-semibold">
                {workspace.name}
            </span>
        </div>
    );
}
