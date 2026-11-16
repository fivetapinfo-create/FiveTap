import "server-only";
import { tierAllows } from "./features";
import { sendPush } from "./push";
import { db } from "./supabase";

// Orders placed by guests from a plaque: they choose from the business's catalog, the
// table comes from the plaque itself, and the order reaches FiveTap Business at once.
// Paid at the venue: FiveTap never charges them. Every query is scoped to one business.

export type OrderStatus = "new" | "preparing" | "ready" | "delivered" | "canceled";
export type OrderLine = { id: string; item_id: string | null; name: string; unit_price: number; qty: number; line_total: number };
export type GuestOrder = {
  id: string; business_id: string; tag_id: string | null; table_label: string | null; number: number; token: string;
  customer_name: string; people: number | null; notes: string | null; status: OrderStatus; total: number; modified: boolean;
  cancel_reason: string | null; created_at: string; updated_at: string; lines: OrderLine[];
};

export const MODULES = { orders: "Pedidos", reservations: "Reservas" } as const;
export type ModuleKey = keyof typeof MODULES;
/** Plans that include the optional modules; others get them when the founder turns them on. */
const PLANS_WITH_MODULES = ["pro", "enterprise"];

/** Whether a business has a module: the founder's switch, or else what its plan includes. */
export function moduleOn(b: { modules?: Record<string, unknown> | null; plan_key?: string | null; tier?: string | null; entitlements?: unknown }, key: ModuleKey) {
  // The module must be on for the business AND included in what it contracted.
  if (!tierAllows(b, key)) return false;
  const v = b.modules?.[key];
  return typeof v === "boolean" ? v : PLANS_WITH_MODULES.includes(b.plan_key ?? "");
}
export const moduleSource = (b: { modules?: Record<string, unknown> | null }, key: ModuleKey) => (typeof b.modules?.[key] === "boolean" ? "manual" : "plan");

export const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { new: "preparing", preparing: "ready", ready: "delivered" };
export const STATUS_LABEL: Record<OrderStatus, string> = { new: "Nuevo", preparing: "En preparación", ready: "Listo", delivered: "Entregado", canceled: "Cancelado" };

const num = (v: unknown) => Number(v ?? 0);
const shape = (o: Record<string, unknown>, lines: Record<string, unknown>[]): GuestOrder => ({
  ...(o as unknown as GuestOrder),
  total: num(o.total),
  lines: lines.filter((l) => l.order_id === o.id).map((l) => ({ ...(l as unknown as OrderLine), unit_price: num(l.unit_price), line_total: num(l.line_total) })),
});

/**
 * Places an order from a plaque. Prices and names come from the catalog in the database,
 * never from the browser; only active items with a price of this same business count.
 */
export async function placeOrder(tag: { id: string; label: string; business_id: string }, input: { lines: { id: string; qty: number }[]; name: string; people: number | null; notes: string | null }) {
  const wanted = input.lines.filter((l) => /^[0-9a-f-]{36}$/i.test(l.id) && Number.isInteger(l.qty) && l.qty > 0).slice(0, 40);
  if (!wanted.length) throw new Error("empty");
  const { data: items, error } = await db().from("catalog_items").select("id, name, price, active").eq("business_id", tag.business_id).in("id", wanted.map((l) => l.id));
  if (error) throw new Error(error.message);
  const byId = new Map(((items ?? []) as { id: string; name: string; price: number | null; active: boolean }[]).filter((i) => i.active && i.price != null).map((i) => [i.id, i]));
  const lines = wanted.filter((l) => byId.has(l.id)).map((l) => {
    const it = byId.get(l.id)!;
    const qty = Math.min(l.qty, 20);
    const unit = num(it.price);
    return { item_id: it.id, name: it.name, unit_price: unit, qty, line_total: Math.round(unit * qty * 100) / 100 };
  });
  if (!lines.length) throw new Error("empty");
  const total = Math.round(lines.reduce((n, l) => n + l.line_total, 0) * 100) / 100;
  let order: { id: string; token: string; number: number } | null = null;
  for (let attempt = 0; attempt < 5 && !order; attempt++) {
    const { data: last } = await db().from("guest_orders").select("number").eq("business_id", tag.business_id).order("number", { ascending: false }).limit(1).maybeSingle();
    const ins = await db().from("guest_orders").insert({
      business_id: tag.business_id, tag_id: tag.id, table_label: tag.label, number: (last?.number ?? 0) + 1,
      customer_name: input.name, people: input.people, notes: input.notes, total,
    }).select("id, token, number").single();
    if (!ins.error) order = ins.data as { id: string; token: string; number: number };
    else if (ins.error.code !== "23505") throw new Error(ins.error.message);
  }
  if (!order) throw new Error("No se pudo registrar el pedido. Inténtalo otra vez.");
  const li = await db().from("guest_order_items").insert(lines.map((l) => ({ ...l, order_id: order!.id })));
  if (li.error) {
    await db().from("guest_orders").delete().eq("id", order.id);
    throw new Error(li.error.message);
  }
  const { data: b } = await db().from("businesses").select("owner_token").eq("id", tag.business_id).maybeSingle();
  const count = lines.reduce((n, l) => n + l.qty, 0);
  await sendPush(
    { role: ["owner", "manager"], businessId: tag.business_id },
    { title: `Pedido #${order.number} · ${tag.label}`, body: `${input.name} · ${count} ${count === 1 ? "producto" : "productos"} · $${total.toFixed(2)}`, url: b?.owner_token ? `/mi/${b.owner_token}/pedidos` : "/" },
  ).catch(() => 0);
  return order;
}

/** Orders of one business: the ones in progress, plus those closed in the last 24 hours. */
export async function ordersFor(businessId: string) {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: open } = await db().from("guest_orders").select("*").eq("business_id", businessId).in("status", ["new", "preparing", "ready"]).order("created_at");
  const { data: closed } = await db().from("guest_orders").select("*").eq("business_id", businessId).in("status", ["delivered", "canceled"]).gte("updated_at", since).order("updated_at", { ascending: false }).limit(60);
  const all = [...((open ?? []) as Record<string, unknown>[]), ...((closed ?? []) as Record<string, unknown>[])];
  const { data: lines } = all.length ? await db().from("guest_order_items").select("*").in("order_id", all.map((o) => o.id as string)) : { data: [] };
  return all.map((o) => shape(o, (lines ?? []) as Record<string, unknown>[]));
}

/** One order seen by the guest who placed it (by its private token, within its plaque's business). */
export async function orderByToken(businessId: string, token: string) {
  if (!/^[0-9a-f]{24}$/.test(token)) return null;
  const { data: o } = await db().from("guest_orders").select("*").eq("business_id", businessId).eq("token", token).maybeSingle();
  if (!o) return null;
  const { data: lines } = await db().from("guest_order_items").select("*").eq("order_id", o.id);
  return shape(o as Record<string, unknown>, (lines ?? []) as Record<string, unknown>[]);
}

/** Moves an order forward (new → preparing → ready → delivered) or cancels it. */
export async function setOrderStatus(businessId: string, orderId: string, to: OrderStatus, reason?: string | null) {
  const { data: o } = await db().from("guest_orders").select("status").eq("id", orderId).eq("business_id", businessId).maybeSingle();
  if (!o) throw new Error("Pedido no encontrado.");
  const from = o.status as OrderStatus;
  const ok = to === "canceled" ? from !== "delivered" && from !== "canceled" : NEXT[from] === to;
  if (!ok) throw new Error("Ese pedido ya cambió de estado. Actualiza la página.");
  const { error } = await db().from("guest_orders").update({ status: to, cancel_reason: to === "canceled" ? (reason || null) : null, updated_at: new Date().toISOString() }).eq("id", orderId).eq("business_id", businessId);
  if (error) throw new Error(error.message);
}

/** Changes how many of a product an order has (0 takes it out) while it is not ready yet. */
export async function adjustLine(businessId: string, orderId: string, lineId: string, qty: number) {
  const { data: o } = await db().from("guest_orders").select("status").eq("id", orderId).eq("business_id", businessId).maybeSingle();
  if (!o) throw new Error("Pedido no encontrado.");
  if (o.status !== "new" && o.status !== "preparing") throw new Error("Solo se modifica un pedido nuevo o en preparación.");
  const q = Math.max(0, Math.min(Math.round(qty), 50));
  const { data: line } = await db().from("guest_order_items").select("unit_price").eq("id", lineId).eq("order_id", orderId).maybeSingle();
  if (!line) throw new Error("Producto no encontrado en el pedido.");
  const up = await db().from("guest_order_items").update({ qty: q, line_total: Math.round(num(line.unit_price) * q * 100) / 100 }).eq("id", lineId).eq("order_id", orderId);
  if (up.error) throw new Error(up.error.message);
  const { data: lines } = await db().from("guest_order_items").select("line_total").eq("order_id", orderId);
  const total = Math.round(((lines ?? []) as { line_total: number }[]).reduce((n, l) => n + num(l.line_total), 0) * 100) / 100;
  const { error } = await db().from("guest_orders").update({ total, modified: true, updated_at: new Date().toISOString() }).eq("id", orderId).eq("business_id", businessId);
  if (error) throw new Error(error.message);
}

/** How many orders are waiting to be accepted (for the owner's home). */
export async function newOrdersCount(businessId: string) {
  const { count } = await db().from("guest_orders").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "new");
  return count ?? 0;
}

/** Turns a module on or off for one business (founder). */
export async function setModule(businessId: string, key: ModuleKey, value: boolean | null) {
  const { data } = await db().from("businesses").select("modules").eq("id", businessId).maybeSingle();
  const modules = { ...((data?.modules as Record<string, unknown>) ?? {}) };
  if (value === null) delete modules[key];
  else modules[key] = value;
  const { error } = await db().from("businesses").update({ modules }).eq("id", businessId);
  if (error) throw new Error(error.message);
}
