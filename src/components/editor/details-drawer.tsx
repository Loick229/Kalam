"use client";

import { useEffect, useState } from "react";
import { deleteWriting } from "@/app/actions";
import { CoverPicker } from "@/components/cover-picker";
import { Drawer, Field, Input, Select, Textarea } from "@/components/ui";
import type { WritingPatch } from "@/lib/editor/use-autosave";
import { GENRES, STATUSES } from "@/lib/labels";
import type { Genre, Status, Writing } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type Meta = Pick<Writing, "title" | "subtitle" | "author" | "genre" | "status" | "summary" | "tags">;

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
  useEffect(() => setTagText(meta.tags.join(", ")), [meta.tags]);

  const commitTags = () => {
    const tags = [...new Set(tagText.split(",").map((t) => t.trim()).filter(Boolean))];
    if (tags.join("|") !== meta.tags.join("|")) onChange({ tags });
  };

  return (
    <Drawer open={open} onClose={onClose} title="Informations">
      <div className="space-y-5">
        <Field label="Couverture">
          <CoverPicker url={coverUrl} busy={coverBusy} onPick={onCoverPick} onRemove={onCoverRemove} />
        </Field>

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
