"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCircle2, Copy, Github, Pin, Sparkles } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { SEVERITY_COLOR, SEVERITY_LABEL, TYPE_LABEL } from "@/lib/format";
import { renderInline } from "@/lib/markdown";
import type { Finding } from "@/lib/types";
import { TYPE_ICON } from "./FindingCard";
import { RemediationDialog } from "./RemediationDialog";

interface Props {
  finding: Finding | null;
  pinned: boolean;
  onResolved: () => void;
}

/** The recommended fix for whichever finding is hovered, pinned, or ranked first. */
export function SolutionPanel({ finding, pinned, onResolved }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-b from-[#0c1710] via-[#0b0d0f] to-[#0b0c0f] shadow-[0_0_80px_-30px_rgba(61,255,139,0.5)]">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
      <header className="flex items-center justify-between px-6 pt-5">
        <h2 className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.25em] text-accent">
          <Sparkles className="h-3.5 w-3.5" /> Suggested solution
        </h2>
        {finding && (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted">
            {pinned ? <><Pin className="h-3 w-3" /> pinned</> : "previewing"}
          </span>
        )}
      </header>

      <div className="min-h-[22rem] p-6">
        <AnimatePresence mode="wait" initial={false}>
          {finding ? (
            <motion.div
              key={finding.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              <SolutionBody finding={finding} />
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition hover:shadow-[0_0_24px_var(--accent)]"
                >
                  <Github className="h-4 w-4" /> Create issue
                </button>
                <button
                  type="button"
                  onClick={() => api.resolve(finding.id).then(onResolved)}
                  title="Mark resolved"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-muted transition hover:border-accent/50 hover:text-text"
                >
                  <CheckCircle2 className="h-4 w-4" /> Resolve
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-16 text-center text-sm text-muted">
              Hover any risk to see how to fix it.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {finding && <RemediationDialog finding={finding} open={dialogOpen} onClose={() => setDialogOpen(false)} />}
    </section>
  );
}

function SolutionBody({ finding }: { finding: Finding }) {
  const color = SEVERITY_COLOR[finding.severity];
  const Icon = TYPE_ICON[finding.type];
  const { summary, steps, command } = finding.solution;

  return (
    <>
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <Icon className="h-3.5 w-3.5" />
        {TYPE_LABEL[finding.type]}
        <span className="ml-auto font-semibold uppercase tracking-wider" style={{ color }}>
          {SEVERITY_LABEL[finding.severity]}
        </span>
      </div>
      <h3 className="mt-2 text-base font-medium leading-snug">{finding.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted">{renderInline(summary)}</p>

      <ol className="mt-5 space-y-3">
        {steps.map((step, i) => (
          <motion.li
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.05, duration: 0.2 }}
            className="flex gap-3 text-sm"
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-accent/40 bg-accent-dim font-mono text-[11px] text-accent">
              {i + 1}
            </span>
            <span className="pt-0.5 leading-relaxed text-text/90">{step}</span>
          </motion.li>
        ))}
      </ol>

      {command && <CommandBlock command={command} />}
    </>
  );
}

function CommandBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-black/50 py-2.5 pl-4 pr-2">
      <span className="font-mono text-xs text-accent">$</span>
      <code className="min-w-0 flex-1 truncate font-mono text-xs">{command}</code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy command"
        className="rounded-lg p-1.5 text-muted transition hover:bg-white/10 hover:text-text"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
