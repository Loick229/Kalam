import type { JSONContent } from "@tiptap/core";

export type Genre =
  | "poeme"
  | "nouvelle"
  | "texte"
  | "livre"
  | "document"
  | "romance"
  | "policier"
  | "fantasy"
  | "science_fiction"
  | "erotique"
  | "theatre"
  | "essai"
  | "autobiographie";
export type PageTheme = "papier" | "nuit" | "foret" | "ocean" | "rose" | "ambre";
export type Status = "brouillon" | "en_cours" | "termine";

export interface WritingFolder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

/** Un écrit tel que stocké dans la table `writings`. */
export interface Writing {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  subtitle: string | null;
  author: string | null;
  genre: Genre;
  page_theme: PageTheme;
  page_background_url: string | null;
  status: Status;
  summary: string | null;
  tags: string[];
  content: JSONContent | null;
  content_text: string;
  excerpt: string;
  word_count: number;
  cover_path: string | null;
  source_format: string | null;
  source_name: string | null;
  source_path: string | null;
  imported_at: string | null;
  /** Retiré de la bibliothèque tant que la révélation n'est pas activée. */
  hidden: boolean;
  visibility: "private" | "link" | "public";
  share_slug: string | null;
  read_count: number;
  created_at: string;
  updated_at: string;
}

/** Version allégée utilisée par la bibliothèque (sans le contenu complet). */
export type WritingCard = Pick<
  Writing,
  | "id"
  | "folder_id"
  | "title"
  | "subtitle"
  | "genre"
  | "status"
  | "word_count"
  | "cover_path"
  | "source_format"
  | "tags"
  | "updated_at"
  | "created_at"
  | "excerpt"
  | "hidden"
> & { cover_url: string | null };

/** Fiche de résumé (table `summary_sheets`). */
export interface SummarySheet {
  id: string;
  writing_id: string;
  user_id: string;
  title: string | null;
  author: string | null;
  theme: string | null;
  word_count: number | null;
  page_count: number | null;
  short_summary: string | null;
  long_summary: string | null;
  characters: string | null;
  quotes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
