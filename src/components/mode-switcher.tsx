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
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-amber-500 grid place-items-center font-bold text-black">
            R
          </div>
          <div>
            <div className="text-sm font-semibold leading-none">
              RideDispatch
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              live allocation demo
            </div>
          </div>
        </div>
        <nav className="inline-flex rounded-lg bg-muted p-1">
          {MODES.map((m) => {
            const active = pathname.startsWith(m.to);
            return (
              <Link
                key={m.to}
                to={m.to}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-background text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
            }`}
          />
          <span className="text-muted-foreground">
            {connected ? "socket live" : "socket offline"}
          </span>
        </div>
      </div>
    </header>
  );
}
