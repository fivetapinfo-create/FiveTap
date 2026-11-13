import type { Tag } from "./types";

// How a plaque or card is shown in the founder's inventory: one word and one color.

export type PieceState = "sin-grabar" | "grabada" | "entregada" | "retirada" | "desactivada";

export const PIECE_LABEL: Record<PieceState, string> = {
  "sin-grabar": "Sin grabar",
  grabada: "Grabada",
  entregada: "Entregada",
  retirada: "Retirada",
  desactivada: "Sin usar",
};

export function pieceState(t: Pick<Tag, "status" | "active">): PieceState {
  if (t.status === "retired") return "retirada";
  if (t.status === "delivered") return "entregada";
  if (!t.active) return "desactivada";
  return t.status === "written" ? "grabada" : "sin-grabar";
}

/** The one next step for a piece, if any. */
export function nextStep(state: PieceState): { to: "written" | "delivered"; label: string } | null {
  if (state === "sin-grabar") return { to: "written", label: "Ya la grabé" };
  if (state === "grabada") return { to: "delivered", label: "Ya la entregué" };
  return null;
}

export const KIND_NAME = { table: "Placa", waiter: "Tarjeta de mesero" } as const;
