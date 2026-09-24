import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookMode } from "@/components/editor/book-mode";
import { signCoverUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { Genre, PageTheme } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SharedWriting = {
  title: string;
  subtitle: string | null;
  author: string | null;
  genre: Genre;
  page_theme: PageTheme;
  page_background_url: string | null;
  cover_path: string | null;
  content: Parameters<typeof BookMode>[0]["content"];
};

async function getSharedWriting(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("writings")
    .select("id, title, subtitle, author, genre, page_theme, page_background_url, content, cover_path, read_count")
    .eq("share_slug", slug)
    .maybeSingle();

  if (error || !data) return null;

  const nextCount = (data.read_count ?? 0) + 1;
  const { error: incrementError } = await supabase.from("writings").update({ read_count: nextCount }).eq("id", data.id);
  if (incrementError) {
    console.error("Impossible d’incrémenter le compteur de lecture :", incrementError.message);
  }

  return {
    ...data,
    read_count: nextCount,
  } as SharedWriting & { read_count: number } | null;
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
      pageTheme={writing.page_theme ?? "papier"}
      backgroundUrl={writing.page_background_url}
      coverUrl={coverUrl}
      bookmarkKey={`partage-${slug}`}
      content={writing.content}
    />
  );
}
