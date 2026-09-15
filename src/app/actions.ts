"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Genre } from "@/lib/types";
import { createClient, requireUser } from "@/lib/supabase/server";

/** Crée un écrit vide et ouvre l'éditeur. */
export async function createWriting(formData: FormData) {
  const { supabase, user } = await requireUser();
  const genre = (formData.get("genre") as Genre | null) ?? "texte";
  const folderId = String(formData.get("folder_id") ?? "").trim() || null;

  const { data: profile } = await supabase.from("profiles").select("pen_name").eq("id", user.id).maybeSingle();

  const { data, error } = await supabase
    .from("writings")
    .insert({ title: "Sans titre", genre, folder_id: folderId, author: profile?.pen_name ?? null })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  redirect(`/ecrits/${data.id}`);
}

export async function createFolder(formData: FormData) {
  const { supabase } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parent_id") ?? "").trim() || null;
  if (!name) return;
  const { error } = await supabase.from("writing_folders").insert({ name, parent_id: parentId });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

/** Supprime un écrit, sa fiche (cascade) et ses fichiers. */
export async function deleteWriting(id: string) {
  const { supabase } = await requireUser();
  const { data, error: readError } = await supabase
    .from("writings")
    .select("cover_path, source_path")
    .eq("id", id)
    .single();

  if (readError) throw new Error(readError.message);

  if (data?.cover_path) {
    await supabase.storage.from("covers").remove([data.cover_path]);
  }
  if (data?.source_path) {
    await supabase.storage.from("documents").remove([data.source_path]);
  }

  const { error: deleteError } = await supabase.from("writings").delete().eq("id", id);
  if (deleteError) throw new Error(deleteError.message);
  revalidatePath("/");
  redirect("/");
}

/** Active ou révoque le lien de lecture seule d'un écrit. */
export async function setWritingSharing(id: string, enabled: boolean) {
  const { supabase } = await requireUser();
  const patch = enabled
    ? { visibility: "link" as const, share_slug: crypto.randomUUID() }
    : { visibility: "private" as const, share_slug: null };
  const { data, error } = await supabase
    .from("writings")
    .update(patch)
    .eq("id", id)
    .select("share_slug, visibility")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/ecrits/${id}`);
  return data;
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
