import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import type { SummarySheet } from "@/lib/types";
import { SheetEditor } from "./sheet-editor";

export const metadata: Metadata = { title: "Fiche de résumé" };

export default async function SheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const [{ data: writing }, { data: sheet }, { data: profile }] = await Promise.all([
    supabase.from("writings").select("id, title, author, genre, word_count").eq("id", id).maybeSingle(),
    supabase.from("summary_sheets").select("*").eq("writing_id", id).maybeSingle(),
    supabase.from("profiles").select("pen_name").eq("id", user.id).maybeSingle(),
  ]);
  if (!writing) notFound();

  return (
    <SheetEditor
      writing={writing}
      initial={sheet as SummarySheet | null}
      penName={profile?.pen_name ?? null}
      aiEnabled={!!process.env.ANTHROPIC_API_KEY}
    />
  );
}
