import { SITE_URL, pieceUrl, reviewUrlFrom } from "./site";
import type { HubGroup } from "@/components/LinksHub";

type Biz = { name: string; owner_token: string; google_review_url: string | null };
type Piece = { id: string; label: string; code: string; kind: string; active: boolean; staff_id?: string | null; staff_name?: string | null };

/**
 * The links of a business, ready for the links hub, each with a ready message to send.
 * Every link comes from the system (codes are generated and unique): nothing is typed by hand.
 */
export function linkGroups(b: Biz, pieces: Piece[], opts: { ownerApp: boolean; isWaiter: (p: Piece) => boolean }): HubGroup[] {
  const tables = pieces.filter((p) => !opts.isWaiter(p));
  const waiters = pieces.filter(opts.isWaiter);
  const review = b.google_review_url ? reviewUrlFrom(b.google_review_url) : null;
  const groups: HubGroup[] = [];
  const main = [];
  if (review) main.push({ key: "google", title: "Reseñas en Google", hint: "Directo a dejar la reseña", url: review, message: `Hola, ¿nos ayudas con una reseña de ${b.name}? Toma 30 segundos: ${review}` });
  if (opts.ownerApp) main.push({ key: "app", title: "App Fivetap Business", hint: "Para el dueño o el gerente (pide su código)", url: `${SITE_URL}/mi/${b.owner_token}`, message: `Hola, esta es la app Fivetap Business de ${b.name}: ${SITE_URL}/mi/${b.owner_token} . Ábrela y escribe tu código de acceso para entrar.` });
  if (main.length) groups.push({ title: "Principales", links: main });
  groups.push({
    title: `Placas de mesa · ${tables.length}`,
    empty: "Aún no hay placas de mesa.",
    links: tables.map((t) => {
      const url = pieceUrl(t.code, t.kind);
      return { key: t.id, title: t.label, hint: "Abre la página del local", url, off: !t.active, message: `Enlace de ${t.label} de ${b.name}: ${url}` };
    }),
  });
  groups.push({
    title: `Meseros · ${waiters.length}`,
    empty: "Aún no hay tarjetas de mesero.",
    links: waiters.map((t) => {
      const url = pieceUrl(t.code, "waiter");
      const who = t.staff_name?.trim();
      return {
        key: t.id,
        title: who ? `${who} · ${t.label}` : t.label,
        hint: who ? "Su calificación personal" : "Tarjeta libre",
        url,
        off: !t.active,
        message: who ? `Hola ${who.split(" ")[0]}, este es tu enlace de Fivetap en ${b.name}: ${url} . Los clientes te califican desde aquí.` : `Enlace de ${t.label} de ${b.name}: ${url}`,
      };
    }),
  });
  return groups;
}
