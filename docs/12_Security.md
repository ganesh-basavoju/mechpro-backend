# 12 — Security

> Documentation only. No code changed. Severity-ordered.

## 🔴 Critical — committed secrets

1. **MongoDB Atlas credentials hard-coded** in `index.js`:
   `mongodb+srv://admin:mechpro123@cluster0.wbp76kx.mongodb.net/...`. Anyone with repo access has full DB read/write. **Rotate immediately**, move to `MONGO_URI` env (which already exists but is ignored).
2. **Firebase service-account private key committed** — `config/serviceAccountkey.json` is present and **not** in `.gitignore`. This grants full Firebase project admin. Rotate the key, gitignore the file, load from a secret manager.
3. **`.env` present in repo tree** with `JWT_SECRET`, `TWILIO_*`. `.gitignore` lists `/.env`, so it may be ignored going forward, but if it was ever committed the secrets are in history. Rotate `JWT_SECRET` + Twilio token.

## 🔴 High — auth/session

4. **Non-expiring JWTs** for user & admin (`generateToken` has no `expiresIn`). Stolen tokens are valid forever; no revocation/blacklist.
5. **`JWT_SECRET` fallback literal** `'your_jwt_secret'` in all three middlewares + generators. If env is unset in an environment, tokens are forgeable.
6. **`isBlocked` not enforced at login** — blocked users retain full access.
7. **`authadmin` missing `return`** after 401 → possible bypass / "headers already sent".
8. **Tokens logged to console** (`authMiddleware.js` logs token + headers) — leaks credentials into server logs.

## 🟠 Medium

9. **CORS fully open** (`cors()` + socket `origin:"*"`) — any site can call the API with a user's token (combined with `localStorage` token storage on the frontend, raises XSS/CSRF-ish exposure).
10. **No rate limiting** — login, OTP request, and OTP verify are brute-forceable. OTP is 6 digits with a 10-min window and no attempt cap → guessable.
11. **No input validation library** (no Joi/Zod/express-validator). Controllers trust `req.body`; type coercion is ad-hoc (`parseFloat`, `parseInt`). Mass-assignment risk in `updateService` (`updateData = req.body` passed straight to `findByIdAndUpdate`).
12. **No helmet / security headers**, no HTTPS enforcement at app layer (relies on host).
13. **Authorization by phone match** (bookings) — weak object ownership; spoofable if an attacker controls `customer.phone`.
14. **Bill numbering by `countDocuments`** — race condition can produce duplicate `billNumber` (unique index would then error). Not a security hole per se but a data-integrity risk.

## 🟡 Low

15. Verbose `console.log` of PII (phone, request bodies) across controllers.
16. `serviceAccountkey.json` path is relative and required at import — deployment must include it (couples secret to build artifact).

## Recommended hardening order (future)
Rotate all committed secrets → move config to env/secret manager → add `expiresIn` + refresh tokens → enforce `isBlocked` + role claims → add rate limiting on auth/OTP → add helmet + scoped CORS → add validation (Zod) + a response/error envelope → remove sensitive logging.

## Confidence: High.
