import { adminAllowed, notAllowed } from "@/lib/admin-guard";
import { subscribeHandler } from "@/lib/push-route";

export const dynamic = "force-dynamic";

// The founder's phones. Behind the panel login (middleware).
const who = () => ({
  role: "founder" as const,
  businessId: null,
  welcome: { title: "FiveTap · Panel", body: "¡Listo! Aquí te llegarán tus pendientes cada mañana y cada queja nueva.", url: "/admin/agenda" },
});

// Checked here too: these notifications carry the guests' private messages.
export const POST = async (req: Request) => ((await adminAllowed()) ? subscribeHandler(req, who) : notAllowed());
export const DELETE = async (req: Request) => ((await adminAllowed()) ? subscribeHandler(req, who) : notAllowed());
