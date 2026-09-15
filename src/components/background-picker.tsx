"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRef } from "react";
import { Spinner } from "./ui";

const MAX_MB = 10;

export function BackgroundPicker({
  url,
  busy,
  onPick,
  onRemove,
}: {
  url: string | null;
  busy?: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  function handle(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Choisissez une image.");
    if (file.size > MAX_MB * 1024 * 1024) return alert(`Image trop lourde (${MAX_MB} Mo maximum).`);
    onPick(file);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-rule bg-wash text-mist transition hover:border-mist"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Fond du texte" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <ImagePlus size={22} strokeWidth={1.5} />
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-paper/70 text-ink">
            <Spinner />
          </span>
        )}
      </button>
      <div className="flex items-center justify-between gap-3 text-sm">
        <button type="button" onClick={() => input.current?.click()} className="text-blue-ink hover:underline">
          {url ? "Changer l’image" : "Ajouter une image"}
        </button>
        {url && (
          <button type="button" onClick={onRemove} className="flex items-center gap-1 text-mist hover:text-red">
            <Trash2 size={14} strokeWidth={1.75} /> Retirer
          </button>
        )}
      </div>
      <p className="text-xs text-mist">L’image sera légèrement estompée pour préserver la lisibilité.</p>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          handle(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}