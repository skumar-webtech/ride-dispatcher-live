import type { RideEvent } from "@/lib/types";

const TYPE_COLORS: Record<string, string> = {
  REQUESTED: "bg-muted-foreground",
  ROUND_STARTED: "bg-blue-500",
  DRIVERS_NOTIFIED: "bg-blue-400",
  ROUND_EMPTY: "bg-amber-500",
  ROUND_TIMEOUT_RETRY: "bg-amber-400",
  ACCEPT_ATTEMPT: "bg-purple-400",
  ASSIGNED: "bg-emerald-500",
  TIMEOUT: "bg-red-500",
  TIMEOUT_ABORTED: "bg-muted-foreground",
  CANCELLED: "bg-red-500",
};

export function EventTimeline({ events }: { events: RideEvent[] }) {
  if (!events?.length) {
    return (
      <p className="text-sm text-muted-foreground italic">No events yet…</p>
    );
  }
  return (
    <ol className="relative border-l border-border ml-2 space-y-3">
      {events.map((e) => (
        <li key={e.id} className="ml-4">
          <span
            className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full ring-2 ring-background ${
              TYPE_COLORS[e.type] || "bg-muted-foreground"
            }`}
          />
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-xs font-semibold text-foreground">
              {e.type}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {new Date(e.createdAt).toLocaleTimeString()}
            </span>
          </div>
          {e.payload && Object.keys(e.payload).length > 0 && (
            <pre className="mt-1 text-[10px] font-mono text-muted-foreground overflow-x-auto">
              {JSON.stringify(e.payload)}
            </pre>
          )}
        </li>
      ))}
    </ol>
  );
}
