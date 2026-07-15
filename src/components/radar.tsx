interface RadarPoint {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  kind?: "driver" | "dropoff" | "self";
}

interface Props {
  center: { lat: number; lng: number };
  points?: RadarPoint[];
  round?: number;
  searching?: boolean;
  size?: number;
  scaleKm?: number; // radius in km represented by outermost ring
}

const KM_PER_DEG_LAT = 111;

export function Radar({
  center,
  points = [],
  round = 0,
  searching = false,
  size = 320,
  scaleKm = 5,
}: Props) {
  const half = size / 2;
  const kmPerDegLng = KM_PER_DEG_LAT * Math.cos((center.lat * Math.PI) / 180);

  const project = (lat: number, lng: number) => {
    const dLatKm = (lat - center.lat) * KM_PER_DEG_LAT;
    const dLngKm = (lng - center.lng) * kmPerDegLng;
    const x = half + (dLngKm / scaleKm) * (half - 10);
    const y = half - (dLatKm / scaleKm) * (half - 10);
    return { x, y };
  };

  const rings = [1, 2, 3, 4].map((i) => (i * (half - 10)) / 4);
  const activeRing = round > 0 ? Math.min(round, 4) : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="rounded-lg bg-card border border-border"
    >
      <defs>
        <radialGradient id="radar-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="radar-sweep-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.0" />
          <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.0" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.35" />
        </radialGradient>
        <radialGradient id="pickup-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={size} height={size} fill="url(#radar-grad)" />

      {/* Rotating sweep beam (only while searching) */}
      {searching && (
        <g style={{ transformOrigin: `${half}px ${half}px` }} className="animate-radar-sweep">
          <path
            d={`M ${half} ${half} L ${half + (half - 10)} ${half} A ${half - 10} ${half - 10} 0 0 0 ${half - (half - 10) * 0.5} ${half - (half - 10) * 0.87} Z`}
            fill="url(#radar-sweep-grad)"
          />
        </g>
      )}

      {rings.map((r, i) => (
        <circle
          key={i}
          cx={half}
          cy={half}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity={activeRing === i + 1 && searching ? 0.6 : 0.15}
          strokeWidth={activeRing === i + 1 && searching ? 2 : 1}
          className={
            activeRing === i + 1 && searching
              ? "text-amber-400 animate-pulse"
              : "text-muted-foreground"
          }
        />
      ))}

      {/* Ripple waves during SEARCHING */}
      {searching && [0, 0.7, 1.4].map((delay, i) => (
        <circle
          key={`ripple-${i}`}
          cx={half}
          cy={half}
          r={half - 10}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={1.5}
          className="animate-ripple"
          style={{ animationDelay: `${delay}s`, transformOrigin: `${half}px ${half}px` }}
        />
      ))}

      {/* crosshairs */}
      <line
        x1={half}
        y1={10}
        x2={half}
        y2={size - 10}
        stroke="currentColor"
        strokeOpacity="0.08"
        className="text-muted-foreground"
      />
      <line
        x1={10}
        y1={half}
        x2={size - 10}
        y2={half}
        stroke="currentColor"
        strokeOpacity="0.08"
        className="text-muted-foreground"
      />
      {/* center pickup with soft glow */}
      <circle cx={half} cy={half} r={22} fill="url(#pickup-glow)" />
      <circle cx={half} cy={half} r={6} fill="#f59e0b">
        <animate attributeName="r" values="6;8;6" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <circle
        cx={half}
        cy={half}
        r={10}
        fill="none"
        stroke="#f59e0b"
        strokeOpacity="0.5"
      />


      {points.map((p) => {
        const { x, y } = project(p.lat, p.lng);
        const clamped =
          x < 4 || y < 4 || x > size - 4 || y > size - 4;
        const cx = Math.max(6, Math.min(size - 6, x));
        const cy = Math.max(6, Math.min(size - 6, y));
        const color =
          p.kind === "dropoff"
            ? "#ef4444"
            : p.kind === "self"
              ? "#f59e0b"
              : "#10b981";
        return (
          <g key={p.id} opacity={clamped ? 0.5 : 1}>
            <circle cx={cx} cy={cy} r={5} fill={color} />
            {p.label && (
              <text
                x={cx + 8}
                y={cy + 3}
                fontSize="10"
                fill="currentColor"
                className="text-foreground font-mono"
              >
                {p.label}
              </text>
            )}
          </g>
        );
      })}
      <text
        x={12}
        y={size - 12}
        fontSize="10"
        className="fill-muted-foreground font-mono"
      >
        radius ~{scaleKm}km • round {round}
      </text>
    </svg>
  );
}
