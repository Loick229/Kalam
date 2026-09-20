"use client";

import { BookOpen, FileText, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Wordmark } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/", label: "Bibliothèque", icon: BookOpen },
  { href: "/fiches", label: "Fiches", icon: FileText },
  { href: "/reglages", label: "Réglages", icon: Settings },
];

/** En-tête (ordinateur) et barre d'onglets en bas d'écran (téléphone). */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" || pathname.startsWith("/importer") : pathname.startsWith(href);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:h-16 md:px-8">
          <Link href="/" aria-label="Kalam — accueil">
            <Wordmark />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-3 py-2 text-sm transition",
                  isActive(item.href) ? "text-ink" : "text-mist hover:text-ink-soft",
                )}
              >
                {item.label}
                {isActive(item.href) && (
                  <span className="absolute inset-x-3 -bottom-[13px] h-[2px] bg-ink" />
                )}
              </Link>
            ))}
            <span className="mx-2 h-5 w-px bg-rule" />
            <ThemeToggle />
          </nav>

          <ThemeToggle className="md:hidden" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <ul className="grid grid-cols-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] transition",
                  isActive(href) ? "text-ink" : "text-mist",
                )}
              >
                <Icon size={20} strokeWidth={isActive(href) ? 2 : 1.5} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
