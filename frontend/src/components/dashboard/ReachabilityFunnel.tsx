"use client";

import { motion } from "framer-motion";
import type { Finding } from "@/lib/types";
import { GlassPanel } from "@/components/ui/GlassPanel";

/** Shows how reachability analysis narrows vulnerable packages down to the ones that matter. */
export function ReachabilityFunnel({ findings }: { findings: Finding[] }) {
  const cves = findings.filter((f) => f.type === "cve");
  const imported = cves.filter((f) => f.reachability !== "declared_only");
  const reachable = cves.filter((f) => f.reachability === "reachable");
  const total = Math.max(cves.length, 1);

  const stages = [
    { label: "Vulnerable packages", count: cves.length, color: "var(--muted)" },
    { label: "Actually imported", count: imported.length, color: "var(--medium)" },
    { label: "Imported and used", count: reachable.length, color: "var(--critical)" },
  ];

  return (
    <GlassPanel title="Reachability funnel">
      <div className="space-y-4">
        {stages.map((stage, i) => (
          <div key={stage.label}>
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="text-muted">{stage.label}</span>
              <span className="font-mono">{stage.count}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
              <motion.div
                className="h-full rounded-full"
                style={{ background: stage.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(stage.count / total) * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Packages that are declared but never imported are down-ranked ×0.1; imported but unused ×0.4.
        They stay visible — reachability is a priority signal, not a reason to ignore.
      </p>
    </GlassPanel>
  );
}
