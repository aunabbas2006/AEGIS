"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConnectRepository } from "@/components/dashboard/ConnectRepository";
import { DashboardBackdrop } from "@/components/dashboard/DashboardBackdrop";
import { applyFilters, FindingsBoard, NO_FILTERS } from "@/components/dashboard/FindingsBoard";
import { ReachabilityFunnel } from "@/components/dashboard/ReachabilityFunnel";
import { ScanConsole } from "@/components/dashboard/ScanConsole";
import { ScannerReport } from "@/components/dashboard/ScannerReport";
import { SolutionPanel } from "@/components/dashboard/SolutionPanel";
import { StatCards } from "@/components/dashboard/StatCards";
import { useDashboardData } from "@/components/dashboard/useDashboardData";
import { Logo } from "@/components/ui/Logo";

export default function DashboardPage() {
  const { repositories, findings, stats, error, scanning, refresh } = useDashboardData();
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filters, setFilters] = useState(NO_FILTERS);

  // The solution panel follows the pointer, falls back to the pinned card, then to the top visible risk.
  const byId = (id: number | null) => findings.find((f) => f.id === id) ?? null;
  const active = byId(hoveredId) ?? byId(selectedId) ?? applyFilters(findings, filters)[0] ?? null;
  const pinned = active !== null && active.id === selectedId;

  return (
    <div className="relative min-h-screen">
      <DashboardBackdrop />

      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-bg/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden h-4 w-px bg-white/15 sm:block" />
            <span className="hidden text-sm text-muted sm:block">Control room</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-muted">
            {scanning && (
              <span className="inline-flex items-center gap-2 text-accent">
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-accent" /> Live scan
              </span>
            )}
            <Link href="/" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 transition hover:text-text">
              <ArrowLeft className="h-3.5 w-3.5" /> Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-5 pb-24 pt-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            What to fix, <span className="glow-text text-accent">in order</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
            Connect a repository and AEGIS ranks every risk by severity, reachability and urgency.
          </p>
        </motion.div>

        <ConnectRepository repositories={repositories} onChange={refresh} />

        {error && (
          <p className="mx-auto max-w-3xl rounded-2xl border border-critical/40 bg-critical/10 px-4 py-3 text-center text-sm text-critical">
            {error}
          </p>
        )}

        <ScanConsole repositories={repositories} />
        <StatCards stats={stats} />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <FindingsBoard
            findings={findings}
            filters={filters}
            onFiltersChange={setFilters}
            hoveredId={hoveredId}
            selectedId={selectedId}
            onHover={setHoveredId}
            onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
          />
          <aside className="space-y-6 lg:sticky lg:top-24">
            <SolutionPanel finding={active} pinned={pinned} onResolved={refresh} />
            <ReachabilityFunnel findings={findings} />
            <ScannerReport repositories={repositories} />
          </aside>
        </div>
      </main>
    </div>
  );
}
