import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { genreLabel } from "@/lib/labels";
import type { Genre } from "@/lib/types";

// Les longs textes peuvent demander un peu de temps d'analyse.
export const maxDuration = 120;

/** Forme de la réponse attendue de l'IA (sortie JSON structurée). */
const SCHEMA = {
  type: "object",
  properties: {
    short_summary: { type: "string", description: "Résumé court, 2 à 3 phrases." },
    long_summary: { type: "string", description: "Résumé long, un paragraphe." },
    theme: { type: "string", description: "Genre et thèmes en quelques mots." },
    characters: {
      type: "string",
      description: "Personnages et/ou thèmes principaux, en une ou deux lignes. Chaîne vide si non pertinent.",
    },
    quotes: {
      type: "array",
      items: { type: "string" },
      description: "2 à 4 citations marquantes, recopiées mot pour mot du texte.",
    },
  },
  required: ["short_summary", "long_summary", "theme", "characters", "quotes"],
  additionalProperties: false,
} as const;

const SYSTEM = `Tu es lecteur·rice éditorial·e pour une maison d'édition francophone exigeante.
On te confie le texte d'un·e auteur·e ; tu rédiges les éléments d'une fiche de résumé.
- Écris en français, dans une langue sobre et précise, sans superlatifs publicitaires.
- Le résumé court tient en 2 ou 3 phrases et donne envie de lire sans tout dévoiler.
- Le résumé long est un seul paragraphe qui couvre l'arc complet du texte.
- Pour un poème, résume le mouvement, les images et la tonalité plutôt qu'une « intrigue ».
- Les citations doivent être recopiées exactement, sans guillemets ajoutés.
- N'invente rien qui ne soit pas dans le texte.`;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Assistance IA non configurée : ajoutez ANTHROPIC_API_KEY dans les variables d’environnement." },
      { status: 501 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non connecté." }, { status: 401 });

  const { writingId } = (await request.json()) as { writingId?: string };
  const { data: writing } = await supabase
    .from("writings")
    .select("title, subtitle, genre, content_text")
    .eq("id", writingId ?? "")
    .maybeSingle();

  if (!writing) return NextResponse.json({ error: "Écrit introuvable." }, { status: 404 });
  if (writing.content_text.trim().length < 80) {
    return NextResponse.json({ error: "Le texte est encore trop court pour être résumé." }, { status: 422 });
  }

  const client = new Anthropic();

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      // Si le modèle principal décline, l'API bascule d'elle-même sur le modèle de repli recommandé.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `<oeuvre titre="${escapeAttr(writing.title)}" genre="${genreLabel(writing.genre as Genre)}"${
            writing.subtitle ? ` sous-titre="${escapeAttr(writing.subtitle)}"` : ""
          }>\n${writing.content_text}\n</oeuvre>\n\nRédige les éléments de la fiche de résumé de cette œuvre.`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "L’IA n’a pas pu traiter ce texte." }, { status: 422 });
    }

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new Error("Réponse vide.");
    return NextResponse.json(JSON.parse(text.text));
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Clé ANTHROPIC_API_KEY invalide." }, { status: 500 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Trop de demandes, réessayez dans une minute." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Service IA indisponible (${err.status}).` }, { status: 502 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

const escapeAttr = (s: string) => s.replace(/"/g, "&quot;").replace(/</g, "&lt;");
