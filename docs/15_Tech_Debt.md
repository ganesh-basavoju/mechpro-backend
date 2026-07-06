# 15 — Technical Debt & Risks (Backend)

> Documentation only. Severity-ordered. Security items are detailed in `12_Security.md`.

## 🔴 High

1. **Committed secrets** — Mongo URI (in `index.js`), Firebase service-account key (`config/serviceAccountkey.json`), `.env`. Rotate + externalize. (See `12`.)
2. **Serverless ↔ stateful-socket mismatch** — in-memory online-user Maps + websockets on Vercel → unreliable realtime. (See `14`.)
3. **Non-expiring JWTs + insecure secret fallback + no `isBlocked` enforcement.** (See `06`/`12`.)
4. **Confirmed broken endpoint:** `SuperAdminDashboard.jsx` calls `GET /admin/dashboard-analytics`, but analytics is mounted at `/api/admin/analytics/dashboard-analytics`. That specific call **404s**; the analytics *tab* works because `AnalyticsDashboard.jsx` uses the correct path. Dead call in the parent.
5. **Fragile data modeling** — `Booking` has no `userId` ref; user↔booking is resolved by **`customer.phone` matching**, and service history by **license-plate matching**. Renames/typos silently break history & notifications.

## 🟠 Medium

6. **Two controller folders** — `contollers/` (misspelled, canonical, 17 files) + `controllers/` (1 file). Confusing; risk of importing from the wrong one.
7. **Dead code** — `routes/admin/index.js` (never imported), `contollers/AdminNotifications.js` (no route), `SuperAdmin.loginAdmin/registerAdmin` (phone-based, model has no phone, double-gated), `services/smsService.sendCustomSMS` (unused). Duplicate route registration (`/user-bookings` twice in `userprofile.js`).
8. **N+1 queries** — `UserControllers.getAllCustomers` runs 3 queries per customer; `serviceHistoryController` loads all bookings then filters in memory; `PublicControllers.findMechanics` computes distance over the whole collection (no geo index).
9. **No validation layer** — controllers trust `req.body`; mass-assignment in `updateService`.
10. **Inconsistent response shapes** — `{success,data}` vs `{message}` vs bare docs vs bare strings. Forces per-call frontend adapters.
11. **`billNumber` race condition** — count-based numbering under concurrency can collide with the unique index.
12. **Two bcrypt libs** (`bcrypt` + `bcryptjs`) — only `bcryptjs` used; `bcrypt` (native) is dead weight.
13. **Mongoose 5 / mongodb 3** — legacy majors; upgrade path (Mongoose 8) is nontrivial (query/callback API changes).
14. **`bill` routes require mechanic token but are used by the customer UI** — likely a real bug for customers downloading bills. Verify.

## 🟡 Low

15. **Pervasive `console.log`** of PII and tokens; no real logger.
16. **Booking status validation drift** — `BookingControllers.updateBookingStatus` validates against a **shorter** status list than the model enum (missing `vehicle_received`, `inspection_completed`, `user_approved`, `user_rejected`), so admin can't set those via that endpoint.
17. **`AddCustomer` stores plaintext password** (`SuperAdmin.AddCustomer` does not hash — unlike every other create path). Real bug.
18. **`GetNotifications` hardcodes `admin@gmail.com`** — assumes a single admin identity.
19. **Fire-and-forget Mongo connect** — server starts even if DB is down.
20. **No error-handling / 404 middleware.**

## Suggested remediation order
Rotate secrets → fix `AddCustomer` plaintext password → fix analytics 404 call + bill-auth mismatch → add validation + response envelope → add `expiresIn`/`isBlocked`/role checks + rate limiting → add `userId` to Booking (migration) + geo index → consolidate controller folders + delete dead code → move realtime off serverless.

## Confidence: High (each item cross-checked against source).
