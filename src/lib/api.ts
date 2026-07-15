import axios from "axios";
import type { Driver, Ride, RideEvent, RideOffer } from "./types";

export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:3000";

export const api = axios.create({ baseURL: API_BASE_URL });

export const DriversAPI = {
  create: (body: { name: string; phone?: string; lat?: number; lng?: number }) =>
    api.post<Driver>("/drivers", body).then((r) => r.data),
  get: (id: string) =>
    api
      .get<Driver & { liveStatus: Driver["status"] }>(`/drivers/${id}`)
      .then((r) => r.data),
  updateLocation: (id: string, lat: number, lng: number) =>
    api.patch(`/drivers/${id}/location`, { lat, lng }).then((r) => r.data),
  updateStatus: (id: string, status: "AVAILABLE" | "OFFLINE") =>
    api.patch(`/drivers/${id}/status`, { status }).then((r) => r.data),
  notifications: (id: string) =>
    api.get<RideOffer[]>(`/drivers/${id}/notifications`).then((r) => r.data),
};

export const RidesAPI = {
  create: (body: {
    riderId?: string;
    pickupLat: number;
    pickupLng: number;
    dropoffLat?: number;
    dropoffLng?: number;
  }) => api.post<Ride>("/rides", body).then((r) => r.data),
  get: (id: string) =>
    api.get<Ride & { liveState: string }>(`/rides/${id}`).then((r) => r.data),
  events: (id: string) =>
    api.get<RideEvent[]>(`/rides/${id}/events`).then((r) => r.data),
  accept: async (
    id: string,
    driverId: string,
  ): Promise<{
    success: boolean;
    rideId: string;
    driverId: string;
    reason: string;
    assignedDriverId?: string | null;
  }> => {
    try {
      const r = await api.post(`/rides/${id}/accept`, { driverId });
      return r.data;
    } catch (e: any) {
      if (e.response?.status === 409) return e.response.data;
      throw e;
    }
  },
  cancel: (id: string) => api.post(`/rides/${id}/cancel`).then((r) => r.data),
};
