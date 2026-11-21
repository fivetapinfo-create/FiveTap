"use server";

import { assertAdmin } from "@/lib/admin-guard";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveBranch } from "@/lib/staff";
import { db } from "@/lib/supabase";

// Branches managed from the founder's panel: create, edit (name, address, Google link) and
// switch a branch on or off. Switching one off closes only its own pieces.

const UUID = /^[0-9a-f-]{36}$/i;

export async function adminSaveBranch(f: FormData) {
  await assertAdmin();
  const businessId = String(f.get("business_id") ?? "");
  const back = `/admin/b/${UUID.test(businessId) ? businessId : ""}`;
  let error = "";
  try {
    if (!UUID.test(businessId)) throw new Error("Negocio no encontrado.");
    const id = String(f.get("id") ?? "");
    const op = String(f.get("op") ?? "save");
    if (op === "toggle") {
      if (!UUID.test(id)) throw new Error("Sucursal no encontrada.");
      const { error: e } = await db().from("branches").update({ active: f.get("active") === "1" }).eq("id", id).eq("business_id", businessId);
      if (e) throw new Error(e.message);
    } else {
      // Editing keeps the branch's current on/off state; a new branch starts on.
      let active = true;
      if (UUID.test(id)) {
        const { data } = await db().from("branches").select("active").eq("id", id).eq("business_id", businessId).maybeSingle();
        if (!data) throw new Error("Sucursal no encontrada.");
        active = data.active !== false;
      }
      await saveBranch(businessId, { id: UUID.test(id) ? id : undefined, name: String(f.get("name") ?? ""), address: String(f.get("address") ?? ""), review: String(f.get("review") ?? ""), active });
    }
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    error = e instanceof Error ? e.message : "No se pudo guardar.";
  }
  revalidatePath(back);
  redirect(error ? `${back}?error=${encodeURIComponent(error)}#sucursales-admin` : `${back}?ok=sucursal#sucursales-admin`);
}
