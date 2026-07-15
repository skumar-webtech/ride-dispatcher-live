import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DriversAPI, RidesAPI } from "@/lib/api";
import { useSocket } from "@/lib/socket-context";
import { useLocalState, keys, type DriverProfile } from "@/lib/profiles";
import { StatusPill } from "@/components/status-pill";
import { Radar } from "@/components/radar";
import type { RideOffer } from "@/lib/types";

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [
      { title: "Driver — RideDispatch" },
      {
        name: "description",
        content: "Go online, receive live ride offers, and race to accept.",
      },
    ],
  }),
  component: DriverPage,
});

interface OfferItem extends RideOffer {
  receivedAt: number;
  outcome?: "won" | "lost" | "expired";
}

function DriverPage() {
  const { socket } = useSocket();
  const [drivers, setDrivers] = useLocalState<DriverProfile[]>(
    keys.DRIVERS_KEY,
    [],
  );
  const [activeId, setActiveId] = useLocalState<string | null>(
    keys.ACTIVE_DRIVER_KEY,
    null,
  );

  const [status, setStatus] = useState<"AVAILABLE" | "OFFLINE">("OFFLINE");
  const [loc, setLoc] = useState({ lat: 40.7128, lng: -74.006 });
  const [simulate, setSimulate] = useState(false);
  const [name, setName] = useState("");

  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [history, setHistory] = useState<OfferItem[]>([]);

  const active = drivers.find((d) => d.id === activeId) || null;

  // register socket driver room
  useEffect(() => {
    if (!socket || !activeId) return;
    socket.emit("driver:join", activeId);
  }, [socket, activeId]);

  // load current status/location from server for active driver
  useEffect(() => {
    if (!activeId) return;
    DriversAPI.get(activeId)
      .then((d) => {
        setStatus(d.status === "OFFLINE" ? "OFFLINE" : "AVAILABLE");
        if (d.lastLat != null && d.lastLng != null)
          setLoc({ lat: d.lastLat, lng: d.lastLng });
      })
      .catch(() => {});
  }, [activeId]);

  // socket events
  useEffect(() => {
    if (!socket) return;
    const onOffer = (o: RideOffer) => {
      setOffers((prev) => {
        if (prev.some((p) => p.rideId === o.rideId)) return prev;
        return [{ ...o, receivedAt: Date.now() }, ...prev];
      });
      toast(`Ride offered • ${o.rideId.slice(0, 8)} • ${o.distanceKm.toFixed(2)}km`);
    };
    const onClosed = ({
      rideId,
      winningDriverId,
    }: {
      rideId: string;
      winningDriverId: string | null;
    }) => {
      setOffers((prev) => {
        const match = prev.find((p) => p.rideId === rideId);
        if (match && !match.outcome) {
          setHistory((h) => [
            {
              ...match,
              outcome: winningDriverId === activeId ? "won" : "lost",
            },
            ...h,
          ]);
        }
        return prev.filter((p) => p.rideId !== rideId);
      });
    };
    socket.on("ride:offer", onOffer);
    socket.on("ride:closed", onClosed);
    return () => {
      socket.off("ride:offer", onOffer);
      socket.off("ride:closed", onClosed);
    };
  }, [socket, activeId]);

  // Sim movement
  useEffect(() => {
    if (!simulate || !activeId) return;
    const iv = setInterval(() => {
      setLoc((l) => {
        const nl = {
          lat: l.lat + (Math.random() - 0.5) * 0.004,
          lng: l.lng + (Math.random() - 0.5) * 0.004,
        };
        DriversAPI.updateLocation(activeId, nl.lat, nl.lng).catch(() => {});
        return nl;
      });
    }, 2500);
    return () => clearInterval(iv);
  }, [simulate, activeId]);

  const commitLocation = () => {
    if (!activeId) return;
    DriversAPI.updateLocation(activeId, loc.lat, loc.lng)
      .then(() => toast.success("Location updated"))
      .catch(() => toast.error("Failed to update location"));
  };

  const toggleStatus = async () => {
    if (!activeId) return;
    const next = status === "AVAILABLE" ? "OFFLINE" : "AVAILABLE";
    try {
      await DriversAPI.updateStatus(activeId, next);
      setStatus(next);
      toast.success(`Status → ${next}`);
    } catch {
      toast.error("Status update failed");
    }
  };

  const createDriver = async () => {
    const nm = name.trim() || `Driver ${Math.floor(Math.random() * 999)}`;
    try {
      const d = await DriversAPI.create({
        name: nm,
        lat: loc.lat,
        lng: loc.lng,
      });
      const profile: DriverProfile = { id: d.id, name: d.name };
      setDrivers([profile, ...drivers]);
      setActiveId(d.id);
      setName("");
      toast.success(`Driver created: ${d.name}`);
    } catch (e: any) {
      toast.error(`Create failed: ${e.message}`);
    }
  };

  const accept = async (rideId: string) => {
    if (!activeId) return;
    const res = await RidesAPI.accept(rideId, activeId);
    setOffers((prev) => prev.filter((p) => p.rideId !== rideId));
    const original = offers.find((o) => o.rideId === rideId);
    if (res.success) {
      toast.success("You got it! 🎉");
      if (original)
        setHistory((h) => [{ ...original, outcome: "won" }, ...h]);
    } else {
      toast(`Too slow — ${res.reason || "already taken"}`);
      if (original)
        setHistory((h) => [{ ...original, outcome: "lost" }, ...h]);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <section className="lg:col-span-1 space-y-4">
        <Card title="Driver profile">
          <div className="space-y-2">
            {drivers.length > 0 && (
              <select
                value={activeId || ""}
                onChange={(e) => setActiveId(e.target.value || null)}
                className="w-full rounded-md bg-muted px-3 py-2 text-sm"
              >
                <option value="">— select driver —</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.id.slice(0, 6)})
                  </option>
                ))}
              </select>
            )}
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="New driver name"
                className="flex-1 rounded-md bg-muted px-3 py-2 text-sm"
              />
              <button
                onClick={createDriver}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                Create
              </button>
            </div>
            {active && (
              <div className="rounded-md bg-muted/40 p-2 text-xs font-mono text-muted-foreground">
                {active.id}
              </div>
            )}
          </div>
        </Card>

        {active && (
          <>
            <Card title="Status">
              <div className="flex items-center justify-between">
                <StatusPill status={status} />
                <button
                  onClick={toggleStatus}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                    status === "AVAILABLE"
                      ? "bg-muted text-foreground"
                      : "bg-emerald-500 text-black hover:bg-emerald-400"
                  }`}
                >
                  Go {status === "AVAILABLE" ? "Offline" : "Online"}
                </button>
              </div>
            </Card>

            <Card title="Location">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.0001"
                    value={loc.lat}
                    onChange={(e) =>
                      setLoc({ ...loc, lat: parseFloat(e.target.value) || 0 })
                    }
                    className="rounded-md bg-muted px-3 py-2 font-mono text-sm"
                  />
                  <input
                    type="number"
                    step="0.0001"
                    value={loc.lng}
                    onChange={(e) =>
                      setLoc({ ...loc, lng: parseFloat(e.target.value) || 0 })
                    }
                    className="rounded-md bg-muted px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={commitLocation}
                    className="flex-1 rounded-md border border-border py-1.5 text-sm hover:bg-muted"
                  >
                    Push location
                  </button>
                  <button
                    onClick={() => setSimulate((s) => !s)}
                    className={`flex-1 rounded-md py-1.5 text-sm font-medium ${
                      simulate
                        ? "bg-amber-500 text-black"
                        : "border border-border hover:bg-muted"
                    }`}
                  >
                    {simulate ? "Simulating…" : "Simulate motion"}
                  </button>
                </div>
              </div>
            </Card>
          </>
        )}
      </section>

      <section className="lg:col-span-2 space-y-4">
        <Card title="Radar (your position)">
          <Radar
            center={loc}
            points={[
              {
                id: "self",
                lat: loc.lat,
                lng: loc.lng,
                label: "you",
                kind: "self",
              },
            ]}
            size={320}
            searching={status === "AVAILABLE"}
            round={status === "AVAILABLE" ? 1 : 0}
          />
        </Card>

        <Card title={`Incoming offers (${offers.length})`}>
          {offers.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {status === "AVAILABLE"
                ? "Waiting for the next ride…"
                : "Go online to receive offers."}
            </p>
          ) : (
            <div className="space-y-3">
              {offers.map((o) => (
                <OfferCard key={o.rideId} offer={o} onAccept={accept} />
              ))}
            </div>
          )}
        </Card>

        {history.length > 0 && (
          <Card title="History">
            <ul className="space-y-1 text-sm">
              {history.slice(0, 10).map((h, i) => (
                <li
                  key={`${h.rideId}-${i}`}
                  className="flex items-center justify-between border-b border-border/50 py-1"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {h.rideId.slice(0, 8)} • r{h.round} • {h.distanceKm.toFixed(2)}km
                  </span>
                  <span
                    className={`text-xs font-semibold uppercase ${
                      h.outcome === "won"
                        ? "text-emerald-400"
                        : h.outcome === "lost"
                          ? "text-amber-400"
                          : "text-muted-foreground"
                    }`}
                  >
                    {h.outcome}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

function OfferCard({
  offer,
  onAccept,
}: {
  offer: OfferItem;
  onAccept: (rideId: string) => void;
}) {
  const [remaining, setRemaining] = useState(15);
  const ref = useRef(offer.receivedAt);
  useEffect(() => {
    const iv = setInterval(() => {
      const s = Math.max(0, 15 - Math.floor((Date.now() - ref.current) / 1000));
      setRemaining(s);
    }, 250);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wider text-amber-400">
            Round {offer.round} • {offer.distanceKm.toFixed(2)} km away
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            Ride {offer.rideId.slice(0, 8)}
          </div>
          <div className="font-mono text-xs">
            pickup {offer.pickupLat.toFixed(4)}, {offer.pickupLng.toFixed(4)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div
            className={`font-mono text-2xl font-bold ${
              remaining <= 5 ? "text-red-400" : "text-foreground"
            }`}
          >
            {remaining}s
          </div>
          <button
            onClick={() => onAccept(offer.rideId)}
            disabled={remaining === 0}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-bold text-black hover:bg-emerald-400 disabled:opacity-40"
          >
            Accept
          </button>
        </div>
      </div>
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
