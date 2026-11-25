/**
 * Static backdrop echoing the landing page: a green glow over a receding grid floor,
 * framed by faint cabinet columns. Nothing here animates, so it costs nothing per frame.
 */
export function DashboardBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg">
      <div className="absolute left-1/2 top-[-20%] h-[60vh] w-[80vw] -translate-x-1/2 rounded-full bg-accent/[0.12] blur-[120px]" />
      <div className="absolute inset-x-0 bottom-0 h-[55vh] [perspective:600px]">
        <div
          className="absolute inset-x-[-50%] bottom-0 h-[160%] origin-bottom"
          style={{
            transform: "rotateX(70deg)",
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "linear-gradient(to top, black 0%, transparent 75%)",
          }}
        />
      </div>
      {(["left", "right"] as const).map((side) => (
        <div
          key={side}
          className={`absolute top-0 h-full w-24 opacity-40 ${side === "left" ? "left-0" : "right-0"}`}
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "100% 72px",
            maskImage: `linear-gradient(to ${side === "left" ? "right" : "left"}, black, transparent)`,
          }}
        />
      ))}
    </div>
  );
}
