"use client";

import { generateHTML, type JSONContent } from "@tiptap/core";
import { ArrowLeft, BookOpen, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { baseExtensions } from "@/lib/editor/extensions";
import { nodeText } from "@/lib/editor/document";
import { genreLabel } from "@/lib/labels";
import type { Genre, PageTheme } from "@/lib/types";

const PAGE_CHARACTERS = 2400;
const BOOKMARK_PREFIX = "kalam-bookmark:";

type Bookmark = { page: number; scroll: number; at: string };

function bookmarkStorageKey(key: string) {
  return `${BOOKMARK_PREFIX}${key}`;
}

// La page de titre (index 0) ne se marque pas : un marque-page qui y pointe
// ne dirait rien de plus que « la lecture n'a pas commencé ».
function readBookmark(key: string | undefined): Bookmark | null {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(bookmarkStorageKey(key));
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<Bookmark> | null;
    if (typeof saved?.page !== "number" || saved.page < 1) return null;
    return {
      page: saved.page,
      scroll: typeof saved.scroll === "number" ? saved.scroll : 0,
      at: typeof saved.at === "string" ? saved.at : "",
    };
  } catch {
    return null;
  }
}

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
  bookmarkKey,
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
  bookmarkKey?: string;
  onClose?: () => void;
}) {
  const pages = paginate(content);
  const totalPages = pages.length + 1;
  const [currentPage, setCurrentPage] = useState(0);
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [resumeOpen, setResumeOpen] = useState(false);
  const proseRef = useRef<HTMLDivElement | null>(null);
  const pendingScroll = useRef(0);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const close = onClose ?? (() => window.history.back());

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  };

  // `localStorage` n'existe pas au rendu serveur (lien de partage) : on lit le
  // marque-page après le montage, et on propose la reprise au lieu de l'imposer.
  useEffect(() => {
    const saved = readBookmark(bookmarkKey);
    if (!saved) return;
    setBookmark(saved);
    setResumeOpen(true);
  }, [bookmarkKey]);

  const saveBookmark = useCallback(
    (page: number, scroll: number) => {
      if (!bookmarkKey || page < 1) return;
      const next: Bookmark = { page, scroll, at: new Date().toISOString() };
      setBookmark(next);
      try {
        localStorage.setItem(bookmarkStorageKey(bookmarkKey), JSON.stringify(next));
      } catch {
        // Stockage indisponible (navigation privée) : la lecture continue sans repère.
      }
    },
    [bookmarkKey],
  );

  const clearBookmark = () => {
    setBookmark(null);
    setResumeOpen(false);
    if (!bookmarkKey) return;
    try {
      localStorage.removeItem(bookmarkStorageKey(bookmarkKey));
    } catch {
      // idem
    }
  };

  const resume = () => {
    if (!bookmark) return;
    pendingScroll.current = bookmark.scroll;
    setResumeOpen(false);
    goToPage(bookmark.page);
  };

  // Chaque tour de page déplace le marque-page ; un saut vers le marque-page
  // restaure en plus le défilement enregistré à l'intérieur de la page.
  useEffect(() => {
    const scroll = pendingScroll.current;
    pendingScroll.current = 0;
    if (scroll && proseRef.current) proseRef.current.scrollTop = scroll;
    saveBookmark(currentPage, proseRef.current?.scrollTop ?? 0);
  }, [currentPage, saveBookmark]);

  const onProseScroll = () => {
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => saveBookmark(currentPage, proseRef.current?.scrollTop ?? 0), 400);
  };

  useEffect(() => () => clearTimeout(scrollTimer.current), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") goToPage(currentPage - 1);
      if (event.key === "ArrowRight") goToPage(currentPage + 1);
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, currentPage, totalPages]);

  // `key` sur la page : un nœud neuf à chaque tour de page, donc un défilement
  // qui repart du haut au lieu de garder la position de la page précédente.
  const isTitlePage = currentPage === 0;
  const pageContent = pages[currentPage - 1] ?? [];
  const bookmarkPage = bookmark ? Math.min(bookmark.page, totalPages - 1) : null;
  const onBookmark = bookmarkPage !== null && bookmarkPage === currentPage;
  const showResume = resumeOpen && isTitlePage;

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

          {bookmarkPage !== null &&
            (onBookmark ? (
              <span
                className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-ink-soft"
                title="Votre lecture est enregistrée sur cette page"
              >
                <BookmarkCheck size={17} strokeWidth={1.75} />
                <span className="hidden sm:inline">Marque-page</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={resume}
                title={`Reprendre à la page ${bookmarkPage + 1}`}
                className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-ink-soft hover:bg-wash hover:text-ink"
              >
                <Bookmark size={17} strokeWidth={1.75} />
                <span className="hidden sm:inline">Reprendre</span>
                <span>p. {bookmarkPage + 1}</span>
              </button>
            ))}

          <span className={`flex items-center gap-2 text-xs text-mist${bookmarkPage === null ? " ml-auto" : ""}`}>
            <BookOpen size={15} strokeWidth={1.75} />
            Page {currentPage + 1} sur {totalPages}
          </span>
        </div>
      </header>

      <main className="relative mx-auto flex h-[calc(100dvh-3.5rem)] w-full max-w-7xl items-center px-4 py-2 md:px-8 md:py-4">
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
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-6 flex flex-col items-center justify-center text-center">
                {coverUrl && (
                  <img src={coverUrl} alt="" className="mx-auto max-h-[28vh] w-auto object-contain shadow-card" />
                )}
              </div>

              <h1 className="font-display text-4xl font-semibold leading-none tracking-[0.08em] md:text-7xl">
                {title || "Sans titre"}
              </h1>

              {subtitle && <p className="mt-3 font-serif text-lg italic text-ink-soft">{subtitle}</p>}
              {author && <p className="mt-2 font-serif text-lg italic text-ink-soft">{author}</p>}
            </div>
            <span className="eyebrow text-center">Kalam</span>
          </div>
        ) : (
          <article
            key={currentPage}
            className={`book-page flex-1 min-h-0 w-full${backgroundUrl ? " has-page-background" : ""}`}
            style={backgroundUrl ? { backgroundImage: `url("${backgroundUrl}")` } : undefined}
          >
            <div
              ref={proseRef}
              onScroll={onProseScroll}
              className="book-prose"
              dangerouslySetInnerHTML={{
                __html: generateHTML({ type: "doc", content: pageContent }, baseExtensions),
              }}
            />
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

        {showResume && bookmarkPage !== null && (
          <div className="absolute inset-x-4 bottom-6 z-20 mx-auto flex max-w-md items-center gap-3 rounded-lg border border-rule bg-card px-4 py-3 shadow-card md:bottom-10">
            <Bookmark size={18} strokeWidth={1.75} className="shrink-0 text-ink-soft" />
            <p className="flex-1 text-sm text-ink-soft">Votre lecture s’était arrêtée page {bookmarkPage + 1}.</p>
            <button
              type="button"
              onClick={resume}
              className="shrink-0 rounded-md border border-rule px-3 py-1.5 text-sm text-ink transition hover:border-mist hover:bg-wash"
            >
              Reprendre
            </button>
            <button
              type="button"
              onClick={clearBookmark}
              aria-label="Recommencer depuis le début"
              title="Recommencer depuis le début"
              className="shrink-0 rounded-md p-1.5 text-mist transition hover:bg-wash hover:text-ink"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
