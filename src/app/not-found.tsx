import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <LogoMark className="h-14 w-14" />
      <h1 className="mt-6 font-display text-3xl font-semibold">Page introuvable</h1>
      <p className="mt-2 font-serif text-ink-soft italic">Ce feuillet s’est égaré entre deux chapitres.</p>
      <Link href="/" className="mt-8 text-sm text-blue-ink hover:underline">
        Revenir à la bibliothèque
      </Link>
    </main>
  );
}
