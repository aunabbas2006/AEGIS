"use client";

import { motion } from "framer-motion";
import {
  Bot,
  CalendarClock,
  FileWarning,
  KeyRound,
  Lock,
  PackageSearch,
  Scale,
  Timer,
} from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";

const FEATURES = [
  { icon: PackageSearch, title: "Vulnerable dependencies", body: "npm and PyPI manifests checked against OSV.dev — GitHub Advisories, PyPA and more, in one batch call.", tag: "OSV.dev" },
  { icon: FileWarning, title: "Reachability analysis", body: "Separates packages that are used from ones that are merely declared. Cuts the noise before it reaches you.", tag: "Headline" },
  { icon: KeyRound, title: "Secrets in git history", body: "Scans every commit, not just HEAD. Stores a fingerprint and a redacted preview — never the secret.", tag: "Full history" },
  { icon: Timer, title: "End-of-life runtimes", body: "Reads Dockerfiles, .python-version, .nvmrc and engines; looks up the support deadline on endoflife.date.", tag: "endoflife.date" },
  { icon: Bot, title: "AI model retirement", body: "Finds hard-coded model IDs and matches them against a curated provider shutdown calendar.", tag: "LLM-era risk" },
  { icon: Scale, title: "License policy", body: "Resolves each dependency's license from its registry and flags copyleft licenses you cannot ship.", tag: "Compliance" },
  { icon: Lock, title: "TLS certificate expiry", body: "Handshakes with every HTTPS host referenced in config and reads the real expiry date.", tag: "Live probe" },
  { icon: CalendarClock, title: "Custom deadlines", body: "Key rotations, contract renewals — anything with a date flows through the same scoring.", tag: "Your rules" },
];

export function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl scroll-mt-20 px-5 py-28">
      <Reveal>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">Coverage</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Today&apos;s vulnerabilities and tomorrow&apos;s outages, in one queue.
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature, i) => (
          <Reveal key={feature.title} delay={0.03 * i}>
            <motion.article
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="group relative h-full overflow-hidden rounded-2xl border border-line bg-surface p-5"
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent/0 blur-2xl transition-colors duration-500 group-hover:bg-accent/20" />
              <feature.icon className="h-5 w-5 text-accent" />
              <h3 className="mt-4 font-medium">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
              <span className="mt-4 inline-block rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                {feature.tag}
              </span>
            </motion.article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
