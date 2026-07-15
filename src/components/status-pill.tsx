import type { RideStatus } from "@/lib/types";

const styles: Record<string, string> = {
  REQUESTED: "bg-muted text-muted-foreground",
  SEARCHING: "bg-blue-500/20 text-blue-400 animate-pulse",
  ASSIGNED: "bg-emerald-500/20 text-emerald-400",
  TIMEOUT: "bg-red-500/20 text-red-400",
  CANCELLED: "bg-red-500/20 text-red-400",
  AVAILABLE: "bg-emerald-500/20 text-emerald-400",
  BUSY: "bg-amber-500/20 text-amber-400",
  OFFLINE: "bg-muted text-muted-foreground",
};

export function StatusPill({ status }: { status: RideStatus | string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-mono font-semibold uppercase tracking-wider ${
        styles[status] || "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}
