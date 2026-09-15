"use client";

import { BookDown, Check, FileDown, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AtelierBar } from "@/components/atelier-bar";
import { Button, Field, Input, Spinner, Textarea } from "@/components/ui";
import { genreLabel } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import type { Genre, SummarySheet } from "@/lib/types";
import { cn, estimatePages, slugify } from "@/lib/utils";

type SheetFields = Pick<
  SummarySheet,
  "title" | "author" | "theme" | "word_count" | "page_count" | "short_summary" | "long_summary" | "characters" | "quotes" | "notes"
>;

interface WritingInfo {
  id: string;
  title: string;
  author: string | null;
  genre: Genre;
  word_count: number;
}

export function SheetEditor({
  writing,
  initial,
  penName,
  aiEnabled,
}: {
  writing: WritingInfo;
  initial: SummarySheet | null;
  penName: string | null;
  aiEnabled: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [fields, setFields] = useState<SheetFields>(() => ({
    title: initial?.title ?? writing.title,
    author: initial?.author ?? writing.author ?? penName,
    theme: initial?.theme ?? genreLabel(writing.genre),
    // Les chiffres suivent toujours le texte actuel.
    word_count: writing.word_count,
    page_count: estimatePages(writing.word_count),
    short_summary: initial?.short_summary ?? null,
    long_summary: initial?.long_summary ?? null,
    characters: initial?.characters ?? null,
    quotes: initial?.quotes ?? null,
    notes: initial?.notes ?? null,
  }));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(initial ? "saved" : "idle");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiFilled, setAiFilled] = useState<Set<keyof SheetFields>>(new Set());
  const [pdfBusy, setPdfBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(fields);
  latest.current = fields;
  const dirty = useRef(false);

  const save = useCallback(async () => {
    clearTimeout(timer.current);
    dirty.current = false;
    setSaveState("saving");
    const { error } = await supabase
      .from("summary_sheets")
      .upsert({ writing_id: writing.id, ...latest.current }, { onConflict: "writing_id" });
    setSaveState(error ? "error" : "saved");
  }, [supabase, writing.id]);

  const change = (patch: Partial<SheetFields>) => {
    setFields((f) => ({ ...f, ...patch }));
    latest.current = { ...latest.current, ...patch };
    dirty.current = true;
    setSaveState("idle");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 1000);
  };

  // Enregistre en quittant la page si une modification est en attente.
  useEffect(
    () => () => {
      if (dirty.current) void save();
    },
    [save],
  );

  async function suggest() {
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writingId: writing.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur inconnue");

      const patch: Partial<SheetFields> = {
        short_summary: json.short_summary,
        long_summary: json.long_summary,
      };
      // Les champs déjà remplis à la main ne sont pas écrasés.
      if (!fields.characters && json.characters) patch.characters = json.characters;
      if (!fields.quotes && json.quotes?.length) patch.quotes = (json.quotes as string[]).join("\n");
      if ((!fields.theme || fields.theme === genreLabel(writing.genre)) && json.theme) patch.theme = json.theme;

      change(patch);
      setAiFilled(new Set(Object.keys(patch) as (keyof SheetFields)[]));
    } catch (err) {
      setAiError((err as Error).message);
    } finally {
      setAiBusy(false);
    }
  }

  async function exportPdf() {
    setPdfBusy(true);
    try {
      await save();
      // Le moteur PDF est chargé seulement quand on en a besoin.
      const { buildSheetPdf, downloadBlob } = await import("@/lib/pdf/build");
      const blob = await buildSheetPdf({ ...(initial ?? ({} as SummarySheet)), ...fields, writing_id: writing.id });
      downloadBlob(blob, `fiche-${slugify(fields.title ?? writing.title)}.pdf`);
    } catch (err) {
      alert(`Export impossible : ${(err as Error).message}`);
    } finally {
      setPdfBusy(false);
    }
  }

  const aiMark = (k: keyof SheetFields) =>
    aiFilled.has(k) ? (
      <span className="inline-flex items-center gap-1 text-blue-ink">
        <Sparkles size={11} /> proposé — à relire
      </span>
    ) : undefined;

  return (
    <div className="min-h-dvh">
      <AtelierBar backHref={`/ecrits/${writing.id}`} backLabel={writing.title}>
        <span className="mr-2 hidden items-center gap-1 text-xs text-mist sm:flex">
          {saveState === "saving" && <Spinner className="h-3 w-3" />}
          {saveState === "saved" && <Check size={13} />}
          {saveState === "saving" ? "Enregistrement…" : saveState === "saved" ? "Enregistrée" : saveState === "error" ? <span className="text-red">Échec</span> : ""}
        </span>
      </AtelierBar>

      <main className="mx-auto max-w-3xl px-5 pt-8 pb-32 md:pt-14">
        <p className="eyebrow">Fiche de résumé</p>
        <h1 className="mt-2 font-display text-[2.25rem] leading-tight font-semibold md:text-[2.75rem]">
          {fields.title || "Sans titre"}
        </h1>

        {/* Bandeau IA */}
        <section className="mt-8 flex flex-col gap-4 rounded-lg bg-card p-5 shadow-card ring-1 ring-rule/60 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-display text-lg font-semibold">Un premier jet, à partir de votre texte</p>
            <p className="mt-1 text-sm text-ink-soft">
              L’IA lit l’écrit et propose résumés, thèmes et citations. Tout reste modifiable.
            </p>
            {aiError && <p className="mt-2 text-sm text-red">{aiError}</p>}
            {!aiEnabled && (
              <p className="mt-2 text-xs text-mist">Ajoutez la variable ANTHROPIC_API_KEY pour activer cette aide.</p>
            )}
          </div>
          <Button onClick={suggest} disabled={!aiEnabled || aiBusy} className="shrink-0">
            {aiBusy ? <Spinner /> : <Sparkles size={16} strokeWidth={1.75} />}
            {aiBusy ? "Lecture du texte…" : "Proposer un résumé"}
          </Button>
        </section>

        <div className="mt-10 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Titre de l’œuvre">
              <Input value={fields.title ?? ""} onChange={(e) => change({ title: e.target.value })} />
            </Field>
            <Field label="Auteur">
              <Input value={fields.author ?? ""} onChange={(e) => change({ author: e.target.value })} />
            </Field>
            <Field label="Genre / thème" hint={aiMark("theme")}>
              <Input value={fields.theme ?? ""} onChange={(e) => change({ theme: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mots">
                <Input value={(fields.word_count ?? 0).toLocaleString("fr-FR")} readOnly className="bg-wash text-ink-soft" />
              </Field>
              <Field label="Pages" hint="estimées">
                <Input
                  type="number"
                  min={1}
                  value={fields.page_count ?? ""}
                  onChange={(e) => change({ page_count: e.target.value ? Number(e.target.value) : null })}
                />
              </Field>
            </div>
          </div>

          <Rule />

          <Field label="Résumé court" hint={aiMark("short_summary") ?? "2 à 3 phrases"}>
            <Textarea
              rows={3}
              value={fields.short_summary ?? ""}
              onChange={(e) => change({ short_summary: e.target.value })}
              className={cn("font-serif text-[1.0625rem]", aiFilled.has("short_summary") && "border-blue/40")}
            />
          </Field>

          <Field label="Résumé long" hint={aiMark("long_summary") ?? "un paragraphe"}>
            <Textarea
              rows={8}
              value={fields.long_summary ?? ""}
              onChange={(e) => change({ long_summary: e.target.value })}
              className={cn("font-serif text-[1.0625rem]", aiFilled.has("long_summary") && "border-blue/40")}
            />
          </Field>

          <Field label="Personnages / thèmes principaux" hint={aiMark("characters")}>
            <Textarea rows={3} value={fields.characters ?? ""} onChange={(e) => change({ characters: e.target.value })} />
          </Field>

          <Field label="Citations marquantes" hint={aiMark("quotes") ?? "une par ligne"}>
            <Textarea
              rows={4}
              value={fields.quotes ?? ""}
              onChange={(e) => change({ quotes: e.target.value })}
              className="font-serif italic"
            />
          </Field>

          <Field label="Notes personnelles">
            <Textarea rows={4} value={fields.notes ?? ""} onChange={(e) => change({ notes: e.target.value })} />
          </Field>
        </div>
      </main>

      {/* Actions */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-5 py-3">
          <Link
            href={`/ecrits/${writing.id}/livre?fiche=1`}
            onClick={() => void save()}
            className="inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm text-ink-soft hover:bg-wash hover:text-ink"
          >
            <BookDown size={17} strokeWidth={1.75} />
            <span className="hidden sm:inline">Insérer en début de livre</span>
            <span className="sm:hidden">Dans le livre</span>
          </Link>
          <Button variant="signature" onClick={exportPdf} disabled={pdfBusy} className="ml-auto">
            {pdfBusy ? <Spinner /> : <FileDown size={17} strokeWidth={1.75} />}
            Exporter la fiche
          </Button>
        </div>
      </div>
    </div>
  );
}

const Rule = () => <div className="signature-rule" />;
