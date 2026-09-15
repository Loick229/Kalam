import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

/** Barre du haut des pages secondaires d'un écrit (fiche, export). */
export function AtelierBar({
  backHref,
  backLabel,
  children,
}: {
  backHref: string;
  backLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/92 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-2 md:px-6">
        <Link
          href={backHref}
          className="inline-flex h-9 min-w-0 items-center gap-1.5 rounded-md px-2 text-sm text-ink-soft hover:bg-wash hover:text-ink"
        >
          <ArrowLeft size={18} strokeWidth={1.75} className="shrink-0" />
          <span className="truncate">{backLabel}</span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          {children}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
