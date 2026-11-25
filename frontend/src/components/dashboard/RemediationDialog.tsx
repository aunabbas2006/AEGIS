"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, CircleDot, Github, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api, ApiError } from "@/lib/api";
import { Markdown } from "@/lib/markdown";
import type { Finding, RemediationPreview } from "@/lib/types";

type SendState =
  | { status: "idle" | "sending" }
  | { status: "sent"; url: string }
  | { status: "error"; message: string };

/** Previews a finding as a GitHub issue and files it on confirmation. */
export function RemediationDialog({ finding, open, onClose }: { finding: Finding; open: boolean; onClose: () => void }) {
  const [preview, setPreview] = useState<RemediationPreview | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [send, setSend] = useState<SendState>({ status: "idle" });

  useEffect(() => {
    if (!open) return;
    setSend({ status: "idle" });
    api.remediationPreview(finding.id).then(setPreview);
    api.integrations().then((integrations) => setConnected(integrations.github));
  }, [open, finding.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function submit() {
    setSend({ status: "sending" });
    try {
      const { url } = await api.createIssue(finding.id);
      setSend({ status: "sent", url });
    } catch (e) {
      setSend({ status: "error", message: e instanceof ApiError ? e.message : "Creating the issue failed." });
    }
  }

  // Portal to <body> so `position: fixed` is relative to the viewport, not an animated parent.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Create a GitHub issue"
            className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b0c0f] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]"
            initial={{ scale: 0.95, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 450, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl" />

            <header className="relative flex items-center gap-4 px-6 pt-6">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-bg">
                <Github className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-[0.25em] text-accent">Create GitHub issue</p>
                <h2 className="mt-1 line-clamp-1 text-lg font-medium">{finding.title}</h2>
              </div>
              {connected !== null && <ConnectionBadge connected={connected} />}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-2 text-muted transition hover:bg-white/10 hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="relative max-h-[55vh] overflow-y-auto px-6 py-5">
              {preview ? (
                <IssuePreview preview={preview} repo={finding.repo_name} />
              ) : (
                <div className="h-48 animate-pulse rounded-2xl bg-white/[0.03]" />
              )}
            </div>

            <footer className="relative flex items-center justify-between gap-4 border-t border-white/[0.06] bg-white/[0.02] px-6 py-4">
              <StatusLine send={send} connected={connected ?? false} />
              <CreateButton send={send} disabled={!connected} onClick={submit} />
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`hidden shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline-flex ${
        connected ? "bg-accent/15 text-accent" : "bg-white/[0.06] text-muted"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-accent" : "bg-white/30"}`} />
      {connected ? "Connected" : "Not set up"}
    </span>
  );
}

/** Looks like the issue will look on GitHub. */
function IssuePreview({ preview, repo }: { preview: RemediationPreview; repo: string | null }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1117]">
      <div className="border-b border-white/[0.08] px-5 py-4">
        <p className="font-mono text-[11px] text-muted">{repo ?? "repository"} · Issues · New</p>
        <h3 className="mt-2 text-base font-semibold">{preview.issue_title}</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#238636] px-2.5 py-1 text-xs font-medium text-white">
            <CircleDot className="h-3.5 w-3.5" /> Open
          </span>
          <span className="rounded-full border border-[#f85149]/50 bg-[#f85149]/10 px-2 py-0.5 text-[11px] text-[#ff7b72]">
            security
          </span>
          <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] text-accent">aegis</span>
        </div>
      </div>
      <div className="px-5 py-4">
        <Markdown source={preview.issue_body} />
      </div>
    </div>
  );
}

function StatusLine({ send, connected }: { send: SendState; connected: boolean }) {
  if (send.status === "sent") {
    return (
      <a href={send.url} target="_blank" rel="noreferrer" className="text-xs text-accent underline underline-offset-2">
        Issue created — open on GitHub
      </a>
    );
  }
  if (send.status === "error") return <p className="text-xs text-critical">{send.message}</p>;
  if (!connected) {
    return (
      <p className="text-xs text-muted">
        Preview only. Set{" "}
        <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-text">GITHUB_TOKEN</code> on the
        API to enable creating issues.
      </p>
    );
  }
  return <p className="text-xs text-muted">Nothing is created until you confirm.</p>;
}

function CreateButton({ send, disabled, onClick }: { send: SendState; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || send.status === "sending" || send.status === "sent"}
      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-bg transition hover:shadow-[0_0_24px_var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:shadow-none"
    >
      {send.status === "sending" && <Loader2 className="h-4 w-4 animate-spin" />}
      {send.status === "sent" && <Check className="h-4 w-4" />}
      {send.status === "sent" ? "Created" : "Create issue"}
    </button>
  );
}
