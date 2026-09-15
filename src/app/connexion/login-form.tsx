"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Mode = "password" | "magic" | "signup";

/** Connexion par mot de passe, lien magique, ou création du compte. */
export function LoginForm({ allowSignup }: { allowSignup: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;

    try {
      if (mode === "password") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/");
        router.refresh();
      } else if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo, shouldCreateUser: allowSignup },
        });
        if (error) throw error;
        setInfo("Un lien de connexion vient de partir. Ouvrez-le depuis cet appareil.");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setInfo("Compte créé. Confirmez votre adresse grâce à l’email reçu.");
        }
      }
    } catch (err) {
      setError(translate((err as Error).message));
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: Mode; label: string }[] = [
    { id: "password", label: "Mot de passe" },
    { id: "magic", label: "Lien magique" },
    ...(allowSignup ? [{ id: "signup" as Mode, label: "Créer un compte" }] : []),
  ];

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex gap-5 border-b border-rule text-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setMode(t.id);
              setError(null);
              setInfo(null);
            }}
            className={cn(
              "-mb-px border-b-2 pb-2.5 transition",
              mode === t.id ? "border-ink font-medium text-ink" : "border-transparent text-mist hover:text-ink-soft",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Field label="Adresse email">
        <Input
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@exemple.fr"
        />
      </Field>

      {mode !== "magic" && (
        <Field label="Mot de passe" hint={mode === "signup" ? "8 caractères minimum" : undefined}>
          <Input
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={mode === "signup" ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      )}

      {error && <p className="border-l-2 border-red pl-3 text-sm text-red">{error}</p>}
      {info && <p className="border-l-2 border-blue pl-3 text-sm text-ink-soft">{info}</p>}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Spinner />}
        {mode === "password" ? "Entrer dans l’atelier" : mode === "magic" ? "Recevoir le lien" : "Créer mon atelier"}
      </Button>

      {mode === "magic" && (
        <p className="text-xs leading-relaxed text-mist">
          Pas de mot de passe à retenir : vous recevez un lien valable quelques minutes.
        </p>
      )}
    </form>
  );
}

function translate(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return "Email ou mot de passe incorrect.";
  if (/email not confirmed/i.test(msg)) return "Adresse email pas encore confirmée.";
  if (/already registered/i.test(msg)) return "Un compte existe déjà avec cette adresse.";
  if (/signups not allowed|not allowed for otp/i.test(msg)) return "Les inscriptions sont fermées.";
  if (/rate limit/i.test(msg)) return "Trop de tentatives. Réessayez dans un instant.";
  return msg;
}
