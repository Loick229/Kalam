"use client";

import { ArrowDownUp, FileUp, LayoutGrid, List, PenLine, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createWriting, deleteWriting } from "@/app/actions";
import { LogoMark } from "@/components/logo";
import { Button, IconButton, StatusDot } from "@/components/ui";
import { GENRES, genreLabel, statusLabel } from "@/lib/labels";
import type { Genre, WritingCard } from "@/lib/types";
import { cn, normalize, relativeDate } from "@/lib/utils";

type Sort = "date" | "title" | "genre";
type View = "grid" | "list";

export function Library({ writings }: { writings: WritingCard[] }) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<Genre | "all">("all");
  const [sort, setSort] = useState<Sort>("date");
  const [view, setView] = useState<View>("grid");

  // Préférence d'affichage mémorisée sur l'appareil.
  useEffect(() => {
    try {
      const v = localStorage.getItem("kalam-view");
      if (v === "grid" || v === "list") setView(v);
    } catch {}
  }, []);
  const changeView = (v: View) => {
    setView(v);
    try {
      localStorage.setItem("kalam-view", v);
    } catch {}
  };

  const shown = useMemo(() => {
    const q = normalize(query);
    const list = writings.filter(
      (w) =>
        (genre === "all" || w.genre === genre) &&
        (!q || normalize(`${w.title} ${w.subtitle ?? ""} ${w.excerpt} ${w.tags.join(" ")}`).includes(q)),
    );
    return list.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title, "fr");
      if (sort === "genre") return genreLabel(a.genre).localeCompare(genreLabel(b.genre), "fr");
      return b.updated_at.localeCompare(a.updated_at);
    });
  }, [writings, query, genre, sort]);

  const totalWords = writings.reduce((n, w) => n + w.word_count, 0);

  return (
    <div>
      {/* En-tête */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">
            {writings.length} écrit{writings.length > 1 ? "s" : ""} · {totalWords.toLocaleString("fr-FR")} mots
          </p>
          <h1 className="mt-1 font-display text-[2.5rem] leading-none font-semibold tracking-tight md:text-[3.25rem]">
            Bibliothèque
          </h1>
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <Link
            href="/importer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-rule bg-card px-4 text-[0.9375rem] font-medium transition hover:border-mist"
          >
            <FileUp size={17} strokeWidth={1.75} />
            Importer
          </Link>
          <form action={createWriting}>
            <Button type="submit" className="w-full">
              <PenLine size={17} strokeWidth={1.75} />
              Nouvel écrit
            </Button>
          </form>
        </div>
      </div>

      <div className="signature-rule mt-6" />

      {/* Outils : recherche, genres, tri, affichage */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <Search size={17} strokeWidth={1.75} className="absolute top-1/2 left-3 -translate-y-1/2 text-mist" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un titre, un mot, un tag…"
            className="h-11 w-full rounded-md border border-rule bg-card pr-3 pl-10 text-[0.9375rem] placeholder:text-mist focus:border-blue focus:ring-2 focus:ring-blue/15 focus:outline-none"
          />
        </label>

        <div className="flex items-center justify-between gap-3">
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:px-0">
            {[{ value: "all" as const, label: "Tout" }, ...GENRES].map((g) => (
              <button
                key={g.value}
                onClick={() => setGenre(g.value)}
                className={cn(
                  "h-8 shrink-0 rounded-full border px-3 text-[0.8125rem] transition",
                  genre === g.value
                    ? "border-ink bg-ink text-paper"
                    : "border-rule text-ink-soft hover:border-mist",
                )}
              >
                {g.label === "Document importé" ? "Importés" : g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 self-end lg:self-auto">
          <label className="relative mr-1 flex items-center gap-1.5 text-sm text-ink-soft">
            <ArrowDownUp size={15} strokeWidth={1.75} className="text-mist" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-9 cursor-pointer appearance-none bg-transparent pr-1 focus:outline-none"
              aria-label="Trier"
            >
              <option value="date">Récents</option>
              <option value="title">Titre</option>
              <option value="genre">Genre</option>
            </select>
          </label>
          <IconButton label="Grille" active={view === "grid"} onClick={() => changeView("grid")}>
            <LayoutGrid size={17} strokeWidth={1.75} />
          </IconButton>
          <IconButton label="Liste" active={view === "list"} onClick={() => changeView("list")}>
            <List size={17} strokeWidth={1.75} />
          </IconButton>
        </div>
      </div>

      {/* Contenu */}
      <div className="mt-8">
        {writings.length === 0 ? (
          <EmptyLibrary />
        ) : shown.length === 0 ? (
          <p className="py-16 text-center text-ink-soft">
            Rien ne correspond à <span className="font-serif italic">« {query} »</span>.
          </p>
        ) : view === "grid" ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((w) => (
              <li key={w.id}>
                <GridCard w={w} />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {shown.map((w) => (
              <li key={w.id}>
                <ListRow w={w} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function GridCard({ w }: { w: WritingCard }) {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-lg bg-card shadow-card ring-1 ring-rule/60 transition hover:-translate-y-0.5 hover:ring-mist/50">
      <Link href={`/ecrits/${w.id}`}>
      {w.cover_url ? (
        <div className="aspect-[16/9] overflow-hidden bg-wash">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={w.cover_url}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
          />
        </div>
      ) : null}
      </Link>

      <Link href={`/ecrits/${w.id}`} className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between">
          <span className="eyebrow">{genreLabel(w.genre)}</span>
          <StatusDot status={w.status} label={statusLabel(w.status)} />
        </div>

        <h2 className="mt-3 font-display text-[1.375rem] leading-snug font-semibold text-ink group-hover:text-blue-ink">
          {w.title || "Sans titre"}
        </h2>
        {w.subtitle && <p className="mt-0.5 font-serif text-sm text-ink-soft italic">{w.subtitle}</p>}

        <p
          className={cn(
            "mt-3 line-clamp-3 font-serif text-[0.9375rem] leading-relaxed text-ink-soft",
            !w.excerpt && "text-mist italic",
          )}
        >
          {w.excerpt || "Page blanche, prête à être écrite."}
        </p>

        <div className="mt-auto flex items-center gap-2 pt-5 text-xs text-mist">
          <span>{relativeDate(w.updated_at)}</span>
          <span aria-hidden>·</span>
          <span>{w.word_count.toLocaleString("fr-FR")} mots</span>
          {w.source_format && (
            <span className="ml-auto rounded-sm border border-rule px-1.5 py-0.5 font-mono text-[0.625rem] uppercase">
              {w.source_format}
            </span>
          )}
        </div>
      </Link>
      <div className="px-5 pb-4">
        <DeleteControl id={w.id} title={w.title} />
      </div>
    </div>
  );
}

function ListRow({ w }: { w: WritingCard }) {
  return (
    <div className="group flex items-center gap-4 py-4 transition hover:bg-wash/60 md:px-2">
      <Link href={`/ecrits/${w.id}`} className="flex min-w-0 flex-1 items-center gap-4">
      <div className="h-16 w-12 shrink-0 overflow-hidden rounded-[3px] bg-wash ring-1 ring-rule">
        {w.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={w.cover_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-end p-1.5">
            <span className="h-1 w-1 rounded-full bg-red" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-display text-lg font-semibold group-hover:text-blue-ink">
          {w.title || "Sans titre"}
        </h2>
        <p className="truncate font-serif text-sm text-ink-soft">{w.excerpt || "—"}</p>
      </div>
      <div className="hidden w-32 text-sm text-ink-soft sm:block">{genreLabel(w.genre)}</div>
      <div className="hidden w-24 md:block">
        <StatusDot status={w.status} label={statusLabel(w.status)} />
      </div>
      <div className="w-20 text-right text-xs text-mist">{relativeDate(w.updated_at)}</div>
      </Link>
      <DeleteControl id={w.id} title={w.title} />
    </div>
  );
}

function DeleteControl({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deleteWriting.bind(null, id)}
      onSubmit={(event) => {
        if (!confirm(`Supprimer définitivement « ${title || "Sans titre"} » ?`)) event.preventDefault();
      }}
      className="shrink-0"
    >
      <button
        type="submit"
        aria-label={`Supprimer ${title || "Sans titre"}`}
        title="Supprimer"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-mist transition hover:bg-red/10 hover:text-red"
      >
        <Trash2 size={16} strokeWidth={1.75} />
      </button>
    </form>
  );
}

function EmptyLibrary() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <LogoMark className="mx-auto h-16 w-16 opacity-90" />
      <h2 className="mt-6 font-display text-2xl font-semibold">La première page vous attend</h2>
      <p className="mt-2 font-serif text-ink-soft">
        Commencez un poème, une nouvelle, un livre — ou rapatriez vos textes existants (Word, PDF, ODT,
        Markdown).
      </p>
      <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
        {(["poeme", "nouvelle", "livre"] as Genre[]).map((g) => (
          <form key={g} action={createWriting}>
            <input type="hidden" name="genre" value={g} />
            <Button variant="outline" type="submit" className="w-full">
              {g === "poeme" ? "Un poème" : g === "nouvelle" ? "Une nouvelle" : "Un livre"}
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}
