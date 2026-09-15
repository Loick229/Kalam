import type { MetadataRoute } from "next";

/** Permet d'« installer » Kalam sur l'écran d'accueil du téléphone. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kalam",
    short_name: "Kalam",
    description: "Atelier d’écriture et bibliothèque personnelle",
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAFA",
    theme_color: "#FAFAFA",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
