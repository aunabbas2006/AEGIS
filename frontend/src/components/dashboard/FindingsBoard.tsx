"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useMemo } from "react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { SEVERITY_COLOR, SEVERITY_LABEL, SEVERITY_ORDER, TYPE_LABEL } from "@/lib/format";
import type { Finding, FindingType, Severity } from "@/lib/types";
import { FindingCard } from "./FindingCard";

export interface Filters {
  severity: Severity | "all";
  type: FindingType | "all";
}

export const NO_FILTERS: Filters = { severity: "all", type: "all" };

export function applyFilters(findings: Finding[], { severity, type }: Filters): Finding[] {
  return findings.filter((f) => (severity === "all" || f.severity === severity) && (type === "all" || f.type === type));
}

interface Props {
  findings: Finding[];
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  hoveredId: number | null;
  selectedId: number | null;
  onHover: (id: number | null) => void;
  onSelect: (id: number) => void;
}

/** The ranked risk queue as a card grid, filterable by risk level and by kind. */
export function FindingsBoard({ findings, filters, onFiltersChange, hoveredId, selectedId, onHover, onSelect }: Props) {
  const { severity, type } = filters;
  const setSeverity = (value: Filters["severity"]) => onFiltersChange({ ...filters, severity: value });
  const setType = (value: Filters["type"]) => onFiltersChange({ ...filters, type: value });

  const severityCounts = useMemo(() => {
    const counts = new Map<Severity, number>();
    findings.forEach((f) => counts.set(f.severity, (counts.get(f.severity) ?? 0) + 1));
    return counts;
  }, [findings]);
  const types = useMemo(() => [...new Set(findings.map((f) => f.type))], [findings]);

  const visible = applyFilters(findings, filters);

  return (
    <GlassPanel title="Risk queue · ranked by priority" action={<span className="font-mono text-xs text-muted">{visible.length} shown</span>}>
      <LayoutGroup>
        {/* Risk-level filter */}
        <div className="flex flex-wrap gap-2">
          <FilterPill group="severity" active={severity === "all"} onClick={() => setSeverity("all")} count={findings.length}>
            All risks
          </FilterPill>
          {SEVERITY_ORDER.filter((s) => severityCounts.has(s)).map((s) => (
            <FilterPill
              key={s}
              group="severity"
              active={severity === s}
              onClick={() => setSeverity(s)}
              count={severityCounts.get(s)}
              color={SEVERITY_COLOR[s]}
            >
              {SEVERITY_LABEL[s]}
            </FilterPill>
          ))}
        </div>

        {/* Kind filter */}
        {types.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
            {(["all", ...types] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-full px-3 py-1 text-[11px] transition ${
                  type === t ? "bg-white/10 text-text" : "text-muted hover:text-text"
                }`}
              >
                {t === "all" ? "Every kind" : TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        )}
      </LayoutGroup>

      {visible.length === 0 ? (
        <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-line py-16 text-center">
          <p className="text-sm text-muted">{findings.length ? "Nothing matches this filter." : "No open risks yet."}</p>
          {!findings.length && <p className="mt-1 text-xs text-muted/70">Scan a repository or try the demo to fill the queue.</p>}
        </div>
      ) : (
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((finding, i) => (
              <FindingCard
                key={finding.id}
                rank={i + 1}
                finding={finding}
                hovered={hoveredId === finding.id}
                selected={selectedId === finding.id}
                onHover={onHover}
                onSelect={onSelect}
              />
            ))}
          </AnimatePresence>
        </ol>
      )}
    </GlassPanel>
  );
}

function FilterPill({
  group,
  active,
  onClick,
  count,
  color,
  children,
}: {
  group: string;
  active: boolean;
  onClick: () => void;
  count?: number;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex items-center gap-2 rounded-full border border-white/[0.08] px-3.5 py-1.5 text-xs text-muted transition hover:text-text"
    >
      {active && (
        <motion.span
          layoutId={`filter-${group}`}
          className="absolute inset-0 rounded-full border bg-white/[0.06]"
          style={{ borderColor: color ?? "var(--accent)" }}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}
      {color && <span className="relative h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />}
      <span className={`relative ${active ? "text-text" : ""}`}>{children}</span>
      {count !== undefined && <span className="relative font-mono text-[10px] text-muted">{count}</span>}
    </button>
  );
}
