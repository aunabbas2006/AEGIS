import { Check, X } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

const ROWS = [
  ["Hundreds of CVEs with equal weight", "Unreachable CVEs automatically down-ranked"],
  ["Secrets checked in the latest commit only", "Every commit in history scanned"],
  ["EOL dates, cert expiry and model shutdowns tracked in spreadsheets", "Every deadline is a finding with days remaining"],
  ["One tool per problem, ten dashboards", "One normalized queue, one score"],
  ["Reports dumped as JSON", "GitHub issues with the fix attached"],
  ["Fixed issues linger until someone closes them", "Rescans auto-resolve what was fixed"],
];

export function WhyAegis() {
  return (
    <section id="why" className="relative mx-auto max-w-6xl scroll-mt-20 px-5 py-28">
      <Reveal>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">Why AEGIS</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Scanners tell you what is wrong. AEGIS tells you what to fix this week.
        </h2>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-12 overflow-hidden rounded-3xl border border-line">
          <div className="grid grid-cols-2 border-b border-line bg-surface-2 text-xs font-medium uppercase tracking-widest">
            <p className="p-4 text-muted">The usual approach</p>
            <p className="border-l border-line p-4 text-accent">With AEGIS</p>
          </div>
          {ROWS.map(([before, after]) => (
            <div key={before} className="grid grid-cols-2 border-b border-line text-sm last:border-0">
              <p className="flex gap-3 p-4 text-muted">
                <X className="mt-0.5 h-4 w-4 shrink-0 text-critical" />
                {before}
              </p>
              <p className="flex gap-3 border-l border-line bg-surface p-4">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                {after}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
