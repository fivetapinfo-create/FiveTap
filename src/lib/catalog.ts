// What can be bought online in one payment, with its fixed price. The page and the
// server both read from here, so a buyer can't pick an item and send another price.
export type CatalogItem = { key: string; name: string; detail: string; amount: number };

export const ONE_TIME_ITEMS: CatalogItem[] = [
  { key: "anual", name: "Plan anual", detail: "12 meses · placas con tu marca", amount: 1290 },
  { key: "anual-mitad", name: "Plan anual · 1.ª mitad", detail: "La otra mitad, en efectivo el día de la instalación", amount: 645 },
  { key: "placas-2", name: "2 placas NFC", detail: "Pago único · directo a Google", amount: 60 },
  { key: "placas-3", name: "3 placas NFC", detail: "Pago único · directo a Google", amount: 85 },
  { key: "placas-4", name: "4 placas NFC", detail: "Pago único · $25 c/u", amount: 100 },
  { key: "placas-6", name: "6 placas NFC", detail: "Pago único · $22 c/u", amount: 132 },
  { key: "tarjetas-1", name: "1 tarjeta para meseros", detail: "Pago único", amount: 25 },
  { key: "tarjetas-4", name: "4 tarjetas para meseros", detail: "Pago único · $22.50 c/u", amount: 90 },
  { key: "tarjetas-6", name: "6 tarjetas para meseros", detail: "Pago único · $20 c/u", amount: 120 },
  { key: "tarjetas-10", name: "10 tarjetas para meseros", detail: "Pago único · $18 c/u", amount: 180 },
];

export const itemByKey = (key: string) => ONE_TIME_ITEMS.find((i) => i.key === key);
