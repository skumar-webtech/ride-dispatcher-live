# RideDispatch — Live Driver Allocation Demo

A real-time ops console for a ride-dispatch state machine. Watch a rider request a ride, drivers race to accept it, and the dispatcher observe the whole allocation round-by-round — all wired to a live NestJS + Postgres + Redis + Socket.IO backend.

Built as a portfolio piece to showcase **real-time UI**, **event-driven state**, and **production-grade frontend architecture** on a modern React stack.

![RideDispatch](https://img.shields.io/badge/React-19-61dafb) ![TanStack](https://img.shields.io/badge/TanStack_Start-1.x-ff4154) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6) ![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8) ![Socket.IO](https://img.shields.io/badge/Socket.IO-live-010101)

---

## ✨ Highlights

- **Three synchronized views** — Rider, Driver, Dispatcher — all reflecting the same live backend state.
- **Live allocation radar** — animated SVG radar with rotating sweep beam, expanding ripple waves, and per-driver pulse rings during `SEARCHING`.
- **Real-time state machine** — `REQUESTED → SEARCHING → ASSIGNED / TIMEOUT / CANCELLED`, streamed over Socket.IO with polling fallback.
- **Race-to-accept UI** — visual 15s countdown per driver offer, graceful "too slow" (HTTP 409) handling, and win/lose feedback.
- **Aurora background, gradient CTAs, glow pulses, animated status pills** — production-grade motion polish without pulling in a heavy animation library.
- **Fully typed** end-to-end with strict TypeScript, `axios` API layer, and a shared `SocketProvider`.

## 🖥️ The three modes

| Mode           | What it does                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------ |
| **Rider**      | Create a profile, pick a pickup location, request a ride, watch the radar light up.              |
| **Driver**     | Register drivers, toggle `AVAILABLE`/`OFFLINE`, simulate motion, receive live offers, accept.    |
| **Dispatcher** | Global ops table — every ride, every driver, expandable event timeline, one-click load test.     |

## 🧱 Tech stack

- **React 19 + TypeScript (strict)**
- **TanStack Start v1** — file-based routing, SSR-ready, edge-friendly
- **Tailwind CSS v4** — CSS-first theme, custom `@utility` animations
- **Socket.IO client** — live `ride:status` / `driver:offer` events
- **Axios** — REST layer against `VITE_API_BASE_URL`
- **Sonner** — toast notifications
- **Lucide** — icons

## 🚀 Getting started

```bash
# 1. install
bun install

# 2. point at your backend
echo 'VITE_API_BASE_URL=http://localhost:3000' > .env

# 3. run
bun run dev
```

Open http://localhost:8080 — the app redirects to `/rider` by default.

### Backend contract

This frontend does **not** ship a backend. It expects a REST + Socket.IO server exposing:

- `POST /rides`, `GET /rides/:id`, `GET /rides/:id/events`, `POST /rides/:id/cancel`
- `POST /drivers`, `GET /drivers/:id`, `PATCH /drivers/:id/status`, `PATCH /drivers/:id/location`
- `POST /drivers/:id/accept/:rideId` (returns 200 on win, 409 on "too slow")
- Socket.IO events: `ride:join`, `driver:register`, `ride:status`, `driver:offer`

## 🎨 Motion & polish

All animations are hand-authored CSS keyframes registered as Tailwind v4 `@utility` classes in `src/styles.css`:

- `animate-radar-sweep` — rotating radar beam
- `animate-ripple` — expanding search waves
- `animate-dot-ping` — status pill / socket indicator
- `animate-glow-pulse` — attention pulse on live offers
- `aurora-bg` — animated ambient background gradient
- `gradient-text`, `card-glow` — brand accents

Zero runtime animation-library cost.

## 📁 Project structure

```
src/
├── routes/               # TanStack file-based routes
│   ├── __root.tsx        # shell + providers + head metadata
│   ├── index.tsx         # redirect → /rider
│   ├── rider.tsx         # rider view
│   ├── driver.tsx        # driver view
│   └── dispatcher.tsx    # ops view
├── components/
│   ├── radar.tsx         # animated SVG radar
│   ├── status-pill.tsx   # animated status chip
│   ├── event-timeline.tsx
│   └── mode-switcher.tsx # top nav
├── lib/
│   ├── api.ts            # axios REST layer
│   ├── socket-context.tsx
│   ├── profiles.ts       # localStorage-backed profiles
│   └── types.ts
└── styles.css            # Tailwind v4 + custom motion utilities
```

## 🔒 Non-goals

No auth, no maps/geocoding, no payments, no ratings. The frontend is a thin, expressive client for the backend's allocation logic — **all timing, retries, and concurrency live server-side**.

## 📸 Portfolio notes

This project is intentionally scoped to demonstrate:

1. **Real-time UX** under partial network conditions (Socket.IO + polling fallback).
2. **Design-system discipline** — semantic tokens, no hardcoded colors, dark-first.
3. **Legible motion** — every animation communicates state, never decorative for its own sake.
4. **Type safety** across a routed, provider-driven React app.

---

Made with ☕ and a lot of `console.log`.
