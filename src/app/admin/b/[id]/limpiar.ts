"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";

// Test data cleanup from the founder's panel: ratings, private messages and taps left by
// demos or tests. Only this business's rows, never payments, contracts or receipts.

const UUID = /^[0-9a-f-]{36}$/i;

async function run(f: FormData, ok: string, work: (businessId: string) => Promise<void>) {
  const raw = String(f.get("business_id") ?? "");
  const back = `/admin/b/${UUID.test(raw) ? raw : ""}`;
  try {
    if (!UUID.test(raw)) throw new Error("Negocio no encontrado.");
    await work(raw);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    redirect(`${back}?error=${encodeURIComponent(e instanceof Error ? e.message : "No se pudo borrar.")}#prueba`);
  }
  revalidatePath(back);
  revalidatePath("/admin");
  redirect(`${back}?ok=${ok}#prueba`);
}

/** One rating or one private message. */
export async function deleteTestItem(f: FormData) {
  await run(f, "prueba-borrado", async (businessId) => {
    const id = String(f.get("id") ?? "");
    const kind = String(f.get("kind") ?? "");
    if (!UUID.test(id)) throw new Error("Elemento no encontrado.");
    const table = kind === "rating" ? "service_ratings" : kind === "message" ? "feedback" : null;
    if (!table) throw new Error("Acción no válida.");
    const { error } = await db().from(table).delete().eq("id", id).eq("business_id", businessId);
    if (error) throw new Error(error.message);
  });
}

/** Everything a demo leaves behind: the checked groups, after a confirmation. */
export async function clearTestData(f: FormData) {
  await run(f, "prueba-limpia", async (businessId) => {
    if (f.get("confirm") !== "1") throw new Error("Marca la casilla para confirmar.");
    const groups = { ratings: "service_ratings", messages: "feedback", taps: "events" } as const;
    const chosen = (Object.keys(groups) as (keyof typeof groups)[]).filter((k) => f.get(k) === "1");
    if (!chosen.length) throw new Error("Elige qué borrar.");
    for (const k of chosen) {
      const { error } = await db().from(groups[k]).delete().eq("business_id", businessId);
      if (error) throw new Error(error.message);
    }
  });
}
