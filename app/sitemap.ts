import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://wedges.dev/" },
    { url: "https://wedges.dev/review" },
    { url: "https://wedges.dev/club" },
  ];
}
