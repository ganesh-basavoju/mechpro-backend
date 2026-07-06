# 13 — Environment & Configuration (Backend)

## `.env` (keys present)

```
PORT=
MONGO_URI=            # ⚠️ present but IGNORED — index.js hard-codes the URI
JWT_SECRET=
NODE_ENV=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

Loaded via `dotenv.config()` at the top of `index.js`.

## Configuration reality vs intent

| Setting | Intended source | Actual source | Issue |
|---|---|---|---|
| Mongo connection | `process.env.MONGO_URI` | **hard-coded literal in `index.js`** | env var unused; secret in source |
| JWT secret | `process.env.JWT_SECRET` | env, **fallback `'your_jwt_secret'`** | insecure fallback |
| Port | `process.env.PORT` | env, fallback `3000` | ok |
| Twilio | `process.env.TWILIO_*` | env (lazy read) | ok |
| Firebase | `config/serviceAccountkey.json` | committed file | secret in repo |
| `NODE_ENV` | env | present but not really branched on | minor |

## Files that hold config
- `.env` — runtime secrets (partially used).
- `config/serviceAccountkey.json` — Firebase admin credentials (committed).
- `index.js` — hard-coded Mongo URI + open CORS + route mounting.

## Recommended `.env` (future, to actually be used)
```
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=<long-random>
JWT_EXPIRES_IN=7d
NODE_ENV=production
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
GOOGLE_APPLICATION_CREDENTIALS=/secrets/serviceAccount.json
CORS_ORIGIN=https://app.mechanicpro.in
```
Then change `index.js` to `mongoose.connect(process.env.MONGO_URI)` and load Firebase creds from a path/secret.

## Scripts (`package.json`)
- `npm start` → `node index.js`
- `npm run dev` → `nodemon index.js`

No lint, no test, no build step (plain Node/CommonJS).

## Confidence: High.
