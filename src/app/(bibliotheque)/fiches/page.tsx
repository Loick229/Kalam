import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { SheetList, type SheetRow } from "./sheet-list";

export const metadata: Metadata = { title: "Fiches" };

export default async function SheetsPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("summary_sheets")
    .select("id, writing_id, title, author, theme, word_count, short_summary, updated_at, writings(genre, status)")
    .order("updated_at", { ascending: false });

  return <SheetList sheets={(data ?? []) as unknown as SheetRow[]} />;
}
