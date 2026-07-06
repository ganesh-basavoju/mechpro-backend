# 16 — Extensibility (Backend)

How to extend the API safely given its conventions.

## Add a new endpoint (existing entity)
1. Add the handler to the relevant controller in **`contollers/`** (mind the spelling of the existing folder).
2. Add the route in the matching `routes/*.js`.
3. Decide the auth surface and **mount position** in `index.js`:
   - Public/self-guarded → mount **before** `app.use(adminAuthmiddleware)`, add your own `authMiddleware`/`authmechanic` if needed.
   - Admin-only → mount **after** the global admin gate (or add `adminAuthmiddleware` per-route).
4. Return the surrounding file's response shape (match neighbors).

## Add a new model
1. Create `models/X.js` (Mongoose 5 schema; follow existing style).
2. Add `timestamps: true`.
3. Prefer **real ObjectId refs** over phone/plate matching (learn from the Booking↔User debt).
4. Add needed indexes explicitly.

## Add a realtime event
- Emit from a controller via `socket/socket.js` helpers (`sendNotificationToUser/Mechanic/AllMechanics/AllAdmins`).
- The client must have called `register_user|register_mechanic|register_admin` first.
- Remember: online maps are in-memory/per-process — for multi-instance you'll need a Redis adapter.

## Add a push notification
- Use `fcmService.sendToUser(fcmToken, { title, body, type, bookingId }, role, id)`.
- Ensure the recipient model stores a `fcmToken` (User/Mechanic/SuperAdmin already do).

## Add an SMS
- Use `smsService.sendCustomSMS(phone, message)` (already implemented, currently unused).

## Natural next features (partially scaffolded)
- **Payments** — `Bill.advanceReceived` + `status` already model partial/paid; wire a real gateway (Razorpay/PhonePe API) and update bill status on webhook. Frontend currently shows a static QR.
- **Reviews** — `Mechanic.reviews[]` is read (avg rating) but has **no write endpoint**; add `POST /api/user/mechanic/:id/review` (guarded, verify a completed booking exists).
- **Analytics export** — `exportAnalytics` is a stub returning JSON + a fake URL; implement real Excel/PDF (PDFKit already available) generation.
- **Admin notifications API** — `AdminNotifications.js` controller exists but is unrouted; wire it to `/api/admin/notifications` to expose the already-written CRUD.

## Refactors to do first (to make extension safe)
1. **Externalize secrets** (env/secret manager) — unblocks safe deploys.
2. **Add a validation layer** (Zod/Joi) + a **response/error envelope** middleware — standardize contracts.
3. **Add `userId` ref to Booking** (+ backfill migration) — removes phone/plate matching fragility.
4. **Consolidate the two controller folders** and delete dead code.
5. **Separate the realtime server** from serverless (or move whole backend to a persistent host).

## Confidence: High for patterns; Medium for "scaffolded features" (inferred from partial code).
