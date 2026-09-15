import type { Metadata } from "next";
import { LogoMark } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh md:grid-cols-[1.1fr_1fr]">
      {/* Colonne éditoriale (ordinateur) */}
      <section className="dark relative hidden flex-col justify-between overflow-hidden bg-[#0B0E14] p-12 text-[#E8E9EC] md:flex">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8 text-[#E8E9EC]" />
          <span className="font-display text-2xl font-semibold">Kalam</span>
        </div>

        <blockquote className="max-w-md">
          <p className="font-display text-[2.6rem] leading-[1.15] italic">
            « Il faut écrire comme on respire, avec la page pour seul témoin. »
          </p>
          <div className="mt-8 flex items-center gap-3 text-sm text-[#7B8699]">
            <span className="h-px w-10 bg-[#2C4FC4]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#E0303C]" />
            Votre atelier, vos textes, vos livres.
          </div>
        </blockquote>

        <p className="text-xs tracking-[0.14em] text-[#7B8699] uppercase">
          Carnet privé · Aucun texte n’est public
        </p>

        {/* Grande plume en filigrane */}
        <LogoMark mono className="pointer-events-none absolute -right-24 -bottom-16 h-[420px] w-[420px] text-white/[0.035]" />
      </section>

      {/* Formulaire */}
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 md:hidden">
            <LogoMark className="h-12 w-12" />
          </div>
          <p className="eyebrow">Atelier d’écriture</p>
          <h1 className="mt-2 font-display text-[2.25rem] leading-tight font-semibold">
            Retrouver sa plume
          </h1>
          <p className="mt-2 text-ink-soft">Connectez-vous pour ouvrir votre bibliothèque.</p>
          <div className="mt-8">
            <LoginForm allowSignup={process.env.NEXT_PUBLIC_ALLOW_SIGNUP !== "false"} />
          </div>
        </div>
      </section>
    </main>
  );
}
