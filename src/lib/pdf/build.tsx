"use client";

import { pdf } from "@react-pdf/renderer";
import { extractOutline } from "@/lib/editor/document";
import type { SummarySheet } from "@/lib/types";
import type { PageRegistry } from "./content";
import { BookDocument, SheetDocument, type BookData, type BookOptions } from "./documents";
import { registerFonts } from "./fonts";

/**
 * Génère le livre en PDF.
 * Deux passes quand il y a une table des matières : la première relève la
 * page de chaque chapitre, la seconde écrit ces numéros dans la table.
 */
export async function buildBookPdf(data: BookData, options: BookOptions): Promise<Blob> {
  registerFonts(window.location.origin);

  const hasToc = options.includeToc && extractOutline(data.content).filter((h) => h.level <= 2).length > 1;
  let tocPages: PageRegistry | undefined;

  if (hasToc) {
    const registry: PageRegistry = {};
    await pdf(<BookDocument data={data} options={options} registry={registry} />).toBlob();
    tocPages = { ...registry };
  }

  return pdf(<BookDocument data={data} options={options} tocPages={tocPages} />).toBlob();
}

export async function buildSheetPdf(sheet: SummarySheet): Promise<Blob> {
  registerFonts(window.location.origin);
  return pdf(<SheetDocument sheet={sheet} />).toBlob();
}

/**
 * Le moteur PDF n'accepte que JPEG/PNG : on redessine la couverture
 * (quel que soit son format) en JPEG, à une taille raisonnable.
 */
export async function imageToJpeg(url: string, maxWidth = 1600): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    await img.decode();
    const scale = Math.min(1, maxWidth / img.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  } catch {
    return null;
  }
}

/** Déclenche le téléchargement d'un fichier (fonctionne aussi sur iOS). */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
