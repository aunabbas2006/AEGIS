import type { CSSProperties } from "react";

/**
 * The hero visual: a monochrome archive corridor (filing cabinets receding on both
 * sides) with a glowing green "protected stack" at its centre and documents
 * drifting out of the drawers.
 *
 * Performance notes: the 3D walls are static, so the browser rasterises them once.
 * Everything that moves is its own composited layer animated with CSS keyframes
 * (see globals.css), so no JavaScript runs per frame and no filters are re-painted.
 */

const ROWS = 6;
const COLUMNS = 9;
const TRAYS = 8;

// Deterministic pseudo-random so server and client renders match.
const seeded = (n: number) => {
  const x = Math.sin(n * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

const px = (n: number) => `${n.toFixed(1)}px`;
const pct = (n: number) => `${n.toFixed(2)}%`;

export function VaultScene() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden [perspective:900px] [perspective-origin:50%_45%]">
      <div className="absolute inset-0 [transform-style:preserve-3d]">
        <CabinetWall side="left" />
        <CabinetWall side="right" />
        <Floor />
      </div>

      {/* Depth fog: the corridor dissolves into darkness at the vanishing point. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_32%_38%_at_50%_48%,#07080a_10%,transparent_75%)]" />
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-bg to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />

      <FlyingPapers />
      <ProtectedStack />
    </div>
  );
}

function CabinetWall({ side }: { side: "left" | "right" }) {
  const isLeft = side === "left";
  return (
    <div
      className="absolute top-[4%] grid h-[92%] w-[1300px] gap-[6px] p-2"
      style={{
        [isLeft ? "left" : "right"]: 0,
        transformOrigin: isLeft ? "left center" : "right center",
        transform: `rotateY(${isLeft ? 74 : -74}deg)`,
        gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
        gridTemplateRows: `repeat(${ROWS}, 1fr)`,
      }}
    >
      {Array.from({ length: ROWS * COLUMNS }, (_, i) => {
        const shade = 18 + Math.round(seeded(i + (isLeft ? 7 : 107)) * 16);
        return (
          <div
            key={i}
            className="relative rounded-[3px] border border-white/[0.07]"
            style={{
              background: `linear-gradient(180deg, rgb(${shade + 14},${shade + 14},${shade + 16}) 0%, rgb(${shade},${shade},${shade + 2}) 100%)`,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -8px 16px rgba(0,0,0,0.5)",
            }}
          >
            <span className="absolute left-1/2 top-[38%] h-[7px] w-[34%] -translate-x-1/2 rounded-full border border-white/20 bg-black/40" />
            <span className="absolute left-1/2 top-[18%] h-[9px] w-[22%] -translate-x-1/2 rounded-[1px] bg-white/10" />
          </div>
        );
      })}
    </div>
  );
}

function Floor() {
  return (
    <div
      className="absolute bottom-0 left-1/2 h-[1400px] w-[160%] -translate-x-1/2"
      style={{
        transformOrigin: "bottom center",
        transform: "rotateX(82deg)",
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px), radial-gradient(ellipse at 50% 92%, rgba(61,255,139,0.22), transparent 40%)",
        backgroundSize: "60px 60px, 60px 60px, 100% 100%",
      }}
    />
  );
}

function FlyingPapers() {
  return (
    <div className="absolute inset-0">
      {Array.from({ length: 12 }, (_, i) => {
        const fromLeft = i % 2 === 0;
        const r = seeded(i + 300);
        const direction = fromLeft ? -1 : 1;
        const style = {
          left: pct(fromLeft ? 18 + r * 14 : 68 + r * 14),
          top: pct(22 + seeded(i + 400) * 50),
          "--dx": px(direction * (80 + r * 140)),
          "--dy": px(-60 - r * 100),
          "--rot": `${(direction * (120 + r * 220)).toFixed(0)}deg`,
          "--duration": `${(4 + r * 3).toFixed(2)}s`,
          "--delay": `${(-r * 6).toFixed(2)}s`, // negative delay: already mid-flight on load
        } as CSSProperties;
        return (
          <div
            key={i}
            className="animate-paper absolute h-7 w-5 rounded-[2px] bg-gradient-to-br from-zinc-200 to-zinc-400"
            style={style}
          >
            <span className="absolute inset-x-1 top-1.5 h-px bg-zinc-500/70" />
            <span className="absolute inset-x-1 top-3 h-px bg-zinc-500/70" />
            <span className="absolute left-1 right-2 top-[18px] h-px bg-zinc-500/70" />
          </div>
        );
      })}
    </div>
  );
}

/** Stack of isometric wireframe trays: the repositories AEGIS is guarding. */
function ProtectedStack() {
  // Each tray is its own small SVG on its own layer, so bobbing never repaints the others.
  const traySpacing = 100 / (TRAYS + 2.2); // % of stack height between trays
  return (
    <div className="absolute bottom-[2%] left-1/2 aspect-[260/380] h-[40%] -translate-x-1/2">
      <div className="animate-glow absolute -inset-12 rounded-full bg-accent/25 blur-3xl" />

      {Array.from({ length: TRAYS }, (_, layer) => {
        const style = {
          top: pct(layer * traySpacing),
          left: pct(6 + (seeded(layer + 50) - 0.5) * 6),
          "--float-y": "-3px",
          "--float-duration": `${(2 + seeded(layer)).toFixed(2)}s`,
          animationDelay: `${(-seeded(layer + 9) * 2).toFixed(2)}s`,
        } as CSSProperties;
        return (
          <div key={layer} className="animate-float absolute w-[85%]" style={style}>
            <Tray />
          </div>
        );
      })}

      {/* Scanning beam: a full-height track that slides down by its own height. */}
      <div className="animate-beam absolute inset-x-0 top-0 h-[92%]">
        <div className="h-1.5 w-full rounded-full bg-accent shadow-[0_0_16px_4px_rgba(61,255,139,0.6)]" />
      </div>
    </div>
  );
}

function Tray() {
  const w = 220;
  const d = 70; // isometric depth
  const t = 18; // tray thickness
  const top = `0,${d / 2} ${w / 2},0 ${w},${d / 2} ${w / 2},${d}`;
  const left = `0,${d / 2} ${w / 2},${d} ${w / 2},${d + t} 0,${d / 2 + t}`;
  const right = `${w / 2},${d} ${w},${d / 2} ${w},${d / 2 + t} ${w / 2},${d + t}`;

  return (
    <svg viewBox={`-2 -2 ${w + 4} ${d + t + 4}`} className="w-full overflow-visible">
      <polygon points={left} fill="#0d2a18" stroke="#3dff8b" strokeWidth="1.2" />
      <polygon points={right} fill="#0a1f12" stroke="#3dff8b" strokeWidth="1.2" />
      <polygon points={top} fill="#3dff8b" fillOpacity="0.2" stroke="#6bffaa" strokeWidth="1.5" />
      {[0.25, 0.5, 0.75].map((f) => (
        <g key={f} stroke="#3dff8b" strokeOpacity="0.4" strokeWidth="0.7">
          <line x1={(w / 2) * f} y1={d / 2 + (d / 2) * f} x2={w / 2 + (w / 2) * f} y2={(d / 2) * f} />
          <line x1={(w / 2) * f} y1={d / 2 - (d / 2) * f} x2={w / 2 + (w / 2) * f} y2={d - (d / 2) * f} />
        </g>
      ))}
    </svg>
  );
}
