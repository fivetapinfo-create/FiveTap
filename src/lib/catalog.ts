// What can be bought online in one payment, with its fixed price. Everything else is a
// monthly plan: plaques and waiter cards are no longer sold one-time. The page and the
// server both read from here, so a buyer can't pick an item and send another price.
export type CatalogItem = { key: string; name: string; detail: string; amount: number };

// No annual plans for now: nothing is sold in one payment online.
export const ONE_TIME_ITEMS: CatalogItem[] = [
];

export const itemByKey = (key: string) => ONE_TIME_ITEMS.find((i) => i.key === key);
