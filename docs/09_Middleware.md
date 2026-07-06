# 09 — Middleware

## Global middleware (`index.js`, in order)

1. `cors()` — **all origins allowed**, no credentials config.
2. `express.json()` — JSON body parsing.
3. `express.urlencoded({ extended: true })` — form parsing.
4. *(routes mounted)*
5. **`app.use(adminAuthmiddleware)`** — the pivotal global gate; every route registered after this line is admin-only. This is authorization-by-position (see `07`).

There is **no**: request logger, helmet, rate limiter, compression, centralized error handler, or 404 handler.

## Auth middlewares (`middleware/`)

### `authMiddleware.js` (user)
- Exports a **bare async function** (`module.exports = async function(req,res,next)`).
- Extracts `Bearer` token, `jwt.verify` with `JWT_SECRET || 'your_jwt_secret'`, `User.findById(decoded.id).select('-password')`.
- Sets `req.user = { id, phone }`. 401 on missing/invalid.
- Logs the token + all headers to console (**verbose; leaks tokens to logs**).
- Imported as `auth` in `userprofile.js` (correct) and as `{ protect }` in `userRoutes.js` (**wrong — undefined**, but unused because those routes are admin-gated).

### `authadmin.js` (admin)
- `{ adminAuthmiddleware }`. Verifies token, `SuperAdmin.findById(decoded.id)`.
- ⚠️ On "not found" it sends 401 but **does not `return`**, then calls `next()` anyway — logic bug.

### `authmechanic.js` (mechanic)
- Bare function. Verifies token, sets `req.mechanic = decoded.mechanic` (`{ id }`). Does **not** hit the DB (no existence check), so a mechanic deleted after token issuance still passes until a controller query fails.

## Middleware applied at router level
- `mechanicRoutes.js`: `router.use(authmechanic)` after the public login/register.
- `billRoutes.js`: `router.use(authmechanic)` for all bill endpoints.
- `userprofile.js`: `auth` applied **per-route**.
- `carouselRoutes.js`: `adminAuthmiddleware` applied **per-route** for write ops; public GET is open.

## Cross-cutting side-effect "middleware" (not Express middleware, but pervasive)
Controllers call three helper layers inline:
- `socket/socket.js` emit helpers (realtime).
- `services/fcmService.js` (push).
- `services/smsService.js` (SMS OTP).

## Response-shape inconsistency (a middleware-shaped gap)
Because there's no response/error envelope middleware, shapes vary:
- `{ success:true, data }` (services, analytics, bookings admin controllers)
- `{ message }` / `{ message, error }` (most)
- bare arrays or documents (SuperAdmin getters, mechanic profile)
- bare strings (`res.status(200).json('User created')`)

A future `responseHelper`/error middleware would standardize this. See `16_Extensibility.md`.

## Confidence: High.
