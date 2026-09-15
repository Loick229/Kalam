import { cn } from "@/lib/utils";

/**
 * Plume Kalam. La plume suit la couleur du texte (currentColor) pour
 * rester lisible en mode nuit ; `mono` passe tout le logo en une couleur.
 */
export function LogoMark({ className, mono = false }: { className?: string; mono?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden className={cn("shrink-0", className)}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M57 3C43 5.2 28.4 14.6 21.4 32.4L11.4 54.4 21.6 45.2C25.4 41.8 28.6 39.6 32.4 37.2L35.2 31.6 36.6 36.4C47.6 28.8 54.6 17.8 57 3ZM15.6 49.6C27 36.4 38.6 22.2 51.4 8.8 40.8 22.6 29.6 36.8 16.6 50.6Z"
      />
      <path
        stroke={mono ? "currentColor" : "var(--blue-ink)"}
        strokeWidth="2.6"
        strokeLinecap="round"
        d="M11.4 54.4C18.4 58 24 50.6 31 52.8 37.2 54.8 42 58.4 49.6 54.6"
      />
      <circle cx="55.2" cy="52.6" r="3.1" fill={mono ? "currentColor" : "var(--red)"} />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <LogoMark className="h-7 w-7" />
      <span className="font-display text-[1.45rem] leading-none font-semibold tracking-tight">
        Kalam
      </span>
    </span>
  );
}
