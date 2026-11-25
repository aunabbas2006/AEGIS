import type { Finding, Integrations, RemediationPreview, Repository, Scan, Stats } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002/api";

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(typeof body.detail === "string" ? body.detail : `Request failed (${response.status})`);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  repositories: () => request<Repository[]>("/repositories"),
  connect: (source: string) => post<Repository>("/repositories", { source }),
  rescan: (repoId: number) => post<Scan>(`/repositories/${repoId}/scans`),
  disconnect: (repoId: number) => request<void>(`/repositories/${repoId}`, { method: "DELETE" }),

  findings: () => request<Finding[]>("/findings"),
  stats: () => request<Stats>("/stats"),
  resolve: (id: number) => post<Finding>(`/findings/${id}/resolve`),

  integrations: () => request<Integrations>("/integrations"),
  remediationPreview: (id: number) => request<RemediationPreview>(`/findings/${id}/remediation`),
  createIssue: (id: number) => post<{ url: string }>(`/findings/${id}/remediation`),
};
