"use client";

import { generateHTML, type JSONContent } from "@tiptap/core";
import { ArrowLeft, BookOpen } from "lucide-react";
import { baseExtensions } from "@/lib/editor/extensions";
import { nodeText } from "@/lib/editor/document";
import type { Genre } from "@/lib/types";

const PAGE_CHARACTERS = 2400;

function paginate(content: JSONContent | null | undefined) {
  const pages: JSONContent[][] = [[]];
  let length = 0;

  for (const node of content?.content ?? []) {
    if (node.type === "pageBreak") {
      if (pages.at(-1)?.length) pages.push([]);
      length = 0;
      continue;
    }

    const startsChapter = node.type === "heading" && node.attrs?.level === 1 && pages.at(-1)?.length;
    if (startsChapter || (length >= PAGE_CHARACTERS && pages.at(-1)?.length)) {
      pages.push([]);
      length = 0;
    }

    pages.at(-1)!.push(node);
    length += Math.max(nodeText(node).length, 80);
  }

  return pages.filter((page) => page.length > 0);
}

export function BookMode({
  content,
  title,
  author,
  genre,
  onClose,
}: {
  content: JSONContent | null | undefined;
  title: string;
  author: string | null;
  genre: Genre;
  onClose: () => void;
}) {
  const pages = paginate(content);

  return (
    <div className="book-mode fixed inset-0 z-40 overflow-y-auto bg-wash">
      <header className="sticky top-0 z-10 border-b border-rule bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-ink-soft hover:bg-wash hover:text-ink"
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
            <span className="hidden sm:inline">Retour à l’édition</span>
          </button>
          <span className="ml-auto flex items-center gap-2 text-xs text-mist">
            <BookOpen size={15} strokeWidth={1.75} />
            {pages.length} page{pages.length === 1 ? "" : "s"}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 pb-20 md:px-8 md:py-12">
        <div className="book-title-page book-page mb-8">
          <p className="eyebrow">{genre}</p>
          <div className="my-auto text-center">
            <h1 className="font-display text-4xl font-semibold leading-tight md:text-6xl">{title || "Sans titre"}</h1>
            {author && <p className="mt-4 font-serif text-lg text-ink-soft italic">{author}</p>}
          </div>
          <span className="eyebrow text-center">Kalam</span>
        </div>

        {pages.map((page, index) => (
          <article className="book-page mb-8" key={index}>
            <div
              className="book-prose"
              dangerouslySetInnerHTML={{
                __html: generateHTML({ type: "doc", content: page }, baseExtensions),
              }}
            />
            <p className="book-page-number">{index + 1}</p>
          </article>
        ))}
      </main>
    </div>
  );
}
