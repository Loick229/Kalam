"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { genreLabel } from "@/lib/labels";
import type { Genre } from "@/lib/types";
import { normalize, relativeDate } from "@/lib/utils";

export interface SheetRow {
  id: string;
  writing_id: string;
  title: string | null;
  author: string | null;
  theme: string | null;
  word_count: number | null;
  short_summary: string | null;
  updated_at: string;
  writings: { genre: Genre; status: string } | null;
}

export function SheetList({ sheets }: { sheets: SheetRow[] }) {
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = normalize(query);
    if (!q) return sheets;
    return sheets.filter((s) => normalize(`${s.title} ${s.author} ${s.theme} ${s.short_summary}`).includes(q));
  }, [sheets, query]);

  return (
    <div>
      <p className="eyebrow">{sheets.length} fiche{sheets.length > 1 ? "s" : ""}</p>
      <h1 className="mt-1 font-display text-[2.5rem] leading-none font-semibold tracking-tight md:text-[3.25rem]">
        Fiches de résumé
      </h1>
      <div className="signature-rule mt-6" />

      <label className="relative mt-6 block max-w-xl">
        <Search size={17} strokeWidth={1.75} className="absolute top-1/2 left-3 -translate-y-1/2 text-mist" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher dans les fiches…"
          className="h-11 w-full rounded-md border border-rule bg-card pr-3 pl-10 text-[0.9375rem] placeholder:text-mist focus:border-blue focus:ring-2 focus:ring-blue/15 focus:outline-none"
        />
      </label>

      {sheets.length === 0 ? (
        <div className="max-w-md py-16">
          <h2 className="font-display text-2xl font-semibold">Aucune fiche pour l’instant</h2>
          <p className="mt-2 font-serif text-ink-soft">
            Ouvrez un écrit, puis « Fiche » dans la barre du haut : titre, résumés, thèmes et citations, avec une
            proposition de l’IA si vous le souhaitez.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm text-blue-ink hover:underline">
            Aller à la bibliothèque →
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {shown.map((s) => (
            <li key={s.id}>
              <Link
                href={`/ecrits/${s.writing_id}/fiche`}
                className="group flex h-full flex-col rounded-lg bg-card p-6 shadow-card ring-1 ring-rule/60 transition hover:ring-mist/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="eyebrow truncate">{s.theme || (s.writings ? genreLabel(s.writings.genre) : "")}</span>
                  <span className="shrink-0 text-xs text-mist">{relativeDate(s.updated_at)}</span>
                </div>
                <h2 className="mt-3 font-display text-[1.5rem] leading-snug font-semibold group-hover:text-blue-ink">
                  {s.title || "Sans titre"}
                </h2>
                {s.author && <p className="text-sm text-ink-soft">{s.author}</p>}
                <div className="my-4 flex items-center gap-2">
                  <span className="h-px w-8 bg-blue" />
                  <span className="h-1 w-1 rounded-full bg-red" />
                </div>
                <p className="line-clamp-3 font-serif text-[0.9375rem] leading-relaxed text-ink-soft italic">
                  {s.short_summary || "Résumé à écrire."}
                </p>
                {s.word_count ? (
                  <p className="mt-auto pt-4 text-xs text-mist">{s.word_count.toLocaleString("fr-FR")} mots</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
