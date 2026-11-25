"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CalendarClock,
  KeyRound,
  Lock,
  Moon,
  Package,
  Scale,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { useState, type MouseEvent } from "react";
import { describeDeadline, REACHABILITY_LABEL, SEVERITY_COLOR, SEVERITY_LABEL, TYPE_LABEL } from "@/lib/format";
import type { Finding, FindingType, Reachability } from "@/lib/types";

export const TYPE_ICON: Record<FindingType, LucideIcon> = {
  cve: Package,
  secret: KeyRound,
  eol: Timer,
  license: Scale,
  model_retirement: Bot,
  cert_expiry: Lock,
  inactive_repo: Moon,
  custom_deadline: CalendarClock,
};

/** Rough height of the pop-up; if there is less room than this below the card, it opens upward. */
const POPOVER_SPACE_PX = 260;

type Placement = "below" | "above";

const REACHABILITY_NOTE: Record<Reachability, string> = {
  reachable: "Imported and used by first-party code",
  imported_not_called: "Imported, but the imported name is never used",
  declared_only: "Listed in the manifest, never imported",
};

interface Props {
  finding: Finding;
  rank: number;
  hovered: boolean;
  selected: boolean;
  onHover: (id: number | null) => void;
  onSelect: (id: number) => void;
}

export function FindingCard({ finding, rank, hovered, selected, onHover, onSelect }: Props) {
  const color = SEVERITY_COLOR[finding.severity];
  const Icon = TYPE_ICON[finding.type];
  const [placement, setPlacement] = useState<Placement>("below");

  function handleEnter(e: MouseEvent<HTMLLIElement>) {
    const { bottom } = e.currentTarget.getBoundingClientRect();
    setPlacement(window.innerHeight - bottom < POPOVER_SPACE_PX ? "above" : "below");
    onHover(finding.id);
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 500, damping: 38 }}
      className={`relative ${hovered ? "z-30" : "z-0"}`}
      onMouseEnter={handleEnter}
      onMouseLeave={() => onHover(null)}
    >
      <motion.button
        type="button"
        onClick={() => onSelect(finding.id)}
        animate={{ y: hovered ? -4 : 0, scale: hovered ? 1.015 : 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-gradient-to-b from-[#121419] to-[#0b0c0f] p-4 text-left"
        style={{
          borderColor: selected || hovered ? `color-mix(in srgb, ${color} 55%, transparent)` : "rgba(255,255,255,0.07)",
          boxShadow: hovered ? `0 18px 50px -18px color-mix(in srgb, ${color} 55%, transparent)` : "none",
        }}
      >
        {/* Severity light bleeding in from the top edge. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-60"
          style={{ background: `radial-gradient(ellipse at 20% 0%, color-mix(in srgb, ${color} 25%, transparent), transparent 70%)` }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
            style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
            {SEVERITY_LABEL[finding.severity]}
          </span>
          <div className="text-right">
            <p className="font-mono text-2xl font-semibold leading-none tabular-nums" style={{ color }}>
              {Math.round(finding.priority_score)}
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-widest text-muted">#{rank} priority</p>
          </div>
        </div>

        <p className="relative mt-3 line-clamp-2 text-sm font-medium leading-snug">{finding.title}</p>

        <div className="relative mt-auto flex items-center gap-2 pt-4 text-[11px] text-muted">
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{TYPE_LABEL[finding.type]}</span>
          {finding.reachability && <ReachabilityDot value={finding.reachability} />}
        </div>
      </motion.button>

      <AnimatePresence>
        {hovered && <FindingPopover finding={finding} color={color} placement={placement} />}
      </AnimatePresence>
    </motion.li>
  );
}

function ReachabilityDot({ value }: { value: Reachability }) {
  const tone = value === "reachable" ? "var(--critical)" : value === "imported_not_called" ? "var(--medium)" : "var(--muted)";
  return (
    <span className="ml-auto inline-flex shrink-0 items-center gap-1.5" style={{ color: tone }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
      {REACHABILITY_LABEL[value]}
    </span>
  );
}

/** Detail card that pops up under a finding while it is hovered. */
function FindingPopover({ finding, color, placement }: { finding: Finding; color: string; placement: Placement }) {
  const above = placement === "above";
  const facts: [string, string | null | undefined][] = [
    ["Where", finding.location],
    ["Repository", finding.repo_name],
    [
      "Version",
      finding.installed_version &&
        `${finding.installed_version}${finding.fixed_version ? `  →  ${finding.fixed_version}` : ""}`,
    ],
    ["Secret", finding.details.redacted],
    ["Urgency", describeDeadline(finding.days_remaining)],
    ["Advisories", finding.details.advisories && `${finding.details.advisories.length} linked advisories`],
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: above ? 6 : -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: above ? 6 : -6, scale: 0.97, transition: { duration: 0.1 } }}
      transition={{ type: "spring", stiffness: 600, damping: 35 }}
      className={`pointer-events-none absolute inset-x-0 rounded-2xl ${
        above ? "bottom-[calc(100%+8px)] origin-bottom" : "top-[calc(100%+8px)] origin-top"
      } border bg-[#0f1114]/[0.98] p-4 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]`}
      style={{ borderColor: `color-mix(in srgb, ${color} 40%, transparent)` }}
    >
      {finding.description && <p className="line-clamp-3 text-xs leading-relaxed text-muted">{finding.description}</p>}
      <dl className="mt-3 space-y-1.5">
        {facts
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="flex gap-3 text-[11px]">
              <dt className="w-20 shrink-0 uppercase tracking-wider text-muted/70">{label}</dt>
              <dd className="min-w-0 break-all font-mono text-text">{value}</dd>
            </div>
          ))}
        {finding.reachability && (
          <div className="flex gap-3 text-[11px]">
            <dt className="w-20 shrink-0 uppercase tracking-wider text-muted/70">Reachable</dt>
            <dd className="text-text">{REACHABILITY_NOTE[finding.reachability]}</dd>
          </div>
        )}
      </dl>
      <p className="mt-3 border-t border-line pt-2 text-[10px] uppercase tracking-widest text-accent">
        Click to pin · fix shown on the right
      </p>
    </motion.div>
  );
}
