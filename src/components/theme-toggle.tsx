"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { IconButton } from "./ui";

/** Bascule jour / nuit, mémorisée dans le navigateur. */
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("kalam-theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <IconButton label={dark ? "Mode jour" : "Mode nuit"} onClick={toggle} className={className}>
      {dark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
    </IconButton>
  );
}
