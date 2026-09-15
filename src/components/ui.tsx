"use client";

/**
 * Petits composants d'interface partagés.
 * Volontairement sobres : filets fins, coins peu arrondis, typographie d'abord.
 */

import { ChevronDown, X } from "lucide-react";
import { forwardRef, useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "signature" | "outline" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-blue text-white hover:brightness-110 active:brightness-95",
  signature: "bg-red text-white hover:brightness-110 active:brightness-95",
  outline: "border border-rule bg-card text-ink hover:border-mist",
  ghost: "text-ink-soft hover:bg-wash hover:text-ink",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }
>(function Button({ variant = "primary", size = "md", className, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue",
        "disabled:pointer-events-none disabled:opacity-50",
        size === "md" ? "h-11 px-4 text-[0.9375rem]" : "h-9 px-3 text-sm",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
});

export function IconButton({
  label,
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition",
        "focus-visible:outline-2 focus-visible:outline-blue disabled:opacity-40",
        active ? "bg-ink text-paper" : "text-ink-soft hover:bg-wash hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}

const fieldBase =
  "w-full rounded-md border border-rule bg-card px-3 text-[0.9375rem] text-ink placeholder:text-mist transition focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/15";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldBase, "h-11", className)} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(fieldBase, "py-2.5 leading-relaxed", className)} {...props} />;
  },
);

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select className={cn(fieldBase, "h-11 appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        size={16}
        strokeWidth={1.75}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-mist"
      />
    </span>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[0.8125rem] font-medium text-ink-soft">{label}</span>
        {hint && <span className="text-xs text-mist">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/** Pastille de statut : un point coloré + libellé, sans fond criard. */
export function StatusDot({ status, label }: { status: string; label: string }) {
  const color =
    status === "termine" ? "bg-red" : status === "en_cours" ? "bg-blue" : "bg-mist";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
      <span className={cn("h-1.5 w-1.5 rounded-full", color)} />
      {label}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)}
    />
  );
}

/**
 * Panneau latéral (droite sur ordinateur, bas d'écran sur téléphone).
 */
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal aria-label={title}>
      <div className="absolute inset-0 bg-[#0B0E14]/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={cn(
          "absolute flex flex-col bg-paper shadow-2xl",
          "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-xl",
          "md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[440px] md:rounded-none md:border-l md:border-rule",
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-rule md:hidden" />
        <header className="flex items-center justify-between px-5 pt-3 pb-3 md:pt-5">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <IconButton label="Fermer" onClick={onClose}>
            <X size={18} strokeWidth={1.75} />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto px-5 pb-6">{children}</div>
        {footer && (
          <footer className="border-t border-rule px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
