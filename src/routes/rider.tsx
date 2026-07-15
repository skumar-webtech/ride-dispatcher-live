import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { RidesAPI, DriversAPI } from "@/lib/api";
import { useSocket } from "@/lib/socket-context";
import { useLocalState, keys, type RiderProfile } from "@/lib/profiles";
import { StatusPill } from "@/components/status-pill";
import { Radar } from "@/components/radar";
import { EventTimeline } from "@/components/event-timeline";
import type { Ride, RideEvent, Driver } from "@/lib/types";

export const Route = createFileRoute("/rider")({
  head: () => ({
    meta: [
      { title: "Rider — RideDispatch" },
      {
        name: "description",
        content: "Request a ride and watch the dispatch state machine live.",
      },
    ],
  }),
  component: RiderPage,
});

const PRESETS = [
  { label: "Downtown", lat: 40.7128, lng: -74.006 },
  { label: "Airport", lat: 40.6413, lng: -73.7781 },
  { label: "Uptown", lat: 40.8075, lng: -73.9626 },
  { label: "Brooklyn", lat: 40.6782, lng: -73.9442 },
];

function RiderPage() {
  const { socket } = useSocket();
  const [rider, setRider] = useLocalState<RiderProfile | null>(
    keys.RIDER_KEY,
    null,
  );
  const [rideIds, setRideIds] = useLocalState<string[]>(keys.RIDES_KEY, []);
  const [name, setName] = useState("");

  const [pickup, setPickup] = useState({ lat: 40.7128, lng: -74.006 });
  const [dropoff, setDropoff] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  const [rideId, setRideId] = useState<string | null>(null);
  const [ride, setRide] = useState<Ride | null>(null);
  const [events, setEvents] = useState<RideEvent[]>([]);
  const [winner, setWinner] = useState<Driver | null>(null);
  const lastSocketAt = useRef<number>(0);

  // subscribe
  useEffect(() => {
    if (!socket || !rideId) return;
    socket.emit("ride:join", rideId);
    const handler = (payload: any) => {
      if (payload.rideId !== rideId) return;
      lastSocketAt.current = Date.now();
      setRide((r) =>
        r
          ? {
              ...r,
              status: payload.status,
              round: payload.round ?? r.round,
              assignedDriverId: payload.driverId ?? r.assignedDriverId,
            }
          : r,
      );
      if (payload.status === "ASSIGNED") toast.success("Driver assigned!");
      if (payload.status === "TIMEOUT")
        toast.error("Ride timed out — no drivers");
      if (payload.status === "CANCELLED") toast("Ride cancelled");
    };
    socket.on("ride:status", handler);
    return () => {
      socket.off("ride:status", handler);
    };
  }, [socket, rideId]);

  // polling: ride + events
  useEffect(() => {
    if (!rideId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const [r, ev] = await Promise.all([
          RidesAPI.get(rideId),
          RidesAPI.events(rideId),
        ]);
        if (cancelled) return;
        setRide(r);
        setEvents(ev);
      } catch {}
    };
    tick();
    const iv = setInterval(tick, 2500);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [rideId]);

  // Fetch winning driver
  useEffect(() => {
    if (ride?.status === "ASSIGNED" && ride.assignedDriverId) {
      DriversAPI.get(ride.assignedDriverId).then(setWinner).catch(() => {});
    } else {
      setWinner(null);
    }
  }, [ride?.status, ride?.assignedDriverId]);

  const ensureRider = () => {
    if (rider) return rider;
    const id = `rider_${Math.random().toString(36).slice(2, 10)}`;
    const rp = { id, name: name || `Rider ${id.slice(-4)}` };
    setRider(rp);
    return rp;
  };

  const request = async () => {
    const rp = ensureRider();
    try {
      const r = await RidesAPI.create({
        riderId: rp.id,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropoffLat: dropoff?.lat,
        dropoffLng: dropoff?.lng,
      });
      setRideId(r.id);
      setRide(r);
      setEvents([]);
      setRideIds([r.id, ...rideIds].slice(0, 20));
      toast.success(`Ride requested • ${r.id.slice(0, 8)}`);
    } catch (e: any) {
      toast.error(`Failed to request ride: ${e.message}`);
    }
  };

  const cancel = async () => {
    if (!rideId) return;
    try {
      await RidesAPI.cancel(rideId);
      toast("Cancel requested");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Cannot cancel");
    }
  };

  const isTerminal =
    ride?.status === "ASSIGNED" ||
    ride?.status === "TIMEOUT" ||
    ride?.status === "CANCELLED";

  const points = useMemo(() => {
    const pts = [] as any[];
    if (dropoff)
      pts.push({
        id: "drop",
        lat: dropoff.lat,
        lng: dropoff.lng,
        label: "drop",
        kind: "dropoff" as const,
      });
    return pts;
  }, [dropoff]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section className="space-y-4">
        <Card title="Rider profile">
          {rider ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{rider.name}</div>
                <div className="font-mono text-xs text-muted-foreground">
                  {rider.id}
                </div>
              </div>
              <button
                onClick={() => setRider(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                switch
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="flex-1 rounded-md bg-muted px-3 py-2 text-sm outline-none"
              />
              <button
                onClick={() => ensureRider()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Create
              </button>
            </div>
          )}
        </Card>

        <Card title="Request a ride">
          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Presets
              </label>
              <div className="mt-1 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setPickup({ lat: p.lat, lng: p.lng })}
                    className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs hover:bg-muted"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <CoordInput label="Pickup" value={pickup} onChange={setPickup} />
            <div>
              <label className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <input
                  type="checkbox"
                  checked={!!dropoff}
                  onChange={(e) =>
                    setDropoff(
                      e.target.checked
                        ? { lat: pickup.lat + 0.02, lng: pickup.lng + 0.02 }
                        : null,
                    )
                  }
                />
                Dropoff (optional)
              </label>
              {dropoff && (
                <div className="mt-2">
                  <CoordInput
                    label=""
                    value={dropoff}
                    onChange={(v) => setDropoff(v)}
                  />
                </div>
              )}
            </div>
            <button
              onClick={request}
              disabled={!!ride && !isTerminal}
              className="w-full rounded-md bg-amber-500 px-4 py-2.5 font-semibold text-black hover:bg-amber-400 disabled:opacity-40"
            >
              {ride && !isTerminal ? "Ride in progress…" : "Request Ride"}
            </button>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        {ride ? (
          <Card
            title={
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span>Live ride</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {ride.id.slice(0, 8)}
                  </span>
                </div>
                <StatusPill status={ride.status} />
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Radar
                center={{ lat: ride.pickupLat, lng: ride.pickupLng }}
                round={ride.round}
                searching={ride.status === "SEARCHING"}
                points={points}
                size={280}
              />
              <div className="space-y-2 text-sm">
                <Row label="Round" value={String(ride.round)} />
                <Row
                  label="Pickup"
                  value={`${ride.pickupLat.toFixed(4)}, ${ride.pickupLng.toFixed(4)}`}
                />
                {ride.dropoffLat != null && (
                  <Row
                    label="Dropoff"
                    value={`${ride.dropoffLat.toFixed(4)}, ${ride.dropoffLng!.toFixed(4)}`}
                  />
                )}
                {winner && (
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <div className="text-xs uppercase tracking-wider text-emerald-400">
                      Assigned driver
                    </div>
                    <div className="mt-1 font-medium">{winner.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {winner.id}
                    </div>
                    {ride.assignedAt && (
                      <div className="font-mono text-[10px] text-muted-foreground mt-1">
                        @ {new Date(ride.assignedAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                )}
                <div className="pt-2 flex gap-2">
                  {!isTerminal && (
                    <button
                      onClick={cancel}
                      className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                    >
                      Cancel
                    </button>
                  )}
                  {isTerminal && (
                    <button
                      onClick={() => {
                        setRide(null);
                        setRideId(null);
                        setEvents([]);
                      }}
                      className="rounded-md bg-amber-500 px-4 py-1.5 text-sm font-semibold text-black hover:bg-amber-400"
                    >
                      Request again
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card title="Live ride">
            <p className="text-sm text-muted-foreground">
              No active ride. Request one to see the dispatch state machine
              light up in real time.
            </p>
          </Card>
        )}
        {ride && (
          <Card title="Event timeline">
            <EventTimeline events={events} />
          </Card>
        )}
      </section>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/70 backdrop-blur-sm p-4 card-glow">
      <div className="mb-3 text-sm font-semibold text-foreground">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/50 py-1">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}

function CoordInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { lat: number; lng: number };
  onChange: (v: { lat: number; lng: number }) => void;
}) {
  return (
    <div>
      {label && (
        <label className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
      )}
      <div className="mt-1 grid grid-cols-2 gap-2">
        <input
          type="number"
          step="0.0001"
          value={value.lat}
          onChange={(e) =>
            onChange({ ...value, lat: parseFloat(e.target.value) || 0 })
          }
          className="rounded-md bg-muted px-3 py-2 font-mono text-sm outline-none"
        />
        <input
          type="number"
          step="0.0001"
          value={value.lng}
          onChange={(e) =>
            onChange({ ...value, lng: parseFloat(e.target.value) || 0 })
          }
          className="rounded-md bg-muted px-3 py-2 font-mono text-sm outline-none"
        />
      </div>
    </div>
  );
}
