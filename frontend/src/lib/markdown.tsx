import { Fragment, type ReactNode } from "react";

/**
 * A deliberately tiny Markdown renderer for the strings AEGIS itself generates
 * (GitHub issue bodies, fix summaries). Supports `code`, **bold**, *italic* / _italic_,
 * "### " headings, "> " quotes and "---" rules.
 */
const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

export function renderInline(text: string): ReactNode {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[0.85em] text-accent">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**")) return <strong key={i} className="font-semibold text-text">{part.slice(2, -2)}</strong>;
    if ((part.startsWith("*") || part.startsWith("_")) && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function Markdown({ source }: { source: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-muted">
      {source.split("\n").map((line, i) => {
        if (!line.trim()) return null;
        if (line.startsWith("### ")) {
          return <h4 key={i} className="pt-2 text-sm font-semibold text-text">{line.slice(4)}</h4>;
        }
        if (line.startsWith("> ")) {
          return (
            <blockquote key={i} className="border-l-2 border-white/20 pl-3">
              {renderInline(line.slice(2))}
            </blockquote>
          );
        }
        if (line.trim() === "---") return <hr key={i} className="border-line" />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}
