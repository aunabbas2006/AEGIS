import { GlassPanel } from "@/components/ui/GlassPanel";
import { SCAN_STEP_LABEL } from "@/lib/format";
import type { Repository } from "@/lib/types";

/** Per-scanner telemetry from the most recent completed scan. */
export function ScannerReport({ repositories }: { repositories: Repository[] }) {
  const latest = repositories
    .map((r) => ({ repo: r, scan: r.latest_scan }))
    .filter((x) => x.scan?.status === "completed")
    .sort((a, b) => (b.scan!.finished_at ?? "").localeCompare(a.scan!.finished_at ?? ""))[0];

  if (!latest?.scan) return null;

  return (
    <GlassPanel title={`Last scan · ${latest.repo.name}`}>
      <ul className="space-y-2 font-mono text-xs">
        {Object.entries(latest.scan.scanner_report).map(([name, result]) => (
          <li key={name} className="flex items-center gap-3">
            <span className={`h-1.5 w-1.5 rounded-full ${result.error ? "bg-critical" : "bg-accent"}`} />
            <span className="flex-1">{SCAN_STEP_LABEL[name]?.label ?? name}</span>
            <span className="text-muted" title={result.error ?? undefined}>
              {result.error ? "error" : `${result.findings} found`}
            </span>
            <span className="w-12 text-right text-muted/70">{result.seconds}s</span>
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}
