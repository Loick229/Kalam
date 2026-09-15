import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Exécuté avant chaque page : rafraîchit la session Supabase et
 * renvoie vers /connexion toute personne non connectée.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = pathname.startsWith("/connexion") || pathname.startsWith("/auth") || pathname.startsWith("/partage/");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && pathname.startsWith("/connexion")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Tout sauf les fichiers statiques et les icônes.
  matcher: [
    "/((?!_next/static|_next/image|icons|fonts|logo.svg|icon.svg|apple-icon.png|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|woff|woff2)$).*)",
  ],
};
