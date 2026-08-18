import type { FallingObj } from "./types";

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
        width: obj.size,
        height: obj.size,
        marginLeft: -obj.size / 2,
        touchAction: "none",
        animation: `takbom-fall ${obj.duration}s linear forwards`,
      }}
    >
      {obj.kind === "star" ? (
        <span
          className="block"
          style={{
            width: "100%",
            height: "100%",
            filter:
              "drop-shadow(0 0 6px #39FF14) drop-shadow(0 0 12px #61D120)",
          }}
        >
          <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
            <g
              stroke="#2E8B10"
              strokeWidth="12"
              strokeLinecap="round"
              shapeRendering="crispEdges"
            >
              <line x1="50" y1="8" x2="50" y2="92" />
              <line x1="8" y1="50" x2="92" y2="50" />
              <line x1="20" y1="20" x2="80" y2="80" />
              <line x1="80" y1="20" x2="20" y2="80" />
            </g>
            <g stroke="#61D120" strokeWidth="8" strokeLinecap="round">
              <line x1="50" y1="8" x2="50" y2="92" />
              <line x1="8" y1="50" x2="92" y2="50" />
              <line x1="20" y1="20" x2="80" y2="80" />
              <line x1="80" y1="20" x2="20" y2="80" />
            </g>
            <g stroke="#8AFF32" strokeWidth="4" strokeLinecap="round">
              <line x1="50" y1="24" x2="50" y2="76" />
              <line x1="24" y1="50" x2="76" y2="50" />
            </g>
            <circle cx="50" cy="50" r="10" fill="#8AFF32" />
          </svg>
        </span>
      ) : (
        <span
          className="grid place-items-center rounded-full animate-pulse"
          style={{
            width: "100%",
            height: "100%",
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
