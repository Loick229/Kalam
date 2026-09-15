import type { SupabaseClient } from "@supabase/supabase-js";

/** Durée de validité des liens vers les couvertures (les buckets sont privés). */
const TTL = 60 * 60 * 6;

/** Transforme une liste de chemins de couverture en URL signées. */
export async function signCoverUrls(
  supabase: SupabaseClient,
  paths: (string | null)[],
): Promise<Record<string, string>> {
  const list = [...new Set(paths.filter((p): p is string => !!p))];
  if (!list.length) return {};
  const { data } = await supabase.storage.from("covers").createSignedUrls(list, TTL);
  const out: Record<string, string> = {};
  data?.forEach((d) => {
    if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  });
  return out;
}

export async function signCoverUrl(supabase: SupabaseClient, path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from("covers").createSignedUrl(path, TTL);
  return data?.signedUrl ?? null;
}

/**
 * Envoie une image de couverture et renvoie son chemin.
 * Rangement : <id utilisateur>/<id écrit>-<horodatage>.<ext>
 */
export async function uploadCover(
  supabase: SupabaseClient,
  userId: string,
  writingId: string,
  file: File,
): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${userId}/${writingId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("covers")
    .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
  if (error) throw error;
  return path;
}
