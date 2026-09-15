"use client";

import { ArrowLeft, FileUp, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CoverPicker } from "@/components/cover-picker";
import { Button, Field, Input, Select, Spinner } from "@/components/ui";
import { docToText } from "@/lib/editor/document";
import { ACCEPTED, detectFormat, extractDocument, type ExtractResult } from "@/lib/import/extract";
import { GENRES } from "@/lib/labels";
import { uploadCover } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import type { Genre } from "@/lib/types";
import { cn, countWords, excerpt } from "@/lib/utils";

interface Item {
  key: string;
  file: File;
  state: "reading" | "ready" | "error" | "saving" | "done";
  error?: string;
  result?: ExtractResult;
  title: string;
  genre: Genre;
  cover?: File;
  coverPreview?: string;
  words?: number;
}

export function Importer({ userId, penName }: { userId: string; penName: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (key: string, patch: Partial<Item>) =>
    setItems((list) => list.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  async function addFiles(files: FileList | File[]) {
    const fresh: Item[] = Array.from(files).map((file) => ({
      key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
      file,
      state: detectFormat(file) ? "reading" : "error",
      error: detectFormat(file) ? undefined : "Format non pris en charge",
      title: file.name.replace(/\.[^.]+$/, ""),
      genre: "document",
    }));
    setItems((list) => [...list, ...fresh]);

    for (const it of fresh.filter((i) => i.state === "reading")) {
      try {
        const result = await extractDocument(it.file);
        update(it.key, {
          state: "ready",
          result,
          title: result.title,
          words: countWords(docToText(result.content)),
        });
      } catch (err) {
        update(it.key, { state: "error", error: (err as Error).message });
      }
    }
  }

  async function importAll() {
    const ready = items.filter((i) => i.state === "ready" && i.result);
    if (!ready.length) return;
    setSaving(true);
    const supabase = createClient();
    let lastId = "";

    for (const it of ready) {
      update(it.key, { state: "saving" });
      try {
        const id = crypto.randomUUID();
        const text = docToText(it.result!.content);

        // 1. Conserver le document d'origine
        const sourcePath = `${userId}/${id}/${it.file.name.replace(/[^\w.\-]+/g, "_")}`;
        const up = await supabase.storage
          .from("documents")
          .upload(sourcePath, it.file, { contentType: it.file.type || undefined });

        // 2. Couverture éventuelle
        const coverPath = it.cover ? await uploadCover(supabase, userId, id, it.cover) : null;

        // 3. L'écrit lui-même
        const { error } = await supabase.from("writings").insert({
          id,
          title: it.title.trim() || "Sans titre",
          genre: it.genre,
          author: penName,
          content: it.result!.content,
          content_text: text,
          excerpt: excerpt(text, 240),
          word_count: countWords(text),
          cover_path: coverPath,
          source_format: it.result!.format,
          source_name: it.file.name,
          source_path: up.error ? null : sourcePath,
          imported_at: new Date().toISOString(),
        });
        if (error) throw error;
        lastId = id;
        update(it.key, { state: "done" });
      } catch (err) {
        update(it.key, { state: "error", error: (err as Error).message });
      }
    }

    setSaving(false);
    if (ready.length === 1 && lastId) router.push(`/ecrits/${lastId}`);
    else router.push("/");
    router.refresh();
  }

  const readyCount = items.filter((i) => i.state === "ready").length;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-mist hover:text-ink">
        <ArrowLeft size={16} strokeWidth={1.75} /> Bibliothèque
      </Link>

      <h1 className="mt-4 font-display text-[2.25rem] leading-tight font-semibold md:text-[2.75rem]">
        Importer des documents
      </h1>
      <p className="mt-2 max-w-xl font-serif text-ink-soft">
        Rapatriez vos textes existants. Le contenu est extrait, mis en forme et devient éditable ; le fichier
        d’origine est conservé à part.
      </p>

      {/* Zone de dépôt */}
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) void addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "mt-8 flex w-full flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center transition",
          dragging ? "border-blue bg-blue/5" : "border-rule bg-card hover:border-mist",
        )}
      >
        <FileUp size={28} strokeWidth={1.25} className="text-ink-soft" />
        <span className="mt-4 font-display text-xl font-semibold">Choisir des fichiers</span>
        <span className="mt-1 text-sm text-mist">ou les glisser ici</span>
        <span className="mt-5 flex flex-wrap justify-center gap-1.5">
          {ACCEPTED.map((ext) => (
            <span key={ext} className="rounded-sm border border-rule px-1.5 py-0.5 font-mono text-[0.6875rem] text-ink-soft uppercase">
              {ext.slice(1)}
            </span>
          ))}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Fichiers en attente */}
      {items.length > 0 && (
        <ul className="mt-8 space-y-4">
          {items.map((it) => (
            <li key={it.key} className="rounded-lg bg-card p-5 shadow-card ring-1 ring-rule/60">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{it.file.name}</p>
                  <p className="mt-0.5 text-xs text-mist">
                    {Math.max(1, Math.round(it.file.size / 1024)).toLocaleString("fr-FR")} Ko
                    {it.words != null && <> · {it.words.toLocaleString("fr-FR")} mots extraits</>}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {(it.state === "reading" || it.state === "saving") && (
                    <span className="flex items-center gap-2 text-mist">
                      <Spinner className="h-3.5 w-3.5" />
                      {it.state === "reading" ? "Lecture…" : "Ajout…"}
                    </span>
                  )}
                  {it.state === "done" && <span className="text-blue-ink">Ajouté</span>}
                  {it.state !== "saving" && it.state !== "done" && (
                    <button
                      aria-label="Retirer"
                      onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}
                      className="rounded p-1 text-mist hover:bg-wash hover:text-ink"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {it.state === "error" && <p className="mt-3 border-l-2 border-red pl-3 text-sm text-red">{it.error}</p>}

              {it.state === "ready" && it.result && (
                <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-4">
                    <Field label="Titre">
                      <Input value={it.title} onChange={(e) => update(it.key, { title: e.target.value })} />
                    </Field>
                    <Field label="Genre">
                      <Select value={it.genre} onChange={(e) => update(it.key, { genre: e.target.value as Genre })}>
                        {GENRES.map((g) => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <p className="line-clamp-3 font-serif text-sm text-ink-soft italic">
                      {excerpt(docToText(it.result.content), 260)}
                    </p>
                  </div>
                  <CoverPicker
                    url={it.coverPreview ?? null}
                    onPick={(f) => update(it.key, { cover: f, coverPreview: URL.createObjectURL(f) })}
                    onRemove={() => update(it.key, { cover: undefined, coverPreview: undefined })}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mt-6 flex justify-end md:bottom-6">
          <Button onClick={importAll} disabled={!readyCount || saving} className="shadow-card">
            {saving && <Spinner />}
            Ajouter {readyCount > 1 ? `les ${readyCount} documents` : "à la bibliothèque"}
          </Button>
        </div>
      )}
    </div>
  );
}
