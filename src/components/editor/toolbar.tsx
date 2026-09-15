"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { useRef } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  Bold,
  ChevronDown,
  ChevronUp,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  ImagePlus,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Search,
  Trash2,
  SeparatorHorizontal,
  Underline,
  Undo2,
} from "lucide-react";
import { IconButton } from "@/components/ui";
import { useEffect, useState } from "react";

const ICON = { size: 18, strokeWidth: 1.75 };

/** Barre de mise en forme. Défile horizontalement sur téléphone. */
export function Toolbar({ editor, onImage }: { editor: Editor; onImage: (file: File) => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      center: e.isActive({ textAlign: "center" }),
      justify: e.isActive({ textAlign: "justify" }),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const [searchOpen, setSearchOpen] = useState(false);

  const c = () => editor.chain().focus();

  return (
    <div className="no-scrollbar flex items-center gap-0.5 overflow-x-auto px-3 py-1.5 md:justify-center">
      <IconButton label="Annuler" disabled={!s.canUndo} onClick={() => c().undo().run()}>
        <Undo2 {...ICON} />
      </IconButton>
      <IconButton label="Rétablir" disabled={!s.canRedo} onClick={() => c().redo().run()}>
        <Redo2 {...ICON} />
      </IconButton>
      <SearchButton editor={editor} open={searchOpen} onToggle={() => setSearchOpen((open) => !open)} />
      <Sep />
      <IconButton label="Titre de chapitre" active={s.h1} onClick={() => c().toggleHeading({ level: 1 }).run()}>
        <Heading1 {...ICON} />
      </IconButton>
      <IconButton label="Section" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>
        <Heading2 {...ICON} />
      </IconButton>
      <IconButton label="Sous-section" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>
        <Heading3 {...ICON} />
      </IconButton>
      <Sep />
      <IconButton label="Gras (Ctrl+B)" active={s.bold} onClick={() => c().toggleBold().run()}>
        <Bold {...ICON} />
      </IconButton>
      <IconButton label="Italique (Ctrl+I)" active={s.italic} onClick={() => c().toggleItalic().run()}>
        <Italic {...ICON} />
      </IconButton>
      <IconButton label="Souligné (Ctrl+U)" active={s.underline} onClick={() => c().toggleUnderline().run()}>
        <Underline {...ICON} />
      </IconButton>
      <Sep />
      <IconButton label="Liste à puces" active={s.bullet} onClick={() => c().toggleBulletList().run()}>
        <List {...ICON} />
      </IconButton>
      <IconButton label="Liste numérotée" active={s.ordered} onClick={() => c().toggleOrderedList().run()}>
        <ListOrdered {...ICON} />
      </IconButton>
      <IconButton label="Citation" active={s.quote} onClick={() => c().toggleBlockquote().run()}>
        <Quote {...ICON} />
      </IconButton>
      <Sep />
      <IconButton label="Aligner à gauche" active={!s.center && !s.justify} onClick={() => c().setTextAlign("left").run()}>
        <AlignLeft {...ICON} />
      </IconButton>
      <IconButton label="Centrer" active={s.center} onClick={() => c().setTextAlign("center").run()}>
        <AlignCenter {...ICON} />
      </IconButton>
      <IconButton label="Justifier" active={s.justify} onClick={() => c().setTextAlign("justify").run()}>
        <AlignJustify {...ICON} />
      </IconButton>
      <Sep />
      <IconButton label="Séparateur de scène" onClick={() => c().setHorizontalRule().run()}>
        <Minus {...ICON} />
      </IconButton>
      <IconButton label="Saut de page (Ctrl+Entrée)" onClick={() => c().setPageBreak().run()}>
        <SeparatorHorizontal {...ICON} />
      </IconButton>
      <ImageButton onImage={onImage} />
    </div>
  );
}

type Match = { from: number; to: number };

function SearchButton({ editor, open, onToggle }: { editor: Editor; open: boolean; onToggle: () => void }) {
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(0);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const update = () => setRevision((value) => value + 1);
    editor.on("transaction", update);
    return () => editor.off("transaction", update);
  }, [editor]);

  const matches = findMatches(editor, query);
  const active = matches[current] ?? null;

  useEffect(() => {
    setCurrent(0);
  }, [query]);

  useEffect(() => {
    setCurrent((value) => Math.min(value, Math.max(0, matches.length - 1)));
  }, [revision, matches.length]);

  useEffect(() => {
    if (active) selectMatch(editor, active);
  }, [editor, query, current]);

  function move(step: number) {
    if (!matches.length) return;
    const next = (current + step + matches.length) % matches.length;
    setCurrent(next);
    selectMatch(editor, matches[next]);
  }

  function deleteCurrent() {
    if (!active) return;
    editor.chain().focus().deleteRange(active).run();
  }

  function deleteAll() {
    if (!matches.length) return;
    const ranges = [...matches].reverse();
    const chain = editor.chain().focus();
    for (const range of ranges) chain.deleteRange(range);
    chain.run();
  }

  return (
    <div className="relative flex shrink-0 items-center">
      <IconButton label="Rechercher dans le texte" active={open} onClick={onToggle}>
        <Search {...ICON} />
      </IconButton>
      {open && (
        <div className="absolute top-10 left-0 z-40 flex items-center gap-1 rounded-md border border-rule bg-card p-1.5 shadow-card sm:left-1/2 sm:-translate-x-1/2">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                move(event.shiftKey ? -1 : 1);
              }
              if (event.key === "Escape") onToggle();
            }}
            placeholder="Rechercher…"
            aria-label="Rechercher dans le texte"
            className="h-8 w-40 bg-transparent px-2 text-sm text-ink outline-none placeholder:text-mist sm:w-56"
          />
          <span className="min-w-12 text-center text-xs tabular-nums text-mist">
            {matches.length ? `${current + 1}/${matches.length}` : query ? "0 résultat" : ""}
          </span>
          <IconButton label="Résultat précédent" disabled={!matches.length} onClick={() => move(-1)}>
            <ChevronUp {...ICON} />
          </IconButton>
          <IconButton label="Résultat suivant" disabled={!matches.length} onClick={() => move(1)}>
            <ChevronDown {...ICON} />
          </IconButton>
          <IconButton label="Supprimer le résultat courant" disabled={!active} onClick={deleteCurrent}>
            <Trash2 {...ICON} />
          </IconButton>
          <button
            type="button"
            disabled={!matches.length}
            onClick={deleteAll}
            className="h-8 whitespace-nowrap rounded px-2 text-xs text-red hover:bg-red/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Tout supprimer
          </button>
        </div>
      )}
    </div>
  );
}

function findMatches(editor: Editor, query: string): Match[] {
  const value = query.trim();
  if (!value) return [];
  const needle = value.toLocaleLowerCase();
  const matches: Match[] = [];
  editor.state.doc.descendants((node, position) => {
    if (!node.isText) return;
    const text = node.text?.toLocaleLowerCase() ?? "";
    let index = text.indexOf(needle);
    while (index !== -1) {
      matches.push({ from: position + index, to: position + index + value.length });
      index = text.indexOf(needle, index + value.length);
    }
  });
  return matches;
}

function selectMatch(editor: Editor, match: Match) {
  editor.commands.setTextSelection(match);
  editor.commands.scrollIntoView();
}

function ImageButton({ onImage }: { onImage: (file: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <IconButton label="Insérer une image" onClick={() => input.current?.click()}>
        <ImagePlus {...ICON} />
      </IconButton>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onImage(file);
          event.target.value = "";
        }}
      />
    </>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px shrink-0 bg-rule" />;
