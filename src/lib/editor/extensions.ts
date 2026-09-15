import { mergeAttributes, Node, type AnyExtension } from "@tiptap/core";
import TextAlign from "@tiptap/extension-text-align";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: { setPageBreak: () => ReturnType };
    textImage: { setTextImage: (attributes: { src: string; alt?: string }) => ReturnType };
  }
}

export const TextImage = Node.create({
  name: "textImage",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
    };
  },
  parseHTML: () => [{ tag: "img[data-text-image]" }],
  renderHTML: ({ HTMLAttributes }) => ["img", mergeAttributes(HTMLAttributes, { "data-text-image": "", loading: "lazy" })],
  addCommands() {
    return {
      setTextImage:
        (attributes: { src: string; alt?: string }) =>
        ({ chain }) => chain().insertContent([{ type: this.name, attrs: attributes }, { type: "paragraph" }]).run(),
    };
  },
});

/**
 * Saut de page : bloc invisible à l'impression, qui force une nouvelle
 * page dans le livre exporté.
 */
export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML: () => [{ tag: "div[data-page-break]" }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-page-break": "" })],
  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain }) =>
          chain().insertContent([{ type: this.name }, { type: "paragraph" }]).run(),
    };
  },
  addKeyboardShortcuts() {
    return { "Mod-Enter": () => this.editor.commands.setPageBreak() };
  },
});

/** Extensions « structurelles » : utilisées par l'éditeur ET par l'import. */
export const baseExtensions: AnyExtension[] = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    codeBlock: false,
    code: false,
    link: { openOnClick: false, autolink: true },
  }),
  TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
  PageBreak,
  TextImage,
];

/** Extensions complètes de l'éditeur. */
export function editorExtensions(placeholder: string): AnyExtension[] {
  return [...baseExtensions, CharacterCount, Placeholder.configure({ placeholder })];
}
