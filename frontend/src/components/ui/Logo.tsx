import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-text" aria-label="AEGIS home">
      <span className="relative grid h-7 w-7 place-items-center rounded-md border border-accent/60 bg-accent-dim">
        <span className="h-3 w-1.5 rounded-sm bg-accent shadow-[0_0_12px_var(--accent)]" />
      </span>
      <span className="text-[15px] font-semibold tracking-[0.2em]">AEGIS</span>
    </Link>
  );
}
