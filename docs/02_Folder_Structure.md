# 02 — Backend Folder Structure

```
mechpro-backend/
├── index.js                  # App entry: Express, Mongo connect, Socket.IO, route mounting
├── package.json              # type: commonjs; start/dev scripts
├── .env                      # PORT, MONGO_URI, JWT_SECRET, NODE_ENV, TWILIO_*
├── .gitignore                # ignores node_modules + /.env  (NOTE: does NOT ignore serviceAccountkey.json)
│
├── config/
│   ├── firebaseAdmin.js      # Firebase Admin init from serviceAccountkey.json
│   └── serviceAccountkey.json # 🔴 Firebase service-account PRIVATE KEY (committed)
│
├── contollers/               # ⚠️ misspelled folder — the REAL controllers (17 files)
│   ├── AuthControllers.js         # user register/login + OTP password reset
│   ├── AuthAdmin.js               # admin (SuperAdmin) email/password login+register
│   ├── UserControllers.js         # user + admin-side customer CRUD
│   ├── userprofilecontrollers.js  # user profile, cars, bookings, cancel
│   ├── MechanicControllers.js     # mechanic auth, profile, bookings, spare parts, stats
│   ├── BookingControllers.js      # admin/global booking actions
│   ├── bookingprocess.js          # user-side booking creation + mechanic services
│   ├── inspectionController.js    # inspection report create/get/decision
│   ├── billController.js          # bill CRUD + PDF invoice (PDFKit)
│   ├── serviceHistoryController.js# per-car service history
│   ├── servicesController.js      # services catalog CRUD
│   ├── sparePartsController.js    # admin-side spare parts
│   ├── SuperAdmin.js              # admin aggregate ops (mechanics/customers/services...)
│   ├── AnalyticsControllers.js    # dashboard analytics + export stub
│   ├── AdminNotifications.js      # SuperAdmin notifications CRUD (⚠️ not wired to a route)
│   └── PublicControllers.js       # public mechanic search + details
│
├── controllers/              # correctly-spelled folder — ONE file
│   └── carouselController.js      # homepage carousel slides
│
├── middleware/
│   ├── authMiddleware.js     # user JWT (exports a bare function; also referenced as {protect})
│   ├── authadmin.js          # admin JWT ({ adminAuthmiddleware })
│   └── authmechanic.js       # mechanic JWT (req.mechanic = decoded.mechanic)
│
├── models/                   # Mongoose schemas
│   ├── User.js  Mechanic.js  SuperAdmin.js
│   ├── Bookings.js  Bill.js  InspectionReport.js
│   ├── Services.js  SpareParts.js  CarouselSlide.js
│
├── routes/
│   ├── authRoutes.js  adminAuth.js  userRoutes.js  userprofile.js
│   ├── mechanicRoutes.js  bookings.js  billRoutes.js
│   ├── services.js  sparePartsRoutes.js  analytics.js
│   ├── carouselRoutes.js  public.js  superAdmin.js
│   └── admin/index.js        # ⚠️ alternate aggregate router — NOT imported by index.js (dead)
│
├── services/
│   ├── fcmService.js         # FCM send wrapper (removes dead tokens)
│   └── smsService.js         # Twilio OTP + custom SMS (lazy init)
│
├── socket/
│   └── socket.js             # Socket.IO init + per-role online maps + emit helpers
│
└── utils/
    └── index.js              # generateToken(role, id) — jwt.sign, no expiry
```

## Key structural notes

- **`contollers/` vs `controllers/`**: the misspelled folder is canonical (17 files). Only `carouselController` lives in the correct-spelled folder. Both are required by `index.js`. Preserve the spelling when adding files to existing wiring, or fix everywhere at once.
- **`routes/admin/index.js`** builds an aggregate `/api/admin` router but is **never imported** in `index.js` → dead code.
- **`AdminNotifications.js`** controller exists but no route references it → dead/unused.
- **`serviceAccountkey.json`** is committed and **not** gitignored → security risk (see `12_Security.md`).

## Confidence: High.
