import { safeEqual } from "@/lib/admin-session";
import { OpsError, TOOLS, type ToolName } from "@/lib/ops";

// FiveTap operations for Claude, as a remote MCP server (Streamable HTTP, JSON replies).
// Only whoever holds OPS_TOKEN (set in Vercel, never in the code) can call it.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const INSTRUCTIONS = `Eres el asistente operativo de FiveTap. Reglas:
1. Antes de cambiar algo, identifica el negocio con find_business y confirma con el fundador si hay más de un resultado o cualquier duda.
2. No inventes datos (nombres, precios, redes, horarios, promociones): usa solo lo que el fundador te dio. Si falta algo, pregunta.
3. Los cambios de la experiencia quedan en borrador: muestra preview_url y publica (publish_experience) solo cuando el fundador lo apruebe explícitamente.
4. Las acciones importantes piden confirm_business_name: escribe el nombre exacto del negocio, nunca lo adivines.
5. No puedes cambiar precios ni planes de un negocio existente, borrar negocios ni ver pagos: eso se hace en el panel Founder.
6. Si una red social o un enlace genera dudas, muéstralo al fundador para que lo verifique antes de publicar.`;

type Rpc = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };
const reply = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const error = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function handle(m: Rpc) {
  switch (m.method) {
    case "initialize": {
      const asked = typeof m.params?.protocolVersion === "string" ? (m.params.protocolVersion as string) : "2025-06-18";
      return reply(m.id, { protocolVersion: asked, capabilities: { tools: { listChanged: false } }, serverInfo: { name: "fivetap-ops", version: "1.0.0" }, instructions: INSTRUCTIONS });
    }
    case "ping":
      return reply(m.id, {});
    case "tools/list":
      return reply(m.id, { tools: (Object.keys(TOOLS) as ToolName[]).map((name) => ({ name, description: TOOLS[name].description, inputSchema: TOOLS[name].inputSchema })) });
    case "tools/call": {
      const name = String(m.params?.name ?? "") as ToolName;
      const tool = TOOLS[name];
      if (!tool) return error(m.id, -32602, `Herramienta desconocida: ${name}`);
      try {
        const out = await tool.run((m.params?.arguments ?? {}) as Record<string, unknown>);
        return reply(m.id, { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] });
      } catch (e) {
        const msg = e instanceof OpsError || e instanceof Error ? e.message : "Error inesperado";
        return reply(m.id, { content: [{ type: "text", text: msg }], isError: true });
      }
    }
    default:
      return m.id === undefined ? null : error(m.id, -32601, `Método no soportado: ${m.method}`);
  }
}

export async function POST(req: Request) {
  const token = process.env.OPS_TOKEN;
  if (!token || token.length < 32) return new Response("FiveTap Ops cerrado: falta OPS_TOKEN.", { status: 503 });
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ") || !safeEqual(auth.slice(7).trim(), token)) {
    return new Response("No autorizado", { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }
  let body: Rpc | Rpc[];
  try {
    body = await req.json();
  } catch {
    return Response.json(error(null, -32700, "JSON no válido"), { status: 400 });
  }
  const list = Array.isArray(body) ? body : [body];
  const out = (await Promise.all(list.map(handle))).filter(Boolean);
  if (!out.length) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(body) ? out : out[0]);
}

export function GET() {
  return new Response("Usa POST (MCP Streamable HTTP).", { status: 405, headers: { Allow: "POST" } });
}
