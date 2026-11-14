// How a plan's pieces read, for the website, the panel and the contract. No server imports:
// client components (plan picker, contract preview) use it too.

type Pieces = { plaques: number; cards: number; lanyards?: number; flex_pieces?: boolean };

/** "10 placas FiveTap · 2 tarjetas de equipo con cordón": the same pieces, in words for any business. */
export function planPieces(p: Pieces) {
  if (p.flex_pieces) return [p.plaques === 1 ? "1 pieza FiveTap: placa o tarjeta de equipo" : `${p.plaques} piezas FiveTap a tu elección: placas o tarjetas de equipo`];
  const parts = p.plaques ? [`${p.plaques} ${p.plaques === 1 ? "placa FiveTap" : "placas FiveTap"}`] : [];
  if (p.cards) parts.push(`${p.cards} ${p.cards === 1 ? "tarjeta de equipo" : "tarjetas de equipo"}${p.lanyards ? " con cordón" : ""}`);
  return parts;
}

/** "5 piezas" or "15 placas + 3 tarjetas": the pieces in a few words. */
export function planShort(p: Pieces) {
  if (p.flex_pieces) return p.plaques === 1 ? "1 pieza" : `${p.plaques} piezas`;
  if (!p.plaques) return `${p.cards} ${p.cards === 1 ? "tarjeta" : "tarjetas"} de equipo`;
  return `${p.plaques} placas + ${p.cards} tarjetas`;
}
