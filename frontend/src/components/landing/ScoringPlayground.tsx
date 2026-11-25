"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { REACHABILITY_LABEL, SEVERITY_COLOR, SEVERITY_ORDER } from "@/lib/format";
import { priorityScore, REACHABILITY_FACTOR, SEVERITY_WEIGHT, urgency } from "@/lib/scoring";
import type { Reachability, Severity } from "@/lib/types";

const REACHABILITY_OPTIONS = Object.keys(REACHABILITY_FACTOR) as Reachability[];

export function ScoringPlayground() {
  const [severity, setSeverity] = useState<Severity>("critical");
  const [days, setDays] = useState(14);
  const [reachability, setReachability] = useState<Reachability>("reachable");
  const [isPublic, setIsPublic] = useState(true);

  const score = priorityScore(severity, days, reachability, isPublic);
  const terms = [
    { label: "severity", value: SEVERITY_WEIGHT[severity].toFixed(0) },
    { label: "urgency", value: urgency(days).toFixed(2) },
    { label: "reachability", value: REACHABILITY_FACTOR[reachability].toFixed(1) },
    { label: "exposure", value: isPublic ? "1.25" : "1.00" },
  ];

  return (
    <section id="scoring" className="relative mx-auto max-w-6xl scroll-mt-20 px-5 py-28">
      <Reveal>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">The scoring engine</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          One formula turns ten kinds of risk into one ranked list.
        </h2>
        <p className="mt-4 max-w-2xl text-muted">
          Try it. A medium-severity issue due in three days should outrank a high-severity one due
          next quarter — and an unreachable critical CVE should sink below both.
        </p>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mt-12 grid gap-8 rounded-3xl border border-line bg-surface p-6 md:grid-cols-[1.2fr_1fr] md:p-10">
          <div className="space-y-7">
            <Control label="Severity">
              <div className="flex flex-wrap gap-2">
                {SEVERITY_ORDER.map((s) => (
                  <Chip key={s} active={s === severity} onClick={() => setSeverity(s)} color={SEVERITY_COLOR[s]}>
                    {s}
                  </Chip>
                ))}
              </div>
            </Control>

            <Control label={`Days until deadline: ${days <= 0 ? "overdue" : days}`}>
              <input
                type="range"
                min={-10}
                max={365}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
                aria-label="Days until deadline"
              />
            </Control>

            <Control label="Reachability">
              <div className="flex flex-wrap gap-2">
                {REACHABILITY_OPTIONS.map((r) => (
                  <Chip key={r} active={r === reachability} onClick={() => setReachability(r)}>
                    {REACHABILITY_LABEL[r]}
                  </Chip>
                ))}
              </div>
            </Control>

            <Control label="Exposure">
              <div className="flex gap-2">
                <Chip active={isPublic} onClick={() => setIsPublic(true)}>Public repo</Chip>
                <Chip active={!isPublic} onClick={() => setIsPublic(false)}>Private repo</Chip>
              </div>
            </Control>
          </div>

          <div className="flex flex-col items-center justify-center gap-6">
            <ScoreRing score={score} />
            <p className="text-center font-mono text-xs leading-6 text-muted">
              {terms.map((t, i) => (
                <span key={t.label}>
                  <span className="text-text">{t.value}</span>
                  <span className="text-muted/70"> {t.label}</span>
                  {i < terms.length - 1 && <span className="text-accent"> × </span>}
                </span>
              ))}
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function ScoreRing({ score }: { score: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative h-48 w-48">
      <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--line)" strokeWidth="10" />
        <motion.circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
          transition={{ type: "spring", stiffness: 80, damping: 18 }}
          style={{ filter: "drop-shadow(0 0 8px var(--accent))" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <motion.p key={score} initial={{ scale: 0.85, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl font-semibold tabular-nums">
            {score.toFixed(0)}
          </motion.p>
          <p className="text-xs uppercase tracking-widest text-muted">priority</p>
        </div>
      </div>
    </div>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted">{label}</p>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs capitalize transition ${
        active ? "border-accent/70 bg-accent-dim text-text" : "border-line text-muted hover:border-white/25 hover:text-text"
      }`}
    >
      {color && <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  );
}
