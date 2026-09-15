import clsx, { type ClassValue } from "clsx";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

/** Compte les mots d'un texte brut (gère les apostrophes et tirets français). */
export function countWords(text: string): number {
  const m = text.trim().match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu);
  return m ? m.length : 0;
}

/** Estimation du nombre de pages imprimées (≈ 250 mots par page de roman). */
export const estimatePages = (words: number) => Math.max(1, Math.ceil(words / 250));

/** Premier morceau de texte, coupé proprement sur un mot. */
export function excerpt(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\s]+$/, "") + "…";
}

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const shortFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));

/** « à l'instant », « il y a 3 h », « 12 sept. », « 4 mars 2025 ». */
export function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "à l’instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 2) return "hier";
  if (d.getFullYear() === new Date().getFullYear()) return shortFmt.format(d);
  return dateFmt.format(d);
}

/** Minuscules sans accents, pour la recherche. */
export function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Nom de fichier sûr à partir d'un titre. */
export function slugify(s: string): string {
  return (
    normalize(s)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "kalam"
  );
}
