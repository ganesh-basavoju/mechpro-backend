# 14 — Deployment

## Current target

- The frontend hard-codes `https://mechpro-backend.vercel.app`, so the backend is deployed on **Vercel**.
- There is **no `vercel.json`, no `Procfile`, no `Dockerfile`, no CI config** in `mechpro-backend/`. Deployment config (if any) lives in the Vercel project settings, not the repo.
- Start command: `node index.js`; server listens on `process.env.PORT || 3000`.

## ⚠️ Serverless mismatch (important)

This is a **stateful, long-running** Express server:
- **Socket.IO** holds long-lived websocket connections and keeps **in-memory Maps** of online users/mechanics/admins (`socket/socket.js`).
- Vercel (and most serverless platforms) run **ephemeral, per-request function instances** with no shared memory and no persistent sockets.

Consequences to verify at runtime:
1. Websocket connections may fail to persist or may not upgrade at all → realtime notifications unreliable.
2. Even if sockets connect, the online-user Maps are **per-instance**; a notification emitted from the instance handling an HTTP request won't find a socket registered on a different instance → dropped notifications.
3. `mongoose.connect` on cold start adds latency; no connection reuse guard.

**Recommendation (future):** host the realtime backend on a **persistent server** (Render, Railway, Fly.io, a VM/container) and add a **Socket.IO Redis adapter** for multi-instance fan-out. Keep stateless REST on serverless if desired, but separate the socket server.

## Data & secrets at deploy time
- `config/serviceAccountkey.json` must ship with the deployment (it's `require`d at import). On Vercel this means it's in the bundle — another reason it's committed (and a security problem — see `12_Security.md`).
- Mongo URI is baked into `index.js` (works anywhere, but insecure).
- Twilio + JWT secrets come from Vercel env vars.

## Health check
- `GET /` returns `"MechanicPro API is running..."`.

## Missing operational concerns
- No structured logging, metrics, or error tracking (Sentry etc.).
- No graceful shutdown handling.
- No DB migration/seed tooling.
- No automated tests / deploy gates.

## Confidence: Medium — the exact hosting config isn't in the repo; the serverless-mismatch analysis is inferred from the deploy URL + code (verify against the actual Vercel project or a possible alternate host).
