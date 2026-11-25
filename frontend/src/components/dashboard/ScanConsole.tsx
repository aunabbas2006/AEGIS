"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SCAN_STEP_LABEL } from "@/lib/format";
import type { Repository, Scan } from "@/lib/types";

/** Live progress for every repository that is currently being scanned. */
export function ScanConsole({ repositories }: { repositories: Repository[] }) {
  const active = repositories.filter(
    (r) => r.latest_scan && (r.latest_scan.status === "queued" || r.latest_scan.status === "running"),
  );

  return (
    <AnimatePresence>
      {active.map((repo) => (
        <motion.section
          key={repo.id}
          layout
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-b from-[#0d1a12] to-surface p-6 shadow-[0_0_60px_-20px_rgba(61,255,139,0.5)]"
        >
          <ScanProgress repoName={repo.owner ? `${repo.owner}/${repo.name}` : repo.name} scan={repo.latest_scan!} />
        </motion.section>
      ))}
    </AnimatePresence>
  );
}

function ScanProgress({ repoName, scan }: { repoName: string; scan: Scan }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const elapsed = useElapsedSeconds(scan.started_at);

  const steps = scan.steps;
  const currentIndex = scan.current_step ? steps.indexOf(scan.current_step) : 0;
  // Count the running step as half done so the bar keeps moving within a step.
  const progress = Math.min(99, ((Math.max(currentIndex, 0) + 0.5) / steps.length) * 100);
  const found = Object.values(scan.scanner_report).reduce((sum, r) => sum + r.findings, 0);
  const hint = SCAN_STEP_LABEL[hovered ?? scan.current_step ?? "checkout"]?.hint;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <Radar />
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent">Scanning</p>
            <p className="mt-1 text-lg font-medium">{repoName}</p>
          </div>
        </div>
        <div className="flex gap-6 text-right font-mono">
          <Metric label="elapsed" value={`${elapsed}s`} />
          <Metric label="found so far" value={String(found)} highlight />
          <Metric label="complete" value={`${Math.round(progress)}%`} />
        </div>
      </div>

      {/* Progress bar with a moving sheen. */}
      <div className="relative mt-6 h-3 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="absolute inset-y-0 left-0 overflow-hidden rounded-full bg-gradient-to-r from-accent/60 to-accent shadow-[0_0_20px_var(--accent)] transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        >
          <div className="animate-sheen absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </div>
      </div>

      {/* Step track: hover any step to see what it does. */}
      <ol className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
        {steps.map((step, i) => {
          const report = scan.scanner_report[step];
          const state = i < currentIndex ? "done" : i === currentIndex ? "running" : "pending";
          return (
            <li
              key={step}
              onMouseEnter={() => setHovered(step)}
              onMouseLeave={() => setHovered(null)}
              className={`flex cursor-default items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors ${
                state === "running"
                  ? "border-accent/60 bg-accent-dim text-text"
                  : state === "done"
                    ? "border-line bg-white/[0.03] text-text"
                    : "border-line/60 text-muted/60"
              } ${hovered === step ? "border-white/30" : ""}`}
            >
              <StepIcon state={state} failed={Boolean(report?.error)} />
              <span className="truncate">{SCAN_STEP_LABEL[step]?.label ?? step}</span>
              {report && !report.error && <span className="ml-auto font-mono text-[10px] text-muted">{report.findings}</span>}
            </li>
          );
        })}
      </ol>

      <AnimatePresence mode="wait">
        <motion.p
          key={hint}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className="mt-4 text-sm text-muted"
        >
          <span className="text-accent">›</span> {hint}
        </motion.p>
      </AnimatePresence>
    </>
  );
}

function StepIcon({ state, failed }: { state: "done" | "running" | "pending"; failed: boolean }) {
  if (state === "running") return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" />;
  if (state === "done" && failed) return <X className="h-3.5 w-3.5 shrink-0 text-critical" />;
  if (state === "done") return <Check className="h-3.5 w-3.5 shrink-0 text-accent" />;
  return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/20" />;
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className={`text-2xl tabular-nums ${highlight ? "text-accent" : "text-text"}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted">{label}</p>
    </div>
  );
}

/** A small rotating radar sweep. */
function Radar() {
  return (
    <div className="relative h-12 w-12 shrink-0 rounded-full border border-accent/40 bg-accent/5">
      <div className="absolute inset-2 rounded-full border border-accent/20" />
      <div className="animate-radar absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(61,255,139,0.55)_60deg,transparent_61deg)]" />
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
    </div>
  );
}

function useElapsedSeconds(startedAt: string | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  if (!startedAt) return 0;
  // The API returns naive UTC timestamps; mark them as UTC before parsing.
  const start = Date.parse(startedAt.endsWith("Z") ? startedAt : `${startedAt}Z`);
  return Math.max(0, Math.floor((now - start) / 1000));
}
