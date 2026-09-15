import { Font } from "@react-pdf/renderer";

/** Polices proposées pour le corps du livre (fichiers dans /public/fonts). */
export const BOOK_FONTS = [
  { value: "Lora", label: "Lora", file: "lora", note: "chaleureuse, très lisible" },
  { value: "EB Garamond", label: "Garamond", file: "eb-garamond", note: "classique de l’édition" },
  { value: "Crimson Pro", label: "Crimson", file: "crimson-pro", note: "élégante, compacte" },
  { value: "Playfair Display", label: "Playfair", file: "playfair-display", note: "contrastée, pour la poésie" },
] as const;

export type BookFont = (typeof BOOK_FONTS)[number]["value"];

let registered = false;

/**
 * Déclare les polices auprès du moteur PDF. `base` est l'origine du site
 * (ex. https://kalam.vercel.app) ou un dossier local pour les tests.
 */
export function registerFonts(base: string) {
  if (registered) return;
  registered = true;

  for (const f of BOOK_FONTS) {
    Font.register({
      family: f.value,
      fonts: [
        { src: `${base}/fonts/${f.file}-400-normal.woff`, fontWeight: 400 },
        { src: `${base}/fonts/${f.file}-400-italic.woff`, fontWeight: 400, fontStyle: "italic" },
        { src: `${base}/fonts/${f.file}-700-normal.woff`, fontWeight: 700 },
        { src: `${base}/fonts/${f.file}-700-italic.woff`, fontWeight: 700, fontStyle: "italic" },
      ],
    });
  }
  Font.register({
    family: "Inter",
    fonts: [
      { src: `${base}/fonts/inter-400-normal.woff`, fontWeight: 400 },
      { src: `${base}/fonts/inter-600-normal.woff`, fontWeight: 600 },
    ],
  });

  // Pas de césure automatique (l'algorithme intégré est pensé pour l'anglais).
  Font.registerHyphenationCallback((word) => [word]);
}
