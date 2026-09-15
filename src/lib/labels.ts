import type { Genre, PageTheme, Status } from "./types";

export const GENRES: { value: Genre; label: string }[] = [
  { value: "poeme", label: "Poème" },
  { value: "nouvelle", label: "Nouvelle" },
  { value: "texte", label: "Texte court" },
  { value: "livre", label: "Livre" },
  { value: "document", label: "Document importé" },
  { value: "romance", label: "Romance" },
  { value: "policier", label: "Policier" },
  { value: "fantasy", label: "Fantasy" },
  { value: "science_fiction", label: "Science-fiction" },
  { value: "erotique", label: "Érotique" },
  { value: "theatre", label: "Théâtre" },
  { value: "essai", label: "Essai" },
  { value: "autobiographie", label: "Autobiographie" },
];

export const PAGE_THEMES: { value: PageTheme; label: string; swatch: string }[] = [
  { value: "papier", label: "Papier", swatch: "#fafafa" },
  { value: "nuit", label: "Nuit", swatch: "#171b24" },
  { value: "foret", label: "Forêt", swatch: "#edf3ed" },
  { value: "ocean", label: "Océan", swatch: "#edf5f8" },
  { value: "rose", label: "Rose poudré", swatch: "#fff1f3" },
  { value: "ambre", label: "Ambre", swatch: "#fff7e8" },
];

export const STATUSES: { value: Status; label: string }[] = [
  { value: "brouillon", label: "Brouillon" },
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" },
];

export const genreLabel = (g: Genre) => GENRES.find((x) => x.value === g)?.label ?? g;
export const statusLabel = (s: Status) => STATUSES.find((x) => x.value === s)?.label ?? s;
