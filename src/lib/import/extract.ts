"use client";

/**
 * Extraction du texte des documents importés, directement dans le navigateur.
 * Avantages : aucune limite de taille côté serveur, rien ne transite ailleurs
 * que vers votre propre base Supabase.
 *
 * Chaque format est converti en HTML simple, puis transformé en document
 * Tiptap : le texte importé devient éditable comme n'importe quel écrit.
 */

import { generateJSON, type JSONContent } from "@tiptap/core";
import { baseExtensions } from "@/lib/editor/extensions";

export const ACCEPTED = [".docx", ".pdf", ".txt", ".md", ".odt"] as const;
export type SourceFormat = "docx" | "pdf" | "txt" | "md" | "odt";

export interface ExtractResult {
  format: SourceFormat;
  title: string;
  content: JSONContent;
}

export function detectFormat(file: File): SourceFormat | null {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "markdown") return "md";
  return (["docx", "pdf", "txt", "md", "odt"] as const).find((f) => f === ext) ?? null;
}

export async function extractDocument(file: File): Promise<ExtractResult> {
  const format = detectFormat(file);
  if (!format) throw new Error("Format non pris en charge. Formats acceptés : " + ACCEPTED.join(", "));

  let html: string;
  switch (format) {
    case "txt":
      html = textToHtml(await file.text());
      break;
    case "md":
      html = await markdownToHtml(await file.text());
      break;
    case "docx":
      html = await docxToHtml(file);
      break;
    case "pdf":
      html = await pdfToHtml(file);
      break;
    case "odt":
      html = await odtToHtml(file);
      break;
  }

  if (!html.replace(/<[^>]+>/g, "").trim()) {
    throw new Error(
      format === "pdf"
        ? "Aucun texte trouvé : ce PDF est probablement une image scannée."
        : "Le document semble vide.",
    );
  }

  return {
    format,
    title: titleFromFilename(file.name),
    content: generateJSON(html, baseExtensions) as JSONContent,
  };
}

/* ------------------------------------------------------------------ */

function titleFromFilename(name: string) {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Texte brut : une ligne vide = nouveau paragraphe, un retour = retour à la ligne (poèmes). */
function textToHtml(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block.split("\n").map(escapeHtml).join("<br>")}</p>`)
    .join("");
}

async function markdownToHtml(md: string) {
  const { marked } = await import("marked");
  return marked.parse(md, { breaks: true, gfm: true, async: false }) as string;
}

async function docxToHtml(file: File) {
  const mammoth = (await import("mammoth")).default;
  const { value } = await mammoth.convertToHtml(
    { arrayBuffer: await file.arrayBuffer() },
    {
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Titre'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
        "p[style-name='Quote'] => blockquote > p:fresh",
        "p[style-name='Citation'] => blockquote > p:fresh",
        "br[type='page'] => div.page-break",
      ],
      ignoreEmptyParagraphs: true,
    },
  );
  // Images ignorées (l'éditeur est dédié au texte), sauts de page conservés.
  return value.replace(/<img[^>]*>/g, "").replace(/<div class="page-break"><\/div>/g, "<div data-page-break></div>");
}

/**
 * PDF : on récupère le texte page par page, puis on reconstruit les
 * paragraphes (les PDF coupent les lignes à la largeur de la page).
 */
async function pdfToHtml(file: File) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
  const { text } = await extractText(pdf, { mergePages: false });

  const lines = text.join("\n\n").replace(/\r/g, "").split("\n");
  const lengths = lines.map((l) => l.trim().length).filter((n) => n > 20);
  const typical = lengths.length ? lengths.sort((a, b) => a - b)[Math.floor(lengths.length * 0.75)] : 80;

  const paragraphs: string[] = [];
  let current = "";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (current) paragraphs.push(current);
      current = "";
      continue;
    }
    if (/^\d{1,4}$/.test(line)) continue; // numéros de page isolés
    // Mot coupé en fin de ligne : « exem- / ple »
    current = current.endsWith("-") ? current.slice(0, -1) + line : current ? `${current} ${line}` : line;
    // Ligne nettement plus courte que la normale et finissant une phrase → fin de paragraphe.
    if (line.length < typical * 0.7 && /[.!?»…:"]$/.test(line)) {
      paragraphs.push(current);
      current = "";
    }
  }
  if (current) paragraphs.push(current);

  return paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
}

/** ODT (LibreOffice) : lecture du content.xml de l'archive. */
async function odtToHtml(file: File) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = await zip.file("content.xml")?.async("string");
  if (!xml) throw new Error("Fichier ODT illisible.");

  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const TEXT = "urn:oasis:names:tc:opendocument:xmlns:text:1.0";
  const STYLE = "urn:oasis:names:tc:opendocument:xmlns:style:1.0";
  const FO = "urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0";

  // Styles automatiques → gras / italique / souligné
  const marks: Record<string, { b?: boolean; i?: boolean; u?: boolean }> = {};
  for (const s of Array.from(doc.getElementsByTagNameNS(STYLE, "style"))) {
    const props = s.getElementsByTagNameNS(STYLE, "text-properties")[0];
    if (!props) continue;
    marks[s.getAttributeNS(STYLE, "name") ?? ""] = {
      b: props.getAttributeNS(FO, "font-weight") === "bold",
      i: props.getAttributeNS(FO, "font-style") === "italic",
      u: !!props.getAttributeNS(STYLE, "text-underline-style") && props.getAttributeNS(STYLE, "text-underline-style") !== "none",
    };
  }

  const inline = (node: Node): string => {
    let out = "";
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += escapeHtml(child.textContent ?? "");
        return;
      }
      const el = child as Element;
      switch (el.localName) {
        case "span": {
          const m = marks[el.getAttributeNS(TEXT, "style-name") ?? ""] ?? {};
          let inner = inline(el);
          if (m.b) inner = `<strong>${inner}</strong>`;
          if (m.i) inner = `<em>${inner}</em>`;
          if (m.u) inner = `<u>${inner}</u>`;
          out += inner;
          break;
        }
        case "line-break":
          out += "<br>";
          break;
        case "s":
          out += " ".repeat(Number(el.getAttributeNS(TEXT, "c") ?? 1));
          break;
        case "tab":
          out += " ";
          break;
        case "a":
          out += inline(el);
          break;
        case "note":
        case "soft-page-break":
          break;
        default:
          out += inline(el);
      }
    });
    return out;
  };

  const block = (el: Element): string => {
    switch (el.localName) {
      case "h": {
        const level = Math.min(3, Math.max(1, Number(el.getAttributeNS(TEXT, "outline-level") ?? 1)));
        return `<h${level}>${inline(el)}</h${level}>`;
      }
      case "p": {
        const content = inline(el);
        return content.trim() ? `<p>${content}</p>` : "";
      }
      case "list":
        return `<ul>${Array.from(el.children)
          .filter((c) => c.localName === "list-item")
          .map((li) => `<li>${Array.from(li.children).map(block).join("")}</li>`)
          .join("")}</ul>`;
      case "section":
        return Array.from(el.children).map(block).join("");
      default:
        return "";
    }
  };

  const OFFICE = "urn:oasis:names:tc:opendocument:xmlns:office:1.0";
  const body = doc.getElementsByTagNameNS(OFFICE, "text")[0];
  if (!body) return "";
  return Array.from(body.children).map(block).join("");
}
