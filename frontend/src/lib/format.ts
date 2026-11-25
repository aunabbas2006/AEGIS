import type { FindingType, Reachability, Severity } from "./types";

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "var(--critical)",
  high: "var(--high)",
  medium: "var(--medium)",
  low: "var(--low)",
  info: "var(--info)",
};

export const TYPE_LABEL: Record<FindingType, string> = {
  cve: "Vulnerable dependency",
  secret: "Exposed secret",
  eol: "End-of-life runtime",
  license: "License risk",
  model_retirement: "AI model retirement",
  cert_expiry: "Certificate expiry",
  inactive_repo: "Inactive repository",
  custom_deadline: "Custom deadline",
};

export const REACHABILITY_LABEL: Record<Reachability, string> = {
  reachable: "Reachable",
  imported_not_called: "Imported, not called",
  declared_only: "Declared only",
};

export function describeDeadline(days: number | null): string | null {
  if (days === null) return null;
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "due today";
  return `${days}d left`;
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

/** Human labels for each step of a scan, in the order the backend reports them. */
export const SCAN_STEP_LABEL: Record<string, { label: string; hint: string }> = {
  checkout: { label: "Clone", hint: "Fetches the full git history into an isolated workspace" },
  dependencies: { label: "CVEs", hint: "Checks every dependency against OSV.dev and traces reachability" },
  licenses: { label: "Licenses", hint: "Resolves each package license and applies the deny-list" },
  secrets: { label: "Secrets", hint: "Searches every commit for keys, tokens and passwords" },
  eol: { label: "Runtimes", hint: "Looks up end-of-life dates on endoflife.date" },
  ai_models: { label: "AI models", hint: "Matches model IDs against the retirement calendar" },
  certificates: { label: "TLS certs", hint: "Handshakes with referenced hosts to read cert expiry" },
  activity: { label: "Activity", hint: "Reads commit history to spot abandoned repositories" },
  ranking: { label: "Rank", hint: "Scores every finding and auto-resolves fixed ones" },
};
