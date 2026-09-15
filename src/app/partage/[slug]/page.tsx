import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookMode } from "@/components/editor/book-mode";
import { signCoverUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { Genre } from "@/lib/types";

type SharedWriting = {
  title: string;
  subtitle: string | null;
  author: string | null;
  genre: Genre;
  cover_path: string | null;
  content: Parameters<typeof BookMode>[0]["content"];
};

async function getSharedWriting(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("writings")
    .select("title, subtitle, author, genre, content, cover_path")
    .eq("share_slug", slug)
    .eq("visibility", "link")
    .maybeSingle();
  return data as SharedWriting | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const writing = await getSharedWriting(slug);
  return {
    title: writing?.title ?? "Ouvrage partagé",
    description: writing ? `Lecture de « ${writing.title} »` : "Lien de lecture Kalam",
    robots: { index: false, follow: false },
  };
}

export default async function SharedWritingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const writing = await getSharedWriting(slug);
  if (!writing) notFound();
  const supabase = await createClient();
  const coverUrl = await signCoverUrl(supabase, writing.cover_path);

  return (
    <BookMode
      title={writing.title}
      subtitle={writing.subtitle}
      author={writing.author}
      genre={writing.genre}
      coverUrl={coverUrl}
      content={writing.content}
    />
  );
}
