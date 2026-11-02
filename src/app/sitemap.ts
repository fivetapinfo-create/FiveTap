import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { VERTICALS } from "@/lib/verticals";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL }, ...VERTICALS.map((v) => ({ url: `${SITE_URL}/para/${v.slug}` }))];
}
