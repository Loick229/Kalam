"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Genre } from "@/lib/types";
import { createClient, requireUser } from "@/lib/supabase/server";

/** Crée un écrit vide et ouvre l'éditeur. */
export async function createWriting(formData: FormData) {
  const { supabase, user } = await requireUser();
  const genre = (formData.get("genre") as Genre | null) ?? "texte";

  const { data: profile } = await supabase.from("profiles").select("pen_name").eq("id", user.id).maybeSingle();

  const { data, error } = await supabase
    .from("writings")
    .insert({ title: "Sans titre", genre, author: profile?.pen_name ?? null })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  redirect(`/ecrits/${data.id}`);
}

/** Supprime un écrit, sa fiche (cascade) et ses fichiers. */
export async function deleteWriting(id: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("writings").select("cover_path, source_path").eq("id", id).single();

  if (data?.cover_path) await supabase.storage.from("covers").remove([data.cover_path]);
  if (data?.source_path) await supabase.storage.from("documents").remove([data.source_path]);

  await supabase.from("writings").delete().eq("id", id);
  revalidatePath("/");
  redirect("/");
}

export async function savePenName(formData: FormData) {
  const { supabase, user } = await requireUser();
  const penName = String(formData.get("pen_name") ?? "").trim() || null;
  await supabase.from("profiles").upsert({ id: user.id, pen_name: penName });
  revalidatePath("/reglages");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
