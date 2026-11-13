// Same product for every vertical. Only the words change: what the owner calls
// the place, where the stand goes, and how the landing talks to them.

export type Vertical = {
  key: string;
  slug: string; // /para/<slug>
  label: string; // singular, for the panel
  plural: string; // for the landing
  spot: string; // default label for each NFC point
  where: string; // "en cada mesa"
  guests: string; // what they call their customers
};

export const VERTICALS: Vertical[] = [
  { key: "restaurant", slug: "restaurantes", label: "Restaurante", plural: "restaurantes", spot: "Mesa", where: "en cada mesa", guests: "comensales" },
  { key: "cafe", slug: "cafes", label: "Café de especialidad", plural: "cafés de especialidad", spot: "Barra", where: "en la barra y en cada mesa", guests: "clientes" },
  { key: "brunch", slug: "brunch", label: "Brunch", plural: "brunch spots", spot: "Mesa", where: "en cada mesa", guests: "clientes" },
  { key: "bar", slug: "bares", label: "Bar gastronómico", plural: "bares gastronómicos", spot: "Barra", where: "en la barra y en cada mesa", guests: "clientes" },
  { key: "rooftop", slug: "rooftops", label: "Rooftop", plural: "rooftops", spot: "Mesa", where: "en cada mesa", guests: "invitados" },
  { key: "bakery", slug: "panaderias", label: "Panadería premium", plural: "panaderías premium", spot: "Caja", where: "junto a la caja", guests: "clientes" },
  { key: "icecream", slug: "heladerias", label: "Heladería artesanal", plural: "heladerías artesanales", spot: "Caja", where: "junto a la caja", guests: "clientes" },
  { key: "foodhall", slug: "food-halls", label: "Food hall", plural: "food halls", spot: "Puesto", where: "en cada puesto y mesa", guests: "visitantes" },
];

export const DEFAULT_VERTICAL = VERTICALS[0]!;

/** Other kinds of venue the founder can register (no landing page of their own). */
const OTHER_KINDS: Vertical[] = [
  { key: "auto", slug: "talleres", label: "Taller o servicio automotriz", plural: "talleres", spot: "Placa", where: "en tu local", guests: "clientes" },
  { key: "beauty", slug: "salones", label: "Barbería, salón o spa", plural: "salones", spot: "Placa", where: "en tu local", guests: "clientes" },
  { key: "clinic", slug: "clinicas", label: "Clínica o consultorio", plural: "clínicas", spot: "Placa", where: "en la recepción", guests: "pacientes" },
  { key: "hotel", slug: "hoteles", label: "Hotel u hospedaje", plural: "hoteles", spot: "Placa", where: "en la recepción", guests: "huéspedes" },
  { key: "store", slug: "tiendas", label: "Tienda", plural: "tiendas", spot: "Placa", where: "junto a la caja", guests: "clientes" },
  { key: "other", slug: "negocios", label: "Otro negocio", plural: "negocios", spot: "Placa", where: "en tu local", guests: "clientes" },
];

/** Every kind the panel offers: the landing's verticals first, then the rest. */
export const PANEL_KINDS: Vertical[] = [...VERTICALS, ...OTHER_KINDS];

export const verticalByKey = (key: string | null | undefined) =>
  PANEL_KINDS.find((v) => v.key === key) ?? DEFAULT_VERTICAL;

export const verticalBySlug = (slug: string) => VERTICALS.find((v) => v.slug === slug);

/** The home page speaks to the core niche: restaurants and premium cafés. */
export const HOME: Vertical = {
  key: "home",
  slug: "",
  label: "Restaurante",
  plural: "restaurantes y cafés",
  spot: "Mesa",
  where: "en cada mesa",
  guests: "clientes",
};
