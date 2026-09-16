"use client";

import { generateHTML, type JSONContent } from "@tiptap/core";
import { ArrowLeft, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { baseExtensions } from "@/lib/editor/extensions";
import { nodeText } from "@/lib/editor/document";
import { genreLabel } from "@/lib/labels";
import type { Genre, PageTheme } from "@/lib/types";

const PAGE_CHARACTERS = 2400;

function paginate(content: JSONContent | null | undefined) {
  const pages: JSONContent[][] = [[]];
  let length = 0;

  const pushPage = () => {
    if (pages.at(-1)?.length) pages.push([]);
    length = 0;
  };

  for (const node of content?.content ?? []) {
    if (node.type === "pageBreak") {
      pushPage();
      continue;
    }

    const nodeLength = Math.max(nodeText(node).length, 80);
    const startsChapter = node.type === "heading" && node.attrs?.level === 1 && pages.at(-1)?.length;

    if (startsChapter || (length + nodeLength > PAGE_CHARACTERS && pages.at(-1)?.length)) {
      pushPage();
    }

    pages.at(-1)!.push(node);
    length += nodeLength;
  }

  return pages.filter((page) => page.length > 0);
}

export function BookMode({
  content,
  title,
  subtitle,
  author,
  genre,
  pageTheme = "papier",
  backgroundUrl,
  coverUrl,
  onClose,
}: {
  content: JSONContent | null | undefined;
  title: string;
  subtitle?: string | null;
  author: string | null;
  genre: Genre;
  pageTheme?: PageTheme;
  backgroundUrl?: string | null;
  coverUrl?: string | null;
  onClose?: () => void;
}) {
  const pages = paginate(content);
  const totalPages = pages.length + 1;
  const [currentPage, setCurrentPage] = useState(0);
  const close = onClose ?? (() => window.history.back());

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") goToPage(currentPage - 1);
      if (event.key === "ArrowRight") goToPage(currentPage + 1);
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, currentPage, totalPages]);

  const isTitlePage = currentPage === 0;
  const pageContent = pages[currentPage - 1] ?? [];
  const footerText = title || "Sans titre";

  return (
    <div className="book-mode fixed inset-0 z-40 overflow-hidden bg-wash" data-page-theme={pageTheme}>
      <header className="sticky top-0 z-10 border-b border-rule bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:px-6">
          <button
            type="button"
            onClick={close}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-ink-soft hover:bg-wash hover:text-ink"
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
            <span className="hidden sm:inline">Retour à l’édition</span>
          </button>
          <span className="ml-auto flex items-center gap-2 text-xs text-mist">
            <BookOpen size={15} strokeWidth={1.75} />
            Page {currentPage + 1} sur {totalPages}
          </span>
        </div>
      </header>

      <main className="relative mx-auto flex h-[calc(100dvh-3.5rem)] w-full max-w-6xl items-center px-12 py-4 md:px-24 md:py-8">
        <button
          type="button"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 0}
          aria-label="Page précédente"
          className="absolute left-2 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-rule bg-card text-ink-soft shadow-card transition hover:border-mist hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 md:left-6"
        >
          <ChevronLeft size={24} strokeWidth={1.75} />
        </button>

        {isTitlePage ? (
          <div
            className={`book-title-page book-page w-full${backgroundUrl ? " has-page-background" : ""}`}
            style={backgroundUrl ? { backgroundImage: `url("${backgroundUrl}")` } : undefined}
          >
            <p className="eyebrow">{genreLabel(genre)}</p>
            <div className="my-auto text-center">
              {coverUrl && (
                <img src={coverUrl} alt="" className="mx-auto mb-6 max-h-[28vh] w-auto object-contain shadow-card" />
              )}
              <h1 className="font-display text-4xl font-semibold leading-tight md:text-6xl">{title || "Sans titre"}</h1>
              {subtitle && <p className="mt-3 font-serif text-lg text-ink-soft italic">{subtitle}</p>}
              {author && <p className="mt-4 font-serif text-lg text-ink-soft italic">{author}</p>}
            </div>
            <span className="eyebrow text-center">Kalam</span>
          </div>
        ) : (
          <article
            className={`book-page w-full${backgroundUrl ? " has-page-background" : ""}`}
            style={backgroundUrl ? { backgroundImage: `url("${backgroundUrl}")` } : undefined}
          >
            <div
              className="book-prose"
              dangerouslySetInnerHTML={{
                __html: generateHTML({ type: "doc", content: pageContent }, baseExtensions),
              }}
            />
            <footer className="book-page-footer">
              <span>{footerText}</span>
              <span>{currentPage}</span>
            </footer>
          </article>
        )}

        <button
          type="button"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages - 1}
          aria-label="Page suivante"
          className="absolute right-2 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-rule bg-card text-ink-soft shadow-card transition hover:border-mist hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 md:right-6"
        >
          <ChevronRight size={24} strokeWidth={1.75} />
        </button>
      </main>
    </div>
  );
}
