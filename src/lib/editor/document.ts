import type { JSONContent } from "@tiptap/core";

/** Un chapitre / une section, repéré par un titre dans le texte. */
export interface OutlineItem {
  level: 1 | 2 | 3;
  text: string;
  /** Index du bloc de premier niveau dans le document. */
  index: number;
}

export function nodeText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(nodeText).join("");
}

/** Texte brut du document, un bloc par paragraphe. */
export function docToText(doc: JSONContent | null | undefined): string {
  if (!doc?.content) return "";
  const lines: string[] = [];
  const walk = (n: JSONContent) => {
    if (["paragraph", "heading"].includes(n.type ?? "")) lines.push(nodeText(n));
    else n.content?.forEach(walk);
  };
  doc.content.forEach(walk);
  return lines.join("\n\n").trim();
}

/** Liste des titres (H1–H3) : sert au plan et à la table des matières. */
export function extractOutline(doc: JSONContent | null | undefined): OutlineItem[] {
  return (doc?.content ?? []).flatMap((n, index) =>
    n.type === "heading" && nodeText(n).trim()
      ? [{ level: (n.attrs?.level ?? 1) as 1 | 2 | 3, text: nodeText(n).trim(), index }]
      : [],
  );
}

export const emptyDoc = (): JSONContent => ({ type: "doc", content: [{ type: "paragraph" }] });
