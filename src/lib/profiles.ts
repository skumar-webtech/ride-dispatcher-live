import { useEffect, useState } from "react";

const RIDER_KEY = "ridedispatch.rider";
const DRIVERS_KEY = "ridedispatch.drivers";
const ACTIVE_DRIVER_KEY = "ridedispatch.activeDriver";
const RIDES_KEY = "ridedispatch.rides";

export interface RiderProfile {
  id: string;
  name: string;
}
export interface DriverProfile {
  id: string;
  name: string;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = window.localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function useLocalState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setValue(read<T>(key, fallback));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useEffect(() => {
    if (hydrated) write(key, value);
  }, [key, value, hydrated]);
  return [value, setValue, hydrated] as const;
}

export const keys = {
  RIDER_KEY,
  DRIVERS_KEY,
  ACTIVE_DRIVER_KEY,
  RIDES_KEY,
};
