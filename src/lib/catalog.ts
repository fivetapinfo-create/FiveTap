// What can be bought online in one payment, with its fixed price. Everything else is a
// monthly plan: plaques and waiter cards are no longer sold one-time. The page and the
// server both read from here, so a buyer can't pick an item and send another price.
export type CatalogItem = { key: string; name: string; detail: string; amount: number };

export const ONE_TIME_ITEMS: CatalogItem[] = [
  { key: "anual", name: "Plan anual", detail: "12 meses · placas con tu marca", amount: 1290 },
  { key: "anual-mitad", name: "Plan anual · 1.ª mitad", detail: "La otra mitad, en efectivo el día de la instalación", amount: 645 },
];

export const itemByKey = (key: string) => ONE_TIME_ITEMS.find((i) => i.key === key);
