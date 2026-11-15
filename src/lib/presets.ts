// What each kind of business gets when it is registered: which modules start on, which
// sections its NFC page shows and what its catalog is called. A starting point, never a
// limit: the founder (and the owner, for their content) can change everything afterwards.

import { ALL_SECTIONS, type Sections } from "./experience-shape";

export type Preset = {
  modules: { orders: boolean; reservations: boolean };
  sections: Sections;
  catalog_title: string;
  /** What to offer this kind of business (shown to the founder). */
  offer: string;
  /** In words, for the founder when registering. */
  summary: string;
};

const s = (off: (keyof Sections)[] = []): Sections => ({ ...ALL_SECTIONS, ...Object.fromEntries(off.map((k) => [k, false])) });

const FOOD: Preset = { modules: { orders: true, reservations: true }, sections: s(), catalog_title: "Menú", offer: "Plan mensual con el sistema completo", summary: "Menú, pedidos, reservas, promociones, reseñas y ranking del equipo" };
const CAFE: Preset = { modules: { orders: true, reservations: false }, sections: s(), catalog_title: "Menú", offer: "Plan mensual", summary: "Menú, pedidos, promociones, club y reseñas (reservas apagadas)" };

export const PRESETS: Record<string, Preset> = {
  restaurant: FOOD, brunch: FOOD, bar: FOOD, rooftop: FOOD, foodhall: FOOD,
  cafe: CAFE, bakery: CAFE, icecream: CAFE,
  beauty: { modules: { orders: false, reservations: true }, sections: s(), catalog_title: "Servicios", offer: "Plan mensual o pago único", summary: "Servicios con precios, citas (reservas), horario, contacto y ranking del equipo" },
  clinic: { modules: { orders: false, reservations: true }, sections: s(["promos"]), catalog_title: "Servicios", offer: "Pago único o plan mensual", summary: "Servicios, información, horario y citas (sin pedidos ni promociones)" },
  auto: { modules: { orders: false, reservations: false }, sections: s(), catalog_title: "Servicios", offer: "Pago único", summary: "Servicios, consultas por WhatsApp, ubicación y reseñas" },
  parts: { modules: { orders: false, reservations: false }, sections: s(), catalog_title: "Productos", offer: "Pago único", summary: "Catálogo de productos, consultas por WhatsApp, ubicación y reseñas" },
  market: { modules: { orders: false, reservations: false }, sections: s(), catalog_title: "Productos", offer: "Pago único o plan mensual", summary: "Catálogo, promociones, información, contacto y reseñas" },
  store: { modules: { orders: false, reservations: false }, sections: s(), catalog_title: "Productos", offer: "Pago único o plan mensual", summary: "Catálogo, promociones, contacto y reseñas" },
  hotel: { modules: { orders: false, reservations: false }, sections: s(), catalog_title: "Servicios", offer: "Plan mensual", summary: "Información, servicios, contacto y reseñas" },
  other: { modules: { orders: false, reservations: false }, sections: s(["promos", "catalog", "gallery"]), catalog_title: "Productos y servicios", offer: "Pago único", summary: "Reseñas, información y contacto" },
};

export const presetFor = (kind: string | null | undefined): Preset => PRESETS[kind ?? ""] ?? PRESETS.other!;
