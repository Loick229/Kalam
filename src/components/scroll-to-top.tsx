"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Remonte la page tout en haut à chaque changement d'URL.
 *
 * Next remet déjà le défilement à zéro, mais parfois trop tôt : quand la page
 * passe d'abord par un `loading.tsx`, le contenu réel arrive après coup et la
 * position d'avant peut être réappliquée. On réaffirme donc la position à la
 * frame suivante.
 *
 * Deux exceptions volontaires : le retour/avance du navigateur garde la
 * position d'origine, et un lien d'ancre (#…) garde sa cible.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);
  const isHistoryNav = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      isHistoryNav.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const wasHistoryNav = isHistoryNav.current;
    isHistoryNav.current = false;

    // Premier affichage : on laisse le navigateur restaurer sa position
    // (rechargement de page, notamment en pleine lecture).
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (wasHistoryNav || window.location.hash) return;

    const toTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    toTop();
    const frame = requestAnimationFrame(toTop);
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
