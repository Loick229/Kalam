"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { ArrowLeft, BookDown, BookOpen, Check, FileText, ListTree, Maximize2, Minimize2, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DetailsDrawer } from "@/components/editor/details-drawer";
import { BookMode } from "@/components/editor/book-mode";
import { Outline, type HeadingEntry } from "@/components/editor/outline";
import { Toolbar } from "@/components/editor/toolbar";
import { Drawer, IconButton } from "@/components/ui";
import { emptyDoc } from "@/lib/editor/document";
import { editorExtensions } from "@/lib/editor/extensions";
import { draftKey, readBackup, useAutosave, type SaveState, type WritingPatch } from "@/lib/editor/use-autosave";
import { genreLabel } from "@/lib/labels";
import { uploadCover } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import type { Writing } from "@/lib/types";
import { cn, estimatePages, excerpt } from "@/lib/utils";

const PLACEHOLDERS: Record<string, string> = {
  poeme: "Le premier vers…",
  nouvelle: "Il était une fois, ou pas…",
  livre: "Chapitre premier. Tout commence ici…",
  texte: "Écrivez librement…",
  document: "Écrivez librement…",
};

export function Studio({
  initial,
  initialCoverUrl,
  userId,
}: {
  initial: Writing;
  initialCoverUrl: string | null;
  userId: string;
}) {
  const { state, savedAt, queue, flush } = useAutosave(initial.id);
  const [meta, setMeta] = useState({
    title: initial.title,
    subtitle: initial.subtitle,
    author: initial.author,
    genre: initial.genre,
    status: initial.status,
    summary: initial.summary,
    tags: initial.tags,
  });
  const [coverPath, setCoverPath] = useState(initial.cover_path);
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [coverBusy, setCoverBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [outlineAside, setOutlineAside] = useState(true);
  const [outlineDrawer, setOutlineDrawer] = useState(false);
  const [focus, setFocus] = useState(false);
  const [bookMode, setBookMode] = useState(false);
  const [bookContent, setBookContent] = useState(initial.content);
  const [headings, setHeadings] = useState<HeadingEntry[]>([]);
  const [counts, setCounts] = useState({ words: initial.word_count, chars: initial.content_text.length });
  const [backup, setBackup] = useState<ReturnType<typeof readBackup>>(null);
  const outlineTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* ---------------------------------------------------------------- */
  /*  Éditeur                                                          */
  /* ---------------------------------------------------------------- */

  const persistContent = useCallback(
    (ed: Editor) => {
      const text = ed.getText({ blockSeparator: "\n\n" });
      setBookContent(ed.getJSON());
      queue({
        content: ed.getJSON(),
        content_text: text,
        excerpt: excerpt(text, 240),
        word_count: ed.storage.characterCount.words(),
      });
    },
    [queue],
  );

  /** Plan des chapitres et compteurs, recalculés après une courte pause. */
  const refreshOutline = useCallback((ed: Editor) => {
    clearTimeout(outlineTimer.current);
    outlineTimer.current = setTimeout(() => {
      setCounts({ words: ed.storage.characterCount.words(), chars: ed.storage.characterCount.characters() });
      const list: HeadingEntry[] = [];
      ed.state.doc.forEach((node, offset) => {
        if (node.type.name === "heading" && node.textContent.trim()) {
          list.push({ level: node.attrs.level, text: node.textContent.trim(), pos: offset });
        }
      });
      setHeadings(list);
    }, 400);
  }, []);

  const editor = useEditor({
    extensions: editorExtensions(PLACEHOLDERS[initial.genre] ?? PLACEHOLDERS.texte),
    content: initial.content ?? emptyDoc(),
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "kalam-prose", "data-genre": initial.genre, spellcheck: "true", lang: "fr" },
    },
    onCreate: ({ editor }) => refreshOutline(editor),
    onUpdate: ({ editor }) => {
      persistContent(editor);
      refreshOutline(editor);
    },
  });

  // Le style « poème » suit le genre choisi.
  useEffect(() => {
    editor?.setOptions({
      editorProps: {
        attributes: { class: "kalam-prose", "data-genre": meta.genre, spellcheck: "true", lang: "fr" },
      },
    });
  }, [editor, meta.genre]);

  // Copie de secours plus récente trouvée sur l'appareil ?
  useEffect(() => {
    setBackup(readBackup(initial.id, initial.updated_at));
  }, [initial.id, initial.updated_at]);

  /* ---------------------------------------------------------------- */
  /*  Actions                                                          */
  /* ---------------------------------------------------------------- */

  const changeMeta = useCallback(
    (patch: WritingPatch) => {
      setMeta((m) => ({ ...m, ...patch }));
      queue(patch);
    },
    [queue],
  );

  async function pickCover(file: File) {
    setCoverBusy(true);
    try {
      const supabase = createClient();
      const path = await uploadCover(supabase, userId, initial.id, file);
      const old = coverPath;
      queue({ cover_path: path });
      await flush();
      if (old) await supabase.storage.from("covers").remove([old]);
      setCoverPath(path);
      setCoverUrl(URL.createObjectURL(file));
    } catch (err) {
      alert(`La couverture n’a pas pu être envoyée : ${(err as Error).message}`);
    } finally {
      setCoverBusy(false);
    }
  }

  async function removeCover() {
    if (!coverPath) return;
    const supabase = createClient();
    queue({ cover_path: null });
    await flush();
    await supabase.storage.from("covers").remove([coverPath]);
    setCoverPath(null);
    setCoverUrl(null);
  }

  function restoreBackup() {
    if (!backup || !editor) return;
    const { content, ...rest } = backup.patch;
    if (content) editor.commands.setContent(content, { emitUpdate: true });
    const metaKeys = ["title", "subtitle", "author", "genre", "status", "summary", "tags"] as const;
    const metaPatch = Object.fromEntries(metaKeys.filter((k) => k in rest).map((k) => [k, rest[k]]));
    if (Object.keys(metaPatch).length) changeMeta(metaPatch as WritingPatch);
    queue(backup.patch);
    setBackup(null);
  }

  function dismissBackup() {
    try {
      localStorage.removeItem(draftKey(initial.id));
    } catch {}
    setBackup(null);
  }

  function jumpTo(pos: number) {
    if (!editor) return;
    const dom = editor.view.nodeDOM(pos);
    if (dom instanceof HTMLElement) dom.scrollIntoView({ behavior: "smooth", block: "start" });
    editor.commands.setTextSelection(pos + 1);
    setOutlineDrawer(false);
  }

  function addChapter() {
    if (!editor) return;
    const n = headings.filter((h) => h.level === 1).length + 1;
    editor
      .chain()
      .focus("end")
      .insertContent([
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: `Chapitre ${n}` }] },
        { type: "paragraph" },
      ])
      .run();
    setOutlineDrawer(false);
  }

  function toggleOutline() {
    if (window.matchMedia("(min-width: 1280px)").matches) setOutlineAside((v) => !v);
    else setOutlineDrawer(true);
  }

  const toggleFocus = useCallback(() => {
    setFocus((f) => {
      const next = !f;
      try {
        if (next && document.documentElement.requestFullscreen && window.matchMedia("(min-width: 768px)").matches) {
          void document.documentElement.requestFullscreen();
        } else if (!next && document.fullscreenElement) {
          void document.exitFullscreen();
        }
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focus) toggleFocus();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void flush();
      }
    };
    const onFs = () => !document.fullscreenElement && setFocus((f) => (f ? false : f));
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [focus, toggleFocus, flush]);

  // Garder le titre de l'onglet à jour.
  useEffect(() => {
    document.title = `${meta.title || "Sans titre"} · Kalam`;
  }, [meta.title]);

  /* ---------------------------------------------------------------- */
  /*  Rendu                                                            */
  /* ---------------------------------------------------------------- */

  const showAside = outlineAside && !focus;

  return (
    <div className="min-h-dvh bg-paper">
      {/* Barre du haut */}
      <header
        className={cn(
          "sticky top-0 z-30 border-b border-rule bg-paper/92 backdrop-blur-md transition",
          focus && "pointer-events-none -translate-y-full opacity-0",
        )}
      >
        <div className="flex h-14 items-center gap-2 px-2 md:px-4">
          <Link
            href="/"
            onClick={() => void flush()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-ink-soft hover:bg-wash hover:text-ink"
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
            <span className="hidden sm:inline">Bibliothèque</span>
          </Link>

          <SaveIndicator state={state} savedAt={savedAt} />

          <div className="ml-auto flex items-center gap-0.5">
            <IconButton label="Plan & chapitres" onClick={toggleOutline}>
              <ListTree size={18} strokeWidth={1.75} />
            </IconButton>
            <IconButton label="Informations" onClick={() => setDetailsOpen(true)}>
              <SlidersHorizontal size={18} strokeWidth={1.75} />
            </IconButton>
            <IconButton label="Mode focus" onClick={toggleFocus}>
              <Maximize2 size={18} strokeWidth={1.75} />
            </IconButton>
            <IconButton label="Mode livre" onClick={() => setBookMode(true)}>
              <BookOpen size={18} strokeWidth={1.75} />
            </IconButton>
            <span className="mx-1.5 hidden h-5 w-px bg-rule sm:block" />
            <Link
              href={`/ecrits/${initial.id}/fiche`}
              onClick={() => void flush()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-ink-soft hover:bg-wash hover:text-ink"
              title="Fiche de résumé"
            >
              <FileText size={17} strokeWidth={1.75} />
              <span className="hidden md:inline">Fiche</span>
            </Link>
            <Link
              href={`/ecrits/${initial.id}/livre`}
              onClick={() => void flush()}
              className="ml-1 inline-flex h-9 items-center gap-1.5 rounded-md bg-red px-3 text-sm font-medium text-white hover:brightness-110"
            >
              <BookDown size={17} strokeWidth={1.75} />
              <span className="hidden sm:inline">Exporter</span>
            </Link>
          </div>
        </div>

        {editor && (
          <div className="border-t border-rule">
            <Toolbar editor={editor} />
          </div>
        )}
      </header>

      {focus && (
        <button
          onClick={toggleFocus}
          className="fixed top-3 right-3 z-40 inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs text-mist opacity-40 transition hover:bg-wash hover:opacity-100"
        >
          <Minimize2 size={15} strokeWidth={1.75} /> Quitter le focus
        </button>
      )}

      {backup && (
        <div className="border-b border-rule bg-wash">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-red" />
            <span className="flex-1 text-ink-soft">
              Une version plus récente, non synchronisée, a été retrouvée sur cet appareil.
            </span>
            <button onClick={restoreBackup} className="font-medium text-blue-ink hover:underline">
              Restaurer
            </button>
            <button onClick={dismissBackup} className="text-mist hover:text-ink">
              Ignorer
            </button>
          </div>
        </div>
      )}

      <div className="relative mx-auto flex max-w-[1400px]">
        {/* Plan (grand écran) */}
        {showAside && (
          <aside className="sticky top-[7.5rem] hidden h-[calc(100dvh-7.5rem)] w-72 shrink-0 overflow-y-auto border-r border-rule px-6 py-10 xl:block">
            <p className="eyebrow mb-4">Plan</p>
            <Outline headings={headings} onJump={jumpTo} onAddChapter={addChapter} />
          </aside>
        )}

        {/* Page */}
        <main className={cn("mx-auto w-full max-w-[44rem] px-5 pb-40 sm:px-8", focus ? "pt-24" : "pt-10 md:pt-16")}>
          <div className={cn("mb-10 transition", focus && "opacity-60")}>
            <p className="eyebrow">{genreLabel(meta.genre)}</p>
            <AutoGrowTitle
              value={meta.title === "Sans titre" ? "" : meta.title}
              onChange={(v) => changeMeta({ title: v || "Sans titre" })}
              onEnter={() => editor?.commands.focus("start")}
            />
            <input
              value={meta.subtitle ?? ""}
              onChange={(e) => changeMeta({ subtitle: e.target.value || null })}
              placeholder="Sous-titre (facultatif)"
              className="mt-1 w-full bg-transparent font-serif text-lg text-ink-soft italic placeholder:text-mist/70 focus:outline-none"
            />
            <div className="mt-6 flex items-center gap-3">
              <span className="h-px w-12 bg-blue" />
              <span className="h-1.5 w-1.5 rounded-full bg-red" />
            </div>
          </div>

          <EditorContent editor={editor} />
        </main>
      </div>

      {/* Compteur */}
      <footer
        className={cn(
          "fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 transition md:right-5 md:bottom-5",
          focus && "opacity-30 hover:opacity-100",
        )}
      >
        <p className="rounded-full border border-rule bg-paper/95 px-3 py-1.5 text-xs text-mist tabular-nums shadow-card backdrop-blur">
          {counts.words.toLocaleString("fr-FR")} mots
          <span className="hidden sm:inline"> · {counts.chars.toLocaleString("fr-FR")} caractères</span> · ≈{" "}
          {estimatePages(counts.words)} p.
        </p>
      </footer>

      <Drawer open={outlineDrawer} onClose={() => setOutlineDrawer(false)} title="Plan">
        <Outline headings={headings} onJump={jumpTo} onAddChapter={addChapter} />
      </Drawer>

      <DetailsDrawer
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        writing={initial}
        meta={meta}
        onChange={changeMeta}
        coverUrl={coverUrl}
        coverBusy={coverBusy}
        onCoverPick={pickCover}
        onCoverRemove={removeCover}
      />

      {bookMode && (
        <BookMode
          content={bookContent}
          title={meta.title}
          author={meta.author}
          genre={meta.genre}
          onClose={() => setBookMode(false)}
        />
      )}
    </div>
  );
}

function SaveIndicator({ state, savedAt }: { state: SaveState; savedAt: Date | null }) {
  const time = savedAt?.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const map: Record<SaveState, { text: string; className: string }> = {
    saved: { text: time ? `Enregistré à ${time}` : "À jour", className: "text-mist" },
    pending: { text: "Modifié", className: "text-mist" },
    saving: { text: "Enregistrement…", className: "text-mist" },
    error: { text: "Échec — nouvel essai…", className: "text-red" },
    offline: { text: "Hors ligne · gardé sur l’appareil", className: "text-red" },
  };
  const { text, className } = map[state];
  return (
    <span className={cn("flex items-center gap-1.5 truncate text-xs", className)} aria-live="polite">
      {state === "saved" && <Check size={13} strokeWidth={2} />}
      {(state === "pending" || state === "saving") && (
        <span className={cn("h-1.5 w-1.5 rounded-full bg-blue", state === "saving" && "animate-pulse")} />
      )}
      {text}
    </span>
  );
}

/** Titre sur plusieurs lignes, qui s'agrandit en tapant. */
function AutoGrowTitle({
  value,
  onChange,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter();
        }
      }}
      placeholder="Sans titre"
      className="mt-2 w-full resize-none overflow-hidden bg-transparent font-display text-[2.25rem] leading-[1.15] font-semibold tracking-tight placeholder:text-mist/60 focus:outline-none md:text-[3rem]"
    />
  );
}
