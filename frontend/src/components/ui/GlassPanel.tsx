import type { ReactNode } from "react";

/** The dashboard's card surface: dark glass with a faint top highlight. */
export function GlassPanel({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      // No overflow clipping: hover pop-ups inside a panel must be able to extend past its edge.
      className={`relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {title && (
        <header className="flex items-center justify-between px-6 pt-5">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.25em] text-muted">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-6">{children}</div>
    </section>
  );
}
