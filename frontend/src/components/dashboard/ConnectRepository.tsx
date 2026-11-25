"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FlaskConical, GitBranch, Loader2, RefreshCw, Search, X } from "lucide-react";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Repository } from "@/lib/types";

/** Command bar for connecting repositories, plus a chip per connected repository. */
export function ConnectRepository({ repositories, onChange }: { repositories: Repository[]; onChange: () => void }) {
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect(value: string) {
    setBusy(true);
    setError(null);
    try {
      await api.connect(value);
      setSource("");
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not connect repository.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (source.trim()) connect(source.trim());
        }}
        className="group flex items-center gap-2 rounded-full border border-white/10 bg-surface/90 p-1.5 pl-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] transition focus-within:border-accent/60 focus-within:shadow-[0_0_40px_-10px_rgba(61,255,139,0.5)]"
      >
        <Search className="h-4 w-4 shrink-0 text-muted" />
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Paste a public GitHub URL — https://github.com/owner/repo"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted/60"
          aria-label="GitHub repository URL"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => connect("demo")}
          className="hidden items-center gap-2 rounded-full px-4 py-2 text-sm text-muted transition hover:bg-white/5 hover:text-text sm:inline-flex"
        >
          <FlaskConical className="h-4 w-4 text-accent" /> Try demo
        </button>
        <button
          type="submit"
          disabled={busy || !source.trim()}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-bg transition hover:shadow-[0_0_24px_var(--accent)] disabled:opacity-40 disabled:hover:shadow-none"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Scan
        </button>
      </form>
      <button
        type="button"
        disabled={busy}
        onClick={() => connect("demo")}
        className="mx-auto mt-3 flex items-center gap-2 text-sm text-muted sm:hidden"
      >
        <FlaskConical className="h-4 w-4 text-accent" /> Try the demo repository
      </button>
      {error && <p className="mt-3 text-center text-sm text-critical">{error}</p>}

      <ul className="mt-5 flex flex-wrap justify-center gap-2">
        <AnimatePresence initial={false}>
          {repositories.map((repo) => (
            <RepositoryChip key={repo.id} repo={repo} onChange={onChange} />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

function RepositoryChip({ repo, onChange }: { repo: Repository; onChange: () => void }) {
  const status = repo.latest_scan?.status;
  const inFlight = status === "queued" || status === "running";

  return (
    <motion.li
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group flex items-center gap-2 rounded-full border border-white/10 bg-surface/80 py-1.5 pl-3 pr-1.5 text-xs"
      title={status === "failed" ? repo.latest_scan?.error ?? "" : undefined}
    >
      {inFlight ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
      ) : (
        <GitBranch className={`h-3.5 w-3.5 ${status === "failed" ? "text-critical" : "text-accent"}`} />
      )}
      <span className="font-medium">{repo.owner ? `${repo.owner}/${repo.name}` : repo.name}</span>
      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-muted">
        {inFlight ? "scanning" : status === "failed" ? "failed" : `${repo.open_findings} risks`}
      </span>
      <button
        type="button"
        aria-label={`Rescan ${repo.name}`}
        disabled={inFlight}
        onClick={() => api.rescan(repo.id).then(onChange)}
        className="rounded-full p-1 text-muted transition hover:bg-white/10 hover:text-text disabled:opacity-30"
      >
        <RefreshCw className="h-3 w-3" />
      </button>
      <button
        type="button"
        aria-label={`Disconnect ${repo.name}`}
        disabled={inFlight}
        onClick={() => api.disconnect(repo.id).then(onChange)}
        className="rounded-full p-1 text-muted transition hover:bg-critical/20 hover:text-critical disabled:opacity-30"
      >
        <X className="h-3 w-3" />
      </button>
    </motion.li>
  );
}
