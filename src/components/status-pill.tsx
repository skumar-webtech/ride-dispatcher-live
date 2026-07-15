import type { RideStatus } from "@/lib/types";

const styles: Record<string, { pill: string; dot: string; ping?: boolean }> = {
  REQUESTED: { pill: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
  SEARCHING: { pill: "bg-blue-500/15 text-blue-300 border-blue-500/30", dot: "bg-blue-400", ping: true },
  ASSIGNED:  { pill: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
  TIMEOUT:   { pill: "bg-red-500/15 text-red-300 border-red-500/30", dot: "bg-red-400" },
  CANCELLED: { pill: "bg-red-500/15 text-red-300 border-red-500/30", dot: "bg-red-400" },
  AVAILABLE: { pill: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400", ping: true },
  BUSY:      { pill: "bg-amber-500/15 text-amber-300 border-amber-500/30", dot: "bg-amber-400", ping: true },
  OFFLINE:   { pill: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
};

export function StatusPill({ status }: { status: RideStatus | string }) {
  const s = styles[status] || styles.REQUESTED;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-mono font-semibold uppercase tracking-wider ${s.pill}`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {s.ping && (
          <span className={`absolute inset-0 rounded-full ${s.dot} animate-dot-ping`} />
        )}
        <span className={`relative h-1.5 w-1.5 rounded-full ${s.dot}`} />
      </span>
      {status}
    </span>
  );
}
