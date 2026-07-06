# 03 — Backend Architecture

## Runtime topology

```mermaid
flowchart TB
  subgraph Express App (index.js)
    MW[cors + express.json + urlencoded]
    PUB[Public/auth routes]
    ADMINGATE[adminAuthmiddleware GLOBAL gate]
    ADMROUTES[/api/admin/* routes/]
  end
  Client -->|HTTP| MW --> PUB
  MW --> ADMINGATE --> ADMROUTES
  Express -->|http.createServer| IO[Socket.IO server]
  Client <-->|websocket| IO
  Express --> Mongo[(MongoDB Atlas via Mongoose)]
  Controllers --> FCM[Firebase Admin / FCM]
  Controllers --> Twilio[Twilio SMS]
  Bill --> PDFKit[PDFKit stream]
```

## Boot sequence (`index.js`)

1. `dotenv.config()`.
2. **`mongoose.connect(<hardcoded Atlas URI>)`** — ⚠️ the connection string is hard-coded in `index.js`, **not** read from `process.env.MONGO_URI` (which also exists in `.env`). See `12_Security.md` / `13_Environment.md`.
3. Create Express app; apply `cors()` (open, all origins), `express.json()`, `express.urlencoded()`.
4. `http.createServer(app)` then `initSocket(server)`.
5. Register a couple of app-level endpoints (`GET /`, `POST /api/fcm-token`).
6. Mount **unprotected** route groups.
7. `app.use(adminAuthmiddleware)` — a **global middleware gate**; every route mounted *after* this line requires a valid admin JWT.
8. Mount the `/api/admin/*` groups (now all admin-gated).
9. `server.listen(PORT)`.

> The ordering in step 7 is the single most important architectural fact: admin protection is achieved by **middleware position**, not per-route guards. Anything mounted before it is public/self-guarded; anything after is admin-only.

## Layering

```
routes/*  ──►  contollers/* (business logic + DB + side effects)  ──►  models/* (Mongoose)
                       │
                       ├──► services/fcmService (push)
                       ├──► services/smsService (SMS)
                       └──► socket/socket (realtime emit helpers)
```

- **No dedicated service/repository layer.** Controllers query models directly and also orchestrate notifications. This couples transport, business rules, and persistence.
- **Side-effect services** (`services/`) are thin wrappers for FCM and Twilio only.
- **Realtime** is a module singleton: `socket/socket.js` keeps `onlineUsers/onlineMechanics/onlineAdmins` Maps (socketId by entity id) and exposes `sendNotificationTo{User,Mechanic,AllMechanics,AllAdmins}` used by controllers.

## Auth architecture (three schemes)

| Identity | Middleware | Token payload | `req.*` set |
|---|---|---|---|
| User | `authMiddleware.js` | `{ role, id }` (from `utils.generateToken`) | `req.user = { id, phone }` (after DB lookup) |
| Mechanic | `authmechanic.js` | `{ mechanic: { id } }` (signed in `MechanicControllers`) | `req.mechanic = decoded.mechanic` |
| Admin | `authadmin.js` | `{ role, id }` | none set; just verifies `SuperAdmin` exists |

Note the **payload-shape divergence**: user/admin use `{role,id}`; mechanic uses `{mechanic:{id}}`. This is why there are two different token generators. See `06_Authentication.md`.

## Error handling

- No centralized error middleware. Each controller wraps logic in `try/catch` and returns `res.status(500)`. Response shapes are **inconsistent** (`{message}` vs `{success,message,error}` vs bare strings). See `09_Middleware.md`.

## Confidence: High.
