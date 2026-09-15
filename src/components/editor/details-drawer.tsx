"use client";

import { useEffect, useState, useTransition } from "react";
import { deleteWriting, setWritingSharing } from "@/app/actions";
import { CoverPicker } from "@/components/cover-picker";
import { Drawer, Field, Input, Select, Textarea } from "@/components/ui";
import type { WritingPatch } from "@/lib/editor/use-autosave";
import { GENRES, PAGE_THEMES, STATUSES } from "@/lib/labels";
import type { Genre, PageTheme, Status, Writing } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type Meta = Pick<Writing, "title" | "subtitle" | "author" | "genre" | "page_theme" | "status" | "summary" | "tags">;

/** Panneau « Informations » : métadonnées, couverture, suppression. */
export function DetailsDrawer({
  open,
  onClose,
  writing,
  meta,
  onChange,
  coverUrl,
  coverBusy,
  onCoverPick,
  onCoverRemove,
}: {
  open: boolean;
  onClose: () => void;
  writing: Writing;
  meta: Meta;
  onChange: (patch: WritingPatch) => void;
  coverUrl: string | null;
  coverBusy: boolean;
  onCoverPick: (f: File) => void;
  onCoverRemove: () => void;
}) {
  const [tagText, setTagText] = useState(meta.tags.join(", "));
  const [sharing, setSharing] = useState(writing.visibility === "link" && !!writing.share_slug);
  const [shareSlug, setShareSlug] = useState(writing.share_slug);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareBusy, startSharing] = useTransition();
  useEffect(() => setTagText(meta.tags.join(", ")), [meta.tags]);

  const commitTags = () => {
    const tags = [...new Set(tagText.split(",").map((t) => t.trim()).filter(Boolean))];
    if (tags.join("|") !== meta.tags.join("|")) onChange({ tags });
  };

  function toggleSharing() {
    const next = !sharing;
    setShareError(null);
    startSharing(async () => {
      try {
        const result = await setWritingSharing(writing.id, next);
        setSharing(next);
        setShareSlug(result.share_slug);
      } catch (error) {
        setShareError((error as Error).message);
      }
    });
  }

  async function copyShareLink() {
    if (!shareSlug) return;
    await navigator.clipboard.writeText(`${window.location.origin}/partage/${shareSlug}`);
  }

  return (
    <Drawer open={open} onClose={onClose} title="Informations">
      <div className="space-y-5">
        <Field label="Couverture">
          <CoverPicker url={coverUrl} busy={coverBusy} onPick={onCoverPick} onRemove={onCoverRemove} />
        </Field>

        <div className="rounded-md border border-rule bg-wash px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink">Partager en lecture seule</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Toute personne avec le lien peut lire cet ouvrage sans se connecter.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={sharing}
              onClick={toggleSharing}
              disabled={shareBusy}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${sharing ? "bg-blue" : "bg-mist/40"}`}
            >
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${sharing ? "left-6" : "left-1"}`} />
            </button>
          </div>
          {sharing && shareSlug && (
            <button type="button" onClick={copyShareLink} className="mt-3 text-sm font-medium text-blue-ink hover:underline">
              Copier le lien de lecture
            </button>
          )}
          {shareError && <p className="mt-2 text-xs text-red">{shareError}</p>}
        </div>

        <Field label="Titre">
          <Input value={meta.title} onChange={(e) => onChange({ title: e.target.value })} />
        </Field>
        <Field label="Sous-titre">
          <Input value={meta.subtitle ?? ""} onChange={(e) => onChange({ subtitle: e.target.value || null })} />
        </Field>
        <Field label="Auteur">
          <Input value={meta.author ?? ""} onChange={(e) => onChange({ author: e.target.value || null })} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Genre">
            <Select value={meta.genre} onChange={(e) => onChange({ genre: e.target.value as Genre })}>
              {GENRES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Statut">
            <Select value={meta.status} onChange={(e) => onChange({ status: e.target.value as Status })}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Ambiance du document">
          <Select value={meta.page_theme} onChange={(e) => onChange({ page_theme: e.target.value as PageTheme })}>
            {PAGE_THEMES.map((theme) => (
              <option key={theme.value} value={theme.value}>
                {theme.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Résumé" hint="Quatrième de couverture">
          <Textarea
            rows={4}
            value={meta.summary ?? ""}
            onChange={(e) => onChange({ summary: e.target.value || null })}
          />
        </Field>

        <Field label="Tags" hint="séparés par des virgules">
          <Input
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            onBlur={commitTags}
            placeholder="exil, mer, enfance"
          />
        </Field>

        {writing.source_format && (
          <div className="rounded-md bg-wash px-4 py-3 text-sm">
            <p className="eyebrow mb-1.5">Document d’origine</p>
            <p className="text-ink-soft">
              <span className="font-medium text-ink">{writing.source_name}</span>
              <br />
              Format {writing.source_format.toUpperCase()}
              {writing.imported_at && <> · importé le {formatDate(writing.imported_at)}</>}
            </p>
          </div>
        )}

        <p className="text-xs text-mist">
          Créé le {formatDate(writing.created_at)}
        </p>

        <form
          action={deleteWriting.bind(null, writing.id)}
          onSubmit={(e) => {
            if (!confirm("Supprimer définitivement cet écrit et sa fiche ?")) e.preventDefault();
          }}
          className="border-t border-rule pt-5"
        >
          <button type="submit" className="text-sm text-red hover:underline">
            Supprimer cet écrit
          </button>
        </form>
      </div>
    </Drawer>
  );
}
