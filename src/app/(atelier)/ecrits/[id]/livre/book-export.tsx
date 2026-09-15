"use client";

import { Download, ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AtelierBar } from "@/components/atelier-bar";
import { Button, Spinner } from "@/components/ui";
import { extractOutline } from "@/lib/editor/document";
import { BOOK_FORMATS, type BookOptions } from "@/lib/pdf/documents";
import { BOOK_FONTS } from "@/lib/pdf/fonts";
import type { SummarySheet, Writing } from "@/lib/types";
import { cn, slugify } from "@/lib/utils";

const PREFS_KEY = "kalam-book-options";

export function BookExport({
  writing,
  sheet,
  coverUrl,
  withSheet,
}: {
  writing: Writing;
  sheet: SummarySheet | null;
  coverUrl: string | null;
  withSheet: boolean;
}) {
  const chapters = extractOutline(writing.content).filter((h) => h.level <= 2).length;
  const [options, setOptions] = useState<BookOptions>({
    format: writing.genre === "poeme" ? "A5" : "ROMAN",
    font: writing.genre === "poeme" ? "Playfair Display" : "EB Garamond",
    fontSize: 11,
    includeCover: !!coverUrl,
    includeSheet: withSheet && !!sheet,
    includeToc: chapters > 1,
  });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<number | null>(null);
  const cover = useRef<string | null | undefined>(undefined);
  const run = useRef(0);

  // Préférences (format, police, taille) mémorisées sur l'appareil.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null");
      if (saved) setOptions((o) => ({ ...o, format: saved.format ?? o.format, font: saved.font ?? o.font, fontSize: saved.fontSize ?? o.fontSize }));
    } catch {}
  }, []);

  const set = (patch: Partial<BookOptions>) => {
    setOptions((o) => {
      const next = { ...o, ...patch };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify({ format: next.format, font: next.font, fontSize: next.fontSize }));
      } catch {}
      return next;
    });
  };

  // Régénère l'aperçu (avec un léger délai pendant les réglages).
  useEffect(() => {
    const id = ++run.current;
    const t = setTimeout(async () => {
      setBusy(true);
      setError(null);
      try {
        const { buildBookPdf, imageToJpeg } = await import("@/lib/pdf/build");
        if (cover.current === undefined) cover.current = coverUrl ? await imageToJpeg(coverUrl) : null;
        const result = await buildBookPdf(
          {
            title: writing.title,
            subtitle: writing.subtitle,
            author: writing.author,
            genre: writing.genre,
            content: writing.content,
            cover: cover.current,
            sheet,
          },
          options,
        );
        if (id !== run.current) return;
        setBlob(result);
        setPdfUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(result);
        });
        // Nombre de pages : on compte les objets /Page du fichier.
        const text = await result.text();
        setPages((text.match(/\/Type\s*\/Page[^s]/g) ?? []).length || null);
      } catch (err) {
        if (id === run.current) setError((err as Error).message);
      } finally {
        if (id === run.current) setBusy(false);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [options, writing, sheet, coverUrl]);

  async function download() {
    if (!blob) return;
    const { downloadBlob } = await import("@/lib/pdf/build");
    downloadBlob(blob, `${slugify(writing.title)}.pdf`);
  }

  return (
    <div className="min-h-dvh">
      <AtelierBar backHref={`/ecrits/${writing.id}`} backLabel={writing.title} />

      <main className="mx-auto grid max-w-6xl gap-10 px-5 pt-8 pb-32 md:px-6 lg:grid-cols-[360px_1fr] lg:pt-12">
        {/* Réglages */}
        <section>
          <p className="eyebrow">Exporter en livre</p>
          <h1 className="mt-2 font-display text-[2.25rem] leading-tight font-semibold">{writing.title}</h1>
          {writing.subtitle && <p className="font-serif text-ink-soft italic">{writing.subtitle}</p>}

          <Group title="Format">
            <div className="grid grid-cols-3 gap-2">
              {BOOK_FORMATS.map((f) => {
                const [w, h] = f.size;
                return (
                  <button
                    key={f.value}
                    onClick={() => set({ format: f.value })}
                    className={cn(
                      "flex flex-col items-center rounded-md border px-2 pt-3 pb-2.5 transition",
                      options.format === f.value ? "border-ink bg-card shadow-card" : "border-rule hover:border-mist",
                    )}
                  >
                    <span
                      className={cn("block border", options.format === f.value ? "border-ink" : "border-mist")}
                      style={{ width: w / 16, height: h / 16 }}
                    />
                    <span className="mt-2 text-sm font-medium">{f.label}</span>
                    <span className="text-[0.6875rem] text-mist">{f.detail}</span>
                  </button>
                );
              })}
            </div>
          </Group>

          <Group title="Police">
            <div className="grid grid-cols-2 gap-2">
              {BOOK_FONTS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => set({ font: f.value })}
                  className={cn(
                    "rounded-md border px-3 py-2.5 text-left transition",
                    options.font === f.value ? "border-ink bg-card shadow-card" : "border-rule hover:border-mist",
                  )}
                >
                  <span className="block text-xl leading-tight" style={{ fontFamily: `"${f.value}", serif` }}>
                    {f.label}
                  </span>
                  <span className="text-[0.6875rem] text-mist">{f.note}</span>
                </button>
              ))}
            </div>
          </Group>

          <Group title={`Taille du texte · ${options.fontSize} pt`}>
            <input
              type="range"
              min={9}
              max={14}
              step={0.5}
              value={options.fontSize}
              onChange={(e) => set({ fontSize: Number(e.target.value) })}
              className="w-full accent-[var(--blue)]"
            />
            <div className="mt-1 flex justify-between text-xs text-mist">
              <span>compact</span>
              <span>confort</span>
            </div>
          </Group>

          <Group title="Contenu">
            <div className="space-y-1">
              <Toggle
                label="Couverture en première page"
                checked={options.includeCover}
                disabled={!coverUrl}
                hint={!coverUrl ? "Aucune image de couverture" : undefined}
                onChange={(v) => set({ includeCover: v })}
              />
              <Toggle
                label="Table des matières"
                checked={options.includeToc}
                disabled={chapters < 2}
                hint={chapters < 2 ? "Ajoutez au moins deux titres de chapitre" : undefined}
                onChange={(v) => set({ includeToc: v })}
              />
              <Toggle
                label="Fiche de résumé en ouverture"
                checked={options.includeSheet}
                disabled={!sheet}
                hint={
                  !sheet ? (
                    <Link href={`/ecrits/${writing.id}/fiche`} className="text-blue-ink hover:underline">
                      Créer la fiche d’abord
                    </Link>
                  ) : undefined
                }
                onChange={(v) => set({ includeSheet: v })}
              />
            </div>
          </Group>
          <p className="mt-6 text-xs leading-relaxed text-mist">
            Marges, justification, alinéas, numéros de page et page de titre sont gérés automatiquement. Chaque
            titre de chapitre (H1) ouvre une nouvelle page.
          </p>
        </section>

        {/* Aperçu */}
        <section className="lg:sticky lg:top-20 lg:self-start">
          <div className="flex items-center justify-between">
            <p className="eyebrow">
              Aperçu{pages ? ` · ${pages} pages` : ""}
            </p>
            {busy && (
              <span className="flex items-center gap-2 text-xs text-mist">
                <Spinner className="h-3 w-3" /> Mise en page…
              </span>
            )}
          </div>

          <div className="relative mt-3 overflow-hidden rounded-lg bg-wash ring-1 ring-rule">
            {error ? (
              <div className="p-8 text-sm text-red">
                La mise en page a échoué : {error}
                <button onClick={() => set({})} className="mt-3 flex items-center gap-1.5 text-blue-ink">
                  <RefreshCw size={14} /> Réessayer
                </button>
              </div>
            ) : pdfUrl ? (
              <>
                {/* Ordinateur : visionneuse intégrée */}
                <iframe
                  src={`${pdfUrl}#view=FitH&toolbar=0`}
                  title="Aperçu du livre"
                  className={cn("hidden h-[78vh] w-full md:block", busy && "opacity-50")}
                />
                {/* Téléphone : ouverture dans la visionneuse du système */}
                <div className="flex flex-col items-center px-6 py-10 text-center md:hidden">
                  <MiniBook title={writing.title} author={writing.author} font={options.font} cover={coverUrl && options.includeCover ? coverUrl : null} />
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex items-center gap-1.5 text-sm text-blue-ink"
                  >
                    <ExternalLink size={15} /> Ouvrir l’aperçu complet
                  </a>
                </div>
              </>
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-mist md:h-[78vh]">
                <Spinner className="mr-2" /> Préparation de l’aperçu…
              </div>
            )}
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3 md:px-6">
          <p className="hidden text-sm text-ink-soft sm:block">
            {BOOK_FORMATS.find((f) => f.value === options.format)?.detail} · {BOOK_FONTS.find((f) => f.value === options.font)?.label}{" "}
            {options.fontSize} pt
          </p>
          <Button variant="signature" onClick={download} disabled={!blob || busy} className="ml-auto w-full sm:w-auto">
            <Download size={17} strokeWidth={1.75} />
            Télécharger le PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <p className="mb-3 text-[0.8125rem] font-medium text-ink-soft">{title}</p>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  hint,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  hint?: React.ReactNode;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-2", disabled && "opacity-60")}>
      <div>
        <p className="text-[0.9375rem]">{label}</p>
        {hint && <p className="text-xs text-mist">{hint}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked && !disabled}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition",
          checked && !disabled ? "bg-blue" : "bg-rule",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition",
            checked && !disabled && "translate-x-4",
          )}
        />
      </button>
    </div>
  );
}

/** Petite maquette de livre pour l'aperçu mobile. */
function MiniBook({ title, author, font, cover }: { title: string; author: string | null; font: string; cover: string | null }) {
  return (
    <div className="relative aspect-[2/3] w-40 overflow-hidden rounded-r-md bg-white shadow-[4px_6px_20px_-6px_rgba(11,14,20,0.35)] ring-1 ring-rule">
      <span className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-r from-black/10 to-transparent" />
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full flex-col items-center justify-between px-3 py-5 text-[#0B0E14]">
          <span className="text-[0.5rem] tracking-[0.2em] text-[#6B7485] uppercase">{author}</span>
          <span className="text-center text-base leading-tight" style={{ fontFamily: `"${font}", serif` }}>
            {title}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-px w-5 bg-[#1E40AF]" />
            <span className="h-1 w-1 rounded-full bg-[#C1121F]" />
          </span>
        </div>
      )}
    </div>
  );
}
