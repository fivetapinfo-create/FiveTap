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

export const verticalByKey = (key: string | null | undefined) =>
  VERTICALS.find((v) => v.key === key) ?? DEFAULT_VERTICAL;

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
