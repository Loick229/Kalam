/** Squelette affiché pendant le chargement des pages de la bibliothèque. */
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-32 rounded bg-wash" />
      <div className="mt-3 h-10 w-64 rounded bg-wash" />
      <div className="mt-8 h-px bg-rule" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 rounded-lg bg-wash" />
        ))}
      </div>
    </div>
  );
}
