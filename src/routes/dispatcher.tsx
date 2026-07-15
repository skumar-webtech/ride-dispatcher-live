import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DriversAPI, RidesAPI } from "@/lib/api";
import { useSocket } from "@/lib/socket-context";
import { useLocalState, keys, type DriverProfile } from "@/lib/profiles";
import { StatusPill } from "@/components/status-pill";
import { EventTimeline } from "@/components/event-timeline";
import type { Ride, RideEvent } from "@/lib/types";

export const Route = createFileRoute("/dispatcher")({
  head: () => ({
    meta: [
      { title: "Dispatcher — RideDispatch" },
      {
        name: "description",
        content: "Live ops view of every ride and driver in the demo.",
      },
    ],
  }),
  component: DispatcherPage,
});

function DispatcherPage() {
  const { socket } = useSocket();
  const [rideIds, setRideIds] = useLocalState<string[]>(keys.RIDES_KEY, []);
  const [rides, setRides] = useState<Record<string, Ride>>({});
  const [drivers, setDrivers] = useState<
    Record<string, { id: string; name: string; status: string; lat: number | null; lng: number | null }>
  >({});
  const [driverProfiles] = useLocalState<DriverProfile[]>(keys.DRIVERS_KEY, []);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [events, setEvents] = useState<RideEvent[]>([]);

  // subscribe socket for each ride
  useEffect(() => {
    if (!socket) return;
    rideIds.forEach((id) => socket.emit("ride:join", id));
    const onStatus = (p: any) => {
      setRides((prev) => {
        const cur = prev[p.rideId];
        if (!cur) return prev;
        return {
          ...prev,
          [p.rideId]: {
            ...cur,
            status: p.status,
            round: p.round ?? cur.round,
            assignedDriverId: p.driverId ?? cur.assignedDriverId,
          },
        };
      });
    };
    socket.on("ride:status", onStatus);
    return () => {
      socket.off("ride:status", onStatus);
    };
  }, [socket, rideIds]);

  // periodic refetch
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const results = await Promise.allSettled(
        rideIds.map((id) => RidesAPI.get(id)),
      );
      if (cancelled) return;
      const map: Record<string, Ride> = {};
      results.forEach((r, i) => {
        if (r.status === "fulfilled") map[rideIds[i]] = r.value;
      });
      setRides(map);
    };
    tick();
    const iv = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [rideIds]);

  // fetch driver profiles created locally to display
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const map: typeof drivers = {};
      await Promise.all(
        driverProfiles.map(async (p) => {
          try {
            const d = await DriversAPI.get(p.id);
            map[p.id] = {
              id: d.id,
              name: d.name,
              status: d.status,
              lat: d.lastLat,
              lng: d.lastLng,
            };
          } catch {}
        }),
      );
      if (!cancelled) setDrivers(map);
    };
    tick();
    const iv = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [driverProfiles]);

  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const ev = await RidesAPI.events(expanded);
        if (!cancelled) setEvents(ev);
      } catch {}
    };
    tick();
    const iv = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [expanded]);

  const loadTest = async () => {
    const center = { lat: 40.7128, lng: -74.006 };
    const n = 5;
    toast(`Creating ${n} drivers + 1 ride…`);
    try {
      const created = await Promise.all(
        Array.from({ length: n }, (_, i) =>
          DriversAPI.create({
            name: `LoadTest-${Date.now().toString().slice(-4)}-${i}`,
            lat: center.lat + (Math.random() - 0.5) * 0.02,
            lng: center.lng + (Math.random() - 0.5) * 0.02,
          }),
        ),
      );
      await Promise.all(
        created.map((d) => DriversAPI.updateStatus(d.id, "AVAILABLE")),
      );
      const ride = await RidesAPI.create({
        pickupLat: center.lat,
        pickupLng: center.lng,
      });
      setRideIds([ride.id, ...rideIds].slice(0, 30));
      toast.success(`Race started: ${ride.id.slice(0, 8)}`);
    } catch (e: any) {
      toast.error(`Load test failed: ${e.message}`);
    }
  };

  const ridesList = useMemo(
    () =>
      rideIds
        .map((id) => rides[id])
        .filter(Boolean)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [rideIds, rides],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dispatcher</h1>
          <p className="text-sm text-muted-foreground">
            Live ops view — every ride and driver in this session.
          </p>
        </div>
        <button
          onClick={loadTest}
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400"
        >
          Run load test (5 drivers + 1 ride)
        </button>
      </div>

      <Card title={`Rides (${ridesList.length})`}>
        {ridesList.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No rides yet in this session.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-2">ID</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Round</th>
                  <th className="text-left py-2">Driver</th>
                  <th className="text-left py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {ridesList.map((r) => (
                  <>
                    <tr
                      key={r.id}
                      onClick={() =>
                        setExpanded(expanded === r.id ? null : r.id)
                      }
                      className="cursor-pointer border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="py-2 font-mono text-xs">
                        {r.id.slice(0, 8)}
                      </td>
                      <td className="py-2">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="py-2 font-mono text-xs">{r.round}</td>
                      <td className="py-2 font-mono text-xs">
                        {r.assignedDriverId?.slice(0, 8) || "—"}
                      </td>
                      <td className="py-2 font-mono text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                    {expanded === r.id && (
                      <tr>
                        <td colSpan={5} className="py-3 pl-4">
                          <EventTimeline events={events} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={`Drivers (${Object.keys(drivers).length})`}>
        {Object.keys(drivers).length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No local driver profiles. Create one in Driver mode.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-2">ID</th>
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Location</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(drivers).map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-border/50 hover:bg-muted/30"
                  >
                    <td className="py-2 font-mono text-xs">
                      {d.id.slice(0, 8)}
                    </td>
                    <td className="py-2">{d.name}</td>
                    <td className="py-2">
                      <StatusPill status={d.status} />
                    </td>
                    <td className="py-2 font-mono text-xs text-muted-foreground">
                      {d.lat != null && d.lng != null
                        ? `${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
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
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 text-sm font-semibold text-foreground">{title}</div>
      {children}
    </div>
  );
}
