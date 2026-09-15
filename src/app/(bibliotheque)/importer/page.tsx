import type { Metadata } from "next";
import { requireUser } from "@/lib/supabase/server";
import { Importer } from "./importer";

export const metadata: Metadata = { title: "Importer" };

export default async function ImportPage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("profiles").select("pen_name").eq("id", user.id).maybeSingle();
  return <Importer userId={user.id} penName={data?.pen_name ?? null} />;
}
