"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { CSSProperties } from "react";
import { VaultScene } from "./VaultScene";

// Files orbiting the protected stack. Each one stands for a kind of risk AEGIS tracks.
const FILES = [
  { emoji: "📦", label: "Dependencies", className: "left-[8%] top-[60%] md:left-[24%]", float: 10 },
  { emoji: "🔐", label: "Secrets", className: "right-[8%] top-[62%] md:right-[24%]", float: -12 },
  { emoji: "📄", label: "Licenses", className: "left-[14%] top-[80%] md:left-[30%]", float: -8 },
  { emoji: "🗂️", label: "Runtimes", className: "right-[12%] top-[82%] md:right-[29%]", float: 9 },
  { emoji: "📁", label: "Repositories", className: "left-[4%] top-[44%] md:left-[16%]", float: 7 },
  { emoji: "🧾", label: "Certificates", className: "right-[4%] top-[42%] md:right-[16%]", float: -10 },
];

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  return (
    <section className="grain relative flex min-h-[max(100svh,780px)] flex-col items-center overflow-hidden pt-32">
      <VaultScene />

      <div className="relative z-10 mx-auto max-w-3xl px-5 text-center">
        <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
          <motion.span
            className="block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease }}
          >
            Every risk,
          </motion.span>
          <motion.span
            className="block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.06, ease }}
          >
            ranked by <span className="glow-text text-accent">time left</span>
          </motion.span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease }}
          className="mx-auto mt-6 max-w-xl text-pretty text-sm leading-relaxed text-muted sm:text-base"
        >
          AEGIS scans your repositories for vulnerable dependencies, leaked secrets, end-of-life
          runtimes and retiring AI models — then ranks every finding by severity, reachability and
          days remaining, so you fix what matters first.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18, ease }}
          className="mt-8 flex justify-center gap-3"
        >
          <Link
            href="/dashboard"
            className="rounded-full border border-accent/70 bg-accent-dim px-6 py-2.5 text-sm font-medium text-accent shadow-[0_0_30px_rgba(61,255,139,0.35)] transition hover:bg-accent hover:text-bg"
          >
            Scan a repository
          </Link>
          <a
            href="#how-it-works"
            className="rounded-full border border-line bg-surface px-6 py-2.5 text-sm text-text transition hover:border-white/25"
          >
            How it works
          </a>
        </motion.div>
      </div>

      {FILES.map((file, i) => (
        // Outer element: one-off entrance (framer). Inner element: endless float (CSS, GPU).
        <motion.div
          key={file.label}
          className={`absolute z-10 hidden sm:block ${file.className}`}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.04, type: "spring", stiffness: 300, damping: 20 }}
        >
          <span
            role="img"
            aria-label={file.label}
            title={file.label}
            className="animate-float block select-none text-4xl"
            style={
              {
                "--float-y": `${file.float}px`,
                "--float-rot": `${file.float / 2}deg`,
                "--float-duration": `${3 + i * 0.3}s`,
              } as CSSProperties
            }
          >
            {file.emoji}
          </span>
        </motion.div>
      ))}
    </section>
  );
}
