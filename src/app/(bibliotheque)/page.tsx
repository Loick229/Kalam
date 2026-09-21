import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { signCoverUrls } from "@/lib/storage";
import type { WritingCard, WritingFolder } from "@/lib/types";
import { Library } from "./library";

export const metadata: Metadata = { title: "Bibliothèque" };

export default async function LibraryPage() {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("writings")
    .select("id, folder_id, title, subtitle, genre, status, word_count, cover_path, source_format, tags, excerpt, hidden, updated_at, created_at")
    .order("updated_at", { ascending: false });

  const { data: folders } = await supabase.from("writing_folders").select("*").order("name");

  if (error) {
    return (
      <p className="border-l-2 border-red pl-3 text-sm text-red">
        Impossible de charger la bibliothèque : {error.message}. Le fichier supabase/schema.sql a-t-il été exécuté ?
      </p>
    );
  }

  const urls = await signCoverUrls(supabase, data.map((w) => w.cover_path));
  const writings: WritingCard[] = data.map((w) => ({
    ...w,
    cover_url: w.cover_path ? (urls[w.cover_path] ?? null) : null,
  })) as WritingCard[];

  return <Library writings={writings} folders={(folders ?? []) as WritingFolder[]} />;
}
