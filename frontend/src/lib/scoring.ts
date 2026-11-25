// Client-side mirror of backend/app/scoring.py, used only by the interactive
// formula playground on the landing page. The backend remains the source of truth.

import type { Reachability, Severity } from "./types";

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 10,
  high: 7,
  medium: 4,
  low: 2,
  info: 1,
};

export const REACHABILITY_FACTOR: Record<Reachability, number> = {
  reachable: 1,
  imported_not_called: 0.4,
  declared_only: 0.1,
};

const OVERDUE_URGENCY = 3;
const PUBLIC_EXPOSURE = 1.25;
const MAX_RAW = SEVERITY_WEIGHT.critical * OVERDUE_URGENCY * PUBLIC_EXPOSURE;

export function urgency(days: number): number {
  return days <= 0 ? OVERDUE_URGENCY : 1 + 2 * Math.exp(-days / 30);
}

export function priorityScore(
  severity: Severity,
  days: number,
  reachability: Reachability,
  isPublic: boolean,
): number {
  const raw =
    SEVERITY_WEIGHT[severity] *
    urgency(days) *
    REACHABILITY_FACTOR[reachability] *
    (isPublic ? PUBLIC_EXPOSURE : 1);
  return Math.min(100, Math.round((raw / MAX_RAW) * 1000) / 10);
}
