"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Finding, Repository, Stats } from "@/lib/types";

const POLL_INTERVAL_MS = 700;

/** Loads dashboard data and keeps polling while any scan is still in flight. */
export function useDashboardData() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [repos, queue, totals] = await Promise.all([api.repositories(), api.findings(), api.stats()]);
      setRepositories(repos);
      setFindings(queue);
      setStats(totals);
      setError(null);
    } catch {
      setError("Cannot reach the AEGIS API. Is the backend running on port 8000?");
    } finally {
      setLoaded(true);
    }
  }, []);

  const scanning = repositories.some((r) => r.latest_scan && ["queued", "running"].includes(r.latest_scan.status));

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!scanning) return;
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [scanning, refresh]);

  return { repositories, findings, stats, error, loaded, scanning, refresh };
}
