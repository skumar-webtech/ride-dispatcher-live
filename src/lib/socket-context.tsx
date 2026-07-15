import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { API_BASE_URL } from "./api";

interface SocketCtx {
  socket: Socket | null;
  connected: boolean;
}

const Ctx = createContext<SocketCtx>({ socket: null, connected: false });

export function SocketProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const ref = useRef<Socket | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = io(API_BASE_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: true,
    });
    ref.current = s;
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    return () => {
      s.disconnect();
      ref.current = null;
    };
  }, []);

  const value = useMemo(
    () => ({ socket: ref.current, connected }),
    [connected],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSocket() {
  return useContext(Ctx);
}
