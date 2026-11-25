"use client";

import { motion } from "framer-motion";
import { GitBranch, Radar, Route, ListOrdered, BellRing } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

const STEPS = [
  {
    icon: GitBranch,
    title: "Connect",
    body: "Point AEGIS at a repository. It clones the full history into an isolated workspace.",
  },
  {
    icon: Radar,
    title: "Scan",
    body: "Seven scanners run independently: CVEs, secrets in history, EOL runtimes, licenses, AI models, certificates, activity.",
  },
  {
    icon: Route,
    title: "Trace reachability",
    body: "For each vulnerable package: is it imported? Is the imported name actually used?",
  },
  {
    icon: ListOrdered,
    title: "Prioritize",
    body: "Severity × urgency × reachability × exposure collapses everything into one 0–100 score.",
  },
  {
    icon: BellRing,
    title: "Remediate",
    body: "File a GitHub issue with the fix attached. Rescans auto-resolve what was fixed.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative mx-auto max-w-6xl scroll-mt-20 px-5 py-28">
      <Reveal>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">How it works</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          From raw repository to a ranked to-do list in five steps.
        </h2>
      </Reveal>

      <div className="relative mt-16 grid gap-10 md:grid-cols-5 md:gap-6">
        {/* Connector line that draws itself across the steps. */}
        <motion.div
          className="absolute left-0 top-6 hidden h-px w-full origin-left bg-gradient-to-r from-accent via-accent/50 to-transparent md:block"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        {STEPS.map((step, i) => (
          <Reveal key={step.title} delay={0.06 * i} className="relative">
            <div className="relative grid h-12 w-12 place-items-center rounded-xl border border-accent/40 bg-surface shadow-[0_0_24px_rgba(61,255,139,0.15)]">
              <step.icon className="h-5 w-5 text-accent" />
            </div>
            <p className="mt-5 font-mono text-xs text-muted">0{i + 1}</p>
            <h3 className="mt-1 text-lg font-medium">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
