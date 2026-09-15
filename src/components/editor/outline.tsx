"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeadingEntry {
  level: number;
  text: string;
  pos: number;
}

/** Plan du texte : chapitres (H1), sections (H2), sous-sections (H3). */
export function Outline({
  headings,
  onJump,
  onAddChapter,
}: {
  headings: HeadingEntry[];
  onJump: (pos: number) => void;
  onAddChapter: () => void;
}) {
  let chapter = 0;
  return (
    <div>
      {headings.length === 0 ? (
        <p className="font-serif text-sm leading-relaxed text-ink-soft">
          Aucun chapitre pour l’instant. Les titres (H1, H2, H3) que vous placez dans le texte apparaissent ici
          et forment la table des matières du livre.
        </p>
      ) : (
        <ol className="space-y-0.5">
          {headings.map((h) => {
            if (h.level === 1) chapter += 1;
            return (
              <li key={h.pos}>
                <button
                  onClick={() => onJump(h.pos)}
                  className={cn(
                    "group flex w-full items-baseline gap-2 rounded-md py-1.5 pr-2 text-left transition hover:bg-wash",
                    h.level === 1 && "pl-2 font-display text-[0.9375rem] font-semibold text-ink",
                    h.level === 2 && "pl-7 text-sm text-ink-soft",
                    h.level === 3 && "pl-11 text-[0.8125rem] text-mist italic",
                  )}
                >
                  {h.level === 1 && (
                    <span className="w-4 shrink-0 font-sans text-[0.6875rem] font-medium text-mist tabular-nums">
                      {String(chapter).padStart(2, "0")}
                    </span>
                  )}
                  <span className="line-clamp-2 group-hover:text-blue-ink">{h.text}</span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <button
        onClick={onAddChapter}
        className="mt-4 inline-flex items-center gap-1.5 text-sm text-blue-ink hover:underline"
      >
        <Plus size={15} strokeWidth={2} />
        Ajouter un chapitre
      </button>
    </div>
  );
}
