"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  SeparatorHorizontal,
  Underline,
  Undo2,
} from "lucide-react";
import { IconButton } from "@/components/ui";

const ICON = { size: 18, strokeWidth: 1.75 };

/** Barre de mise en forme. Défile horizontalement sur téléphone. */
export function Toolbar({ editor }: { editor: Editor }) {
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

  const c = () => editor.chain().focus();

  return (
    <div className="no-scrollbar flex items-center gap-0.5 overflow-x-auto px-3 py-1.5 md:justify-center">
      <IconButton label="Annuler" disabled={!s.canUndo} onClick={() => c().undo().run()}>
        <Undo2 {...ICON} />
      </IconButton>
      <IconButton label="Rétablir" disabled={!s.canRedo} onClick={() => c().redo().run()}>
        <Redo2 {...ICON} />
      </IconButton>
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
    </div>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px shrink-0 bg-rule" />;
