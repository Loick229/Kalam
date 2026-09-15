import type { Metadata } from "next";
import { savePenName, signOut } from "@/app/actions";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("pen_name").eq("id", user.id).maybeSingle();
  const aiEnabled = !!process.env.ANTHROPIC_API_KEY;

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-[2.5rem] leading-none font-semibold tracking-tight md:text-[3.25rem]">Réglages</h1>
      <div className="signature-rule mt-6" />

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Nom de plume</h2>
        <p className="mt-1 text-sm text-ink-soft">Signature utilisée par défaut sur vos nouveaux écrits, livres et fiches.</p>
        <form action={savePenName} className="mt-4 flex gap-2">
          <input
            name="pen_name"
            defaultValue={profile?.pen_name ?? ""}
            placeholder="Votre nom d’auteur"
            className="h-11 flex-1 rounded-md border border-rule bg-card px-3 text-[0.9375rem] placeholder:text-mist focus:border-blue focus:ring-2 focus:ring-blue/15 focus:outline-none"
          />
          <button className="h-11 rounded-md bg-blue px-4 text-[0.9375rem] font-medium text-white hover:brightness-110">
            Enregistrer
          </button>
        </form>
      </section>

      <section className="mt-10 border-t border-rule pt-8">
        <h2 className="font-display text-xl font-semibold">Compte</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-mist">Connecté·e avec</dt>
            <dd className="truncate">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-mist">Assistance IA</dt>
            <dd className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${aiEnabled ? "bg-blue" : "bg-mist"}`} />
              {aiEnabled ? "active" : "non configurée"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-mist">Confidentialité</dt>
            <dd>Tous vos écrits sont privés</dd>
          </div>
        </dl>
        <form action={signOut} className="mt-6">
          <button className="text-sm text-red hover:underline">Se déconnecter</button>
        </form>
      </section>

      <p className="mt-12 text-xs text-mist">
        Astuce : sur téléphone, utilisez « Ajouter à l’écran d’accueil » dans le menu du navigateur pour ouvrir Kalam
        comme une application.
      </p>
    </div>
  );
}
