import type { FallingObj } from "./types";

const PAD = 10;

export function FallingObject({
  obj,
  onTap,
  onDone,
}: {
  obj: FallingObj;
  onTap: (obj: FallingObj) => void;
  onDone: (id: number) => void;
}) {
  const handle = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onTap(obj);
  };

  return (
    <button
      type="button"
      onPointerDown={handle}
      onAnimationEnd={() => onDone(obj.id)}
      aria-label={obj.kind === "bomb" ? "Bomb" : "Star"}
      className="absolute grid place-items-center"
      style={{
        left: `${obj.x}%`,
        top: 0,
        position: "absolute",
        width: obj.size + PAD * 2,
        height: obj.size + PAD * 2,
        padding: PAD,
        marginLeft: -(obj.size / 2 + PAD),
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        pointerEvents: "all",
        animation: `takbom-fall ${obj.duration}s linear forwards`,
        willChange: "transform",
        contain: "layout style",
      }}
    >
      {obj.kind === "star" ? (
        <span
          className="block"
          style={{
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            filter: "drop-shadow(0 0 2px rgba(74,158,26,0.5))",
          }}
        >
          <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
            <g
              stroke="#2E8B10"
              strokeWidth="12"
              strokeLinecap="round"
              shapeRendering="crispEdges"
              opacity="0.7"
            >
              <line x1="50" y1="8" x2="50" y2="92" />
              <line x1="8" y1="50" x2="92" y2="50" />
              <line x1="20" y1="20" x2="80" y2="80" />
              <line x1="80" y1="20" x2="20" y2="80" />
            </g>
            <g stroke="#4a9e1a" strokeWidth="8" strokeLinecap="round">
              <line x1="50" y1="8" x2="50" y2="92" />
              <line x1="8" y1="50" x2="92" y2="50" />
              <line x1="20" y1="20" x2="80" y2="80" />
              <line x1="80" y1="20" x2="20" y2="80" />
            </g>
            <g stroke="#5aaa28" strokeWidth="4" strokeLinecap="round">
              <line x1="50" y1="24" x2="50" y2="76" />
              <line x1="24" y1="50" x2="76" y2="50" />
            </g>
            <circle cx="50" cy="50" r="10" fill="#4a9e1a" />
          </svg>
        </span>
      ) : (
        <span
          className="grid place-items-center rounded-full animate-pulse"
          style={{
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            background: "radial-gradient(circle at 35% 30%, #fde047, #ca8a04)",
            boxShadow: "0 0 14px #facc15, 0 0 28px rgba(250,204,21,0.6)",
            border: "2px solid #fef08a",
            fontSize: `${Math.round(obj.size * 0.5)}px`,
            lineHeight: 1,
          }}
        >
          💣
        </span>
      )}
    </button>
  );
}
