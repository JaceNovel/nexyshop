import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Astral4Gamer Gaming",
    short_name: "Astral4Gamer",
    description: "Boutique, tournois, live et communauté esport.",
    start_url: "/",
    display: "standalone",
    background_color: "#05050a",
    theme_color: "#9d4edd",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" }
    ]
  };
}
