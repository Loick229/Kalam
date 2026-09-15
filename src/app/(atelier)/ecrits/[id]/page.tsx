import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { signCoverUrl } from "@/lib/storage";
import { requireUser } from "@/lib/supabase/server";
import type { Writing, WritingFolder } from "@/lib/types";
import { Studio } from "./studio";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data } = await supabase.from("writings").select("title").eq("id", id).maybeSingle();
  return { title: data?.title ?? "Écrit" };
}

export default async function WritingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const [{ data }, { data: folders }] = await Promise.all([
    supabase.from("writings").select("*").eq("id", id).maybeSingle(),
    supabase.from("writing_folders").select("*").order("name"),
  ]);
  if (!data) notFound();

  const writing = data as Writing;
  const coverUrl = await signCoverUrl(supabase, writing.cover_path);

  return <Studio initial={writing} initialCoverUrl={coverUrl} userId={user.id} folders={(folders ?? []) as WritingFolder[]} />;
}
