export interface Driver {
  id: string;
  name: string;
  phone?: string;
  status: "AVAILABLE" | "BUSY" | "OFFLINE";
  lastLat: number | null;
  lastLng: number | null;
  createdAt: string;
  updatedAt: string;
}

export type RideStatus =
  | "REQUESTED"
  | "SEARCHING"
  | "ASSIGNED"
  | "TIMEOUT"
  | "CANCELLED";

export interface Ride {
  id: string;
  riderId: string | null;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number | null;
  dropoffLng: number | null;
  status: RideStatus;
  assignedDriverId: string | null;
  assignedAt: string | null;
  round: number;
  createdAt: string;
  updatedAt: string;
}

export interface RideEvent {
  id: string;
  rideId: string;
  type: string;
  payload: Record<string, any> | null;
  createdAt: string;
}

export interface RideOffer {
  rideId: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number | null;
  dropoffLng: number | null;
  distanceKm: number;
  round: number;
  ts: number;
}
