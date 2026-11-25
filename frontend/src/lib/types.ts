// Mirrors the response models in backend/app/schemas.py.

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type Reachability = "reachable" | "imported_not_called" | "declared_only";
export type FindingType =
  | "cve"
  | "secret"
  | "eol"
  | "license"
  | "model_retirement"
  | "cert_expiry"
  | "inactive_repo"
  | "custom_deadline";
export type ScanStatus = "queued" | "running" | "completed" | "failed";

export interface ScannerResult {
  findings: number;
  seconds: number;
  error: string | null;
}

export interface Scan {
  id: number;
  repo_id: number;
  status: ScanStatus;
  current_step: string | null;
  steps: string[];
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  scanner_report: Record<string, ScannerResult>;
}

export interface Repository {
  id: number;
  name: string;
  source: string;
  owner: string | null;
  is_public: boolean;
  last_commit_at: string | null;
  last_scanned_at: string | null;
  latest_scan: Scan | null;
  open_findings: number;
}

export interface Advisory {
  id: string;
  severity: Severity;
  summary: string;
  fixed: string | null;
  url: string;
}

export interface Finding {
  id: number;
  repo_id: number | null;
  repo_name: string | null;
  type: FindingType;
  severity: Severity;
  title: string;
  description: string;
  location: string | null;
  package: string | null;
  installed_version: string | null;
  fixed_version: string | null;
  reachability: Reachability | null;
  due_date: string | null;
  days_remaining: number | null;
  priority_score: number;
  status: "open" | "resolved";
  solution: Solution;
  details: {
    advisories?: Advisory[];
    imported_in?: string[];
    redacted?: string;
    in_history_only?: boolean;
    [key: string]: unknown;
  };
  first_seen_at: string;
}

export interface Solution {
  summary: string;
  steps: string[];
  command: string | null;
}

export interface Integrations {
  github: boolean;
}

export interface Stats {
  open_findings: number;
  by_severity: Partial<Record<Severity, number>>;
  by_type: Partial<Record<FindingType, number>>;
  vulnerable_dependencies: number;
  actionable_dependencies: number;
  noise_reduction_percent: number;
  overdue: number;
  due_within_30_days: number;
  repositories: number;
}

export interface RemediationPreview {
  issue_title: string;
  issue_body: string;
}
