import type { Genre, Status } from "./types";

export const GENRES: { value: Genre; label: string }[] = [
  { value: "poeme", label: "Poème" },
  { value: "nouvelle", label: "Nouvelle" },
  { value: "texte", label: "Texte court" },
  { value: "livre", label: "Livre" },
  { value: "document", label: "Document importé" },
];

export const STATUSES: { value: Status; label: string }[] = [
  { value: "brouillon", label: "Brouillon" },
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" },
];

export const genreLabel = (g: Genre) => GENRES.find((x) => x.value === g)?.label ?? g;
export const statusLabel = (s: Status) => STATUSES.find((x) => x.value === s)?.label ?? s;
