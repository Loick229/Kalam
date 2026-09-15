"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Writing } from "@/lib/types";

export type SaveState = "saved" | "pending" | "saving" | "error" | "offline";
export type WritingPatch = Partial<Omit<Writing, "id" | "user_id" | "created_at" | "updated_at">>;

const DEBOUNCE_MS = 1200;
const MAX_WAIT_MS = 8000;
const RETRY_MS = 5000;

export const draftKey = (id: string) => `kalam-draft-${id}`;

/**
 * Sauvegarde automatique fiable :
 *  - regroupe les modifications et les envoie après une courte pause de frappe
 *    (et au plus tard toutes les 8 s pendant une frappe continue) ;
 *  - garde une copie de secours sur l'appareil tant que le serveur n'a pas confirmé ;
 *  - réessaie seule en cas d'échec, et dès le retour du réseau ;
 *  - enregistre quand on quitte l'onglet ou qu'on met l'application en arrière-plan.
 */
export function useAutosave(id: string) {
  const supabase = useMemo(() => createClient(), []);
  const pending = useRef<WritingPatch>({});
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const maxWait = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inflight = useRef<Promise<void> | null>(null);
  const [state, setState] = useState<SaveState>("saved");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const writeBackup = useCallback(() => {
    try {
      localStorage.setItem(draftKey(id), JSON.stringify({ at: new Date().toISOString(), patch: pending.current }));
    } catch {
      // Stockage plein ou navigation privée : la sauvegarde serveur reste active.
    }
  }, [id]);

  const flush = useCallback(async (): Promise<void> => {
    clearTimeout(debounce.current);
    clearTimeout(maxWait.current);
    clearTimeout(retry.current);
    maxWait.current = undefined;

    if (inflight.current) await inflight.current;
    const patch = pending.current;
    if (!Object.keys(patch).length) return;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setState("offline");
      return;
    }

    pending.current = {};
    setState("saving");

    inflight.current = (async () => {
      const { error } = await supabase.from("writings").update(patch).eq("id", id);
      if (error) {
        // On remet la modification en file (sans écraser une frappe plus récente).
        pending.current = { ...patch, ...pending.current };
        writeBackup();
        setState("error");
        retry.current = setTimeout(() => void flush(), RETRY_MS);
        return;
      }
      setSavedAt(new Date());
      if (Object.keys(pending.current).length) {
        setState("pending");
        writeBackup();
      } else {
        setState("saved");
        try {
          localStorage.removeItem(draftKey(id));
        } catch {}
      }
    })();

    await inflight.current;
    inflight.current = null;
  }, [id, supabase, writeBackup]);

  /** Ajoute des modifications à la file d'enregistrement. */
  const queue = useCallback(
    (patch: WritingPatch) => {
      pending.current = { ...pending.current, ...patch };
      writeBackup();
      setState((s) => (s === "offline" ? s : "pending"));
      clearTimeout(debounce.current);
      debounce.current = setTimeout(() => void flush(), DEBOUNCE_MS);
      if (!maxWait.current) maxWait.current = setTimeout(() => void flush(), MAX_WAIT_MS);
    },
    [flush, writeBackup],
  );

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && void flush();
    const onOnline = () => void flush();
    const onOffline = () => Object.keys(pending.current).length && setState("offline");
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length || inflight.current) {
        void flush();
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeunload", onBeforeUnload);
      void flush();
    };
  }, [flush]);

  return { state, savedAt, queue, flush };
}

/** Lit une éventuelle copie de secours plus récente que la version serveur. */
export function readBackup(id: string, serverUpdatedAt: string): { at: string; patch: WritingPatch } | null {
  try {
    const raw = localStorage.getItem(draftKey(id));
    if (!raw) return null;
    const backup = JSON.parse(raw) as { at: string; patch: WritingPatch };
    if (!Object.keys(backup.patch ?? {}).length) return null;
    return new Date(backup.at) > new Date(serverUpdatedAt) ? backup : null;
  } catch {
    return null;
  }
}
