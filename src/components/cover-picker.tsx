"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRef } from "react";
import { Spinner } from "./ui";

const MAX_MB = 8;

/** Choix d'une image de couverture (aperçu portrait, format livre). */
export function CoverPicker({
  url,
  busy,
  onPick,
  onRemove,
}: {
  url: string | null;
  busy?: boolean;
  onPick: (file: File) => void;
  onRemove?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  function handle(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Choisissez une image (JPG, PNG, WebP).");
    if (file.size > MAX_MB * 1024 * 1024) return alert(`Image trop lourde (${MAX_MB} Mo maximum).`);
    onPick(file);
  }

  return (
    <div className="flex items-end gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="relative flex aspect-[2/3] w-28 shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-dashed border-rule bg-wash text-mist transition hover:border-mist"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Couverture" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <ImagePlus size={22} strokeWidth={1.5} />
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-paper/70 text-ink">
            <Spinner />
          </span>
        )}
      </button>
      <div className="space-y-2 pb-1 text-sm">
        <button type="button" onClick={() => input.current?.click()} className="block text-blue-ink hover:underline">
          {url ? "Changer l’image" : "Ajouter une couverture"}
        </button>
        {url && onRemove && (
          <button type="button" onClick={onRemove} className="flex items-center gap-1 text-mist hover:text-red">
            <Trash2 size={14} strokeWidth={1.75} /> Retirer
          </button>
        )}
        <p className="text-xs text-mist">JPG, PNG ou WebP — idéalement en portrait.</p>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
