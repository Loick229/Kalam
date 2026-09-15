import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import type { WritingFolder } from "@/lib/types";
import { Importer } from "./importer";

export const metadata: Metadata = { title: "Importer" };

export default async function ImportPage() {
  const { supabase, user } = await requireUser();
  const [{ data }, { data: folders }] = await Promise.all([
    supabase.from("profiles").select("pen_name").eq("id", user.id).maybeSingle(),
    supabase.from("writing_folders").select("*").order("name"),
  ]);
  return <Importer userId={user.id} penName={data?.pen_name ?? null} folders={(folders ?? []) as WritingFolder[]} />;
}
