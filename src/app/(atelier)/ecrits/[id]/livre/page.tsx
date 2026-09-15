import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { signCoverUrl } from "@/lib/storage";
import { requireUser } from "@/lib/supabase/server";
import type { SummarySheet, Writing } from "@/lib/types";
import { BookExport } from "./book-export";

export const metadata: Metadata = { title: "Exporter en livre" };

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fiche?: string }>;
}) {
  const { id } = await params;
  const { fiche } = await searchParams;
  const { supabase } = await requireUser();

  const [{ data: writing }, { data: sheet }] = await Promise.all([
    supabase.from("writings").select("*").eq("id", id).maybeSingle(),
    supabase.from("summary_sheets").select("*").eq("writing_id", id).maybeSingle(),
  ]);
  if (!writing) notFound();

  const coverUrl = await signCoverUrl(supabase, (writing as Writing).cover_path);

  return (
    <BookExport
      writing={writing as Writing}
      sheet={sheet as SummarySheet | null}
      coverUrl={coverUrl}
      withSheet={fiche === "1"}
    />
  );
}
