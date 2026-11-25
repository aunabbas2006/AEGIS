import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Reveal } from "@/components/ui/Reveal";

export function Footer() {
  return (
    <>
      <section className="relative mx-auto max-w-6xl px-5 pb-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-surface px-6 py-16 text-center">
            <div className="absolute left-1/2 top-full h-64 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/25 blur-3xl" />
            <h2 className="relative text-3xl font-semibold tracking-tight sm:text-4xl">See your repository&apos;s deadline queue.</h2>
            <p className="relative mx-auto mt-4 max-w-lg text-muted">
              Scan a public GitHub repository, or load the bundled demo repository with planted risks.
            </p>
            <Link
              href="/dashboard"
              className="relative mt-8 inline-block rounded-full bg-accent px-7 py-3 text-sm font-semibold text-bg transition hover:shadow-[0_0_40px_var(--accent)]"
            >
              Open the dashboard
            </Link>
          </div>
        </Reveal>
      </section>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-xs text-muted sm:flex-row">
          <Logo />
          <p>Scans only repositories you own or are authorized to assess.</p>
        </div>
      </footer>
    </>
  );
}
