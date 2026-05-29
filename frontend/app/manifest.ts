import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Astral4Gamer Gaming",
    short_name: "Astral4Gamer",
    description: "Boutique, tournois, live et communauté esport.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#e52b2f",
    icons: [
      {
        src: "/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      }
    ]
  };
}
