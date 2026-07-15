import { Link, useRouterState } from "@tanstack/react-router";
import { useSocket } from "@/lib/socket-context";

const MODES = [
  { to: "/rider", label: "Rider" },
  { to: "/driver", label: "Driver" },
  { to: "/dispatcher", label: "Dispatcher" },
] as const;

export function ModeSwitcher() {
  const { connected } = useSocket();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 grid place-items-center font-bold text-black shadow-lg shadow-amber-500/20 animate-glow-pulse">
            <span className="relative z-10">R</span>
            <span className="absolute inset-0 rounded-lg ring-1 ring-white/20" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-none tracking-tight">
              Ride<span className="gradient-text">Dispatch</span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
              live allocation demo
            </div>
          </div>
        </div>
        <nav className="inline-flex rounded-lg bg-muted/60 p-1 border border-border/60">
          {MODES.map((m) => {
            const active = pathname.startsWith(m.to);
            return (
              <Link
                key={m.to}
                to={m.to}
                className={`relative px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-background text-foreground shadow-sm ring-1 ring-amber-500/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {m.label}
                {active && (
                  <span className="absolute -bottom-px left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inset-0 rounded-full ${
                connected ? "bg-emerald-500 animate-dot-ping" : "bg-red-500"
              }`}
            />
            <span
              className={`relative h-2 w-2 rounded-full ${
                connected ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
          </span>
          <span className="text-muted-foreground">
            {connected ? "socket live" : "socket offline"}
          </span>
        </div>
      </div>
    </header>
  );
}

