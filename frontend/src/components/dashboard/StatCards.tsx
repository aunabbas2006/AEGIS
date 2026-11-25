"use client";

import { motion } from "framer-motion";
import { Crosshair, Filter, Flame, ShieldAlert } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import type { Stats } from "@/lib/types";

export function StatCards({ stats }: { stats: Stats | null }) {
  const cards = [
    { label: "Open risks", value: stats?.open_findings ?? 0, icon: ShieldAlert, color: "var(--text)" },
    { label: "Critical", value: stats?.by_severity.critical ?? 0, icon: Flame, color: "var(--critical)" },
    { label: "Reachable vulnerable packages", value: stats?.actionable_dependencies ?? 0, icon: Crosshair, color: "var(--high)" },
    { label: "CVE noise cut by reachability", value: stats?.noise_reduction_percent ?? 0, icon: Filter, color: "var(--accent)", suffix: "%" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.3 }}
          className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5"
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-25 blur-2xl"
            style={{ background: card.color }}
          />
          <card.icon className="h-4 w-4" style={{ color: card.color }} />
          <p className="mt-5 text-4xl font-semibold tabular-nums tracking-tight" style={{ color: card.color }}>
            <AnimatedNumber value={card.value} suffix={card.suffix} />
          </p>
          <p className="mt-1 text-xs text-muted">{card.label}</p>
        </motion.div>
      ))}
    </div>
  );
}
