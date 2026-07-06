# 11 — Third-Party Integrations

| Integration | Purpose | Where | Credentials |
|---|---|---|---|
| **MongoDB Atlas** | Primary datastore | `index.js` (`mongoose.connect`) | 🔴 URI **hard-coded in source** (also present in `.env` `MONGO_URI` but unused) |
| **Firebase Admin (FCM)** | Server→client push notifications | `config/firebaseAdmin.js`, `services/fcmService.js` | 🔴 `config/serviceAccountkey.json` (private key **committed**) |
| **Twilio** | SMS OTP for password reset | `services/smsService.js` | `.env`: `TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER` |
| **Socket.IO** | Realtime in-app notifications | `socket/socket.js` | n/a (open CORS) |
| **PDFKit** | Invoice PDF generation | `billController.js` | n/a |

> The frontend additionally integrates **imgBB** (image hosting) and **Firebase FCM web SDK** — those are client-side; see the frontend docs. The backend only stores the resulting image URLs.

## Firebase Admin

- `config/firebaseAdmin.js` initializes `admin.initializeApp({ credential: cert(serviceAccount) })` from the local JSON key and exports `admin`.
- `fcmService.sendToUser` sends messages and auto-prunes invalid tokens per role.
- **Project:** `mechanicpro-2fec0` (matches the frontend `firebase.js`).

## Twilio

- Lazy-initialized on first SMS to avoid boot failures when env is missing.
- Phone normalization assumes **India (+91)**; strips leading zeros; adds `+91` when no country code.
- Only OTP is currently wired (`sendOTPSMS`); `sendCustomSMS` is available but unused. Setup notes exist in the repo-root `TWILIO_SETUP_GUIDE.md`.

## Socket.IO

- Initialized in `index.js` via `initSocket(server)`; server shares the HTTP server with Express.
- Maintains three in-memory Maps keyed by entity id → socket id. **State is per-process and in-memory** → will not work across multiple instances / serverless without a shared adapter (e.g. Redis). See `14_Deployment.md`.

## MongoDB

- Mongoose **5** (legacy) + `mongodb` **3** driver used directly only for `new ObjectId()` in `bookingprocess.js`.
- No connection pooling config beyond defaults; `useNewUrlParser/useUnifiedTopology` set.

## Failure modes
- If Firebase key or Twilio creds are missing/invalid, sends **fail soft** (logged, not thrown) — the primary request still succeeds. Good resilience, but silent.
- If Mongo is unreachable, `index.js` logs the error but **still starts the server** (connection is fire-and-forget) → routes will error at query time.

## Confidence: High.
