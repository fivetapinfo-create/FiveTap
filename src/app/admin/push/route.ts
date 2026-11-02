import { subscribeHandler } from "@/lib/push-route";

export const dynamic = "force-dynamic";

// The founder's phones. Behind the panel login (middleware).
const who = () => ({
  role: "founder" as const,
  businessId: null,
  welcome: { title: "FiveTap · Panel", body: "¡Listo! Aquí te llegarán tus pendientes cada mañana y cada queja nueva. 🚀", url: "/admin/agenda" },
});

export const POST = (req: Request) => subscribeHandler(req, who);
export const DELETE = (req: Request) => subscribeHandler(req, who);
