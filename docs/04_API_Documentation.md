# 04 — API Documentation

Base URL: `https://mechpro-backend.vercel.app`. All routes prefixed `/api`. Auth column: **none** = public, **User/Mechanic/Admin** = requires that JWT.

## Mount map (`index.js`)

```
GET  /                          → health string
POST /api/fcm-token             → store FCM token (none)         [app-level]
/api/adminauth  → adminAuth.js        (none)
/api/mechanic   → mechanicRoutes.js + billRoutes.js
/api/auth       → authRoutes.js       (none)
/api/user       → userprofile.js      (User)
/api/public     → public.js           (none)
/api/carousel   → carouselRoutes.js   (mixed)
--- app.use(adminAuthmiddleware) : everything below is ADMIN-ONLY ---
/api/admin/user       → userRoutes.js
/api/admin            → superAdmin.js
/api/admin/booking    → bookings.js
/api/admin/spareParts → sparePartsRoutes.js
/api/admin/services   → services.js
/api/admin/analytics  → analytics.js
```

## Auth (`/api/auth`) — none

| Method | Path | Body | Controller |
|---|---|---|---|
| POST | `/api/auth/register` | fullname, phone, password | `AuthControllers.registerUser` |
| POST | `/api/auth/login` | phone, password | `AuthControllers.loginUser` |
| POST | `/api/auth/forgot-password` | phone, type? | `requestPasswordReset` (Twilio OTP) |
| POST | `/api/auth/verify-otp` | phone, otp, type? | `verifyOTP` |
| POST | `/api/auth/reset-password` | phone, otp, newPassword, type? | `resetPassword` |

## Admin auth (`/api/adminauth`) — none

| POST | `/api/adminauth/login` | email, password | `AuthAdmin.login` |
| POST | `/api/adminauth/register` | email, password | `AuthAdmin.register` |

## Mechanic (`/api/mechanic`) — Mechanic (except login/register)

| Method | Path | Auth | Controller |
|---|---|---|---|
| POST | `/register` | none | `MechanicControllers.register` |
| POST | `/login` | none | `MechanicControllers.login` |
| GET/PUT | `/profile` | Mechanic | get/update profile |
| GET | `/bookings` | Mechanic | list (page,limit,status,search) |
| GET | `/bookings/:id` | Mechanic | details |
| PUT | `/bookings/:id/status` | Mechanic | update status (+socket+FCM to user) |
| GET/POST | `/spare-parts` | Mechanic | list / create (+FCM to admins) |
| PUT | `/spare-parts/:id/status` | Mechanic | update status |
| GET | `/dashboard-stats` | Mechanic | counts |
| POST | `/inspection` | Mechanic | create report (+notify user) |
| GET | `/inspection/:bookingId` | Mechanic | get report |
| PUT | `/shop-status` | Mechanic | toggle isActive |

### Bills (`billRoutes.js`, mounted under `/api/mechanic`) — Mechanic
| POST | `/generate-bill` | mechanic owns booking |
| GET | `/bill/:billId` | |
| GET | `/bill/booking/:bookingId` | |
| GET | `/bills` | all bills for mechanic |
| GET | `/bill/:billId/pdf` | PDFKit invoice stream |
| PUT | `/bill/:billId/status` | pending/paid/cancelled |

> Note: `billRoutes.js` applies `authmechanic` via `router.use`. The frontend customer downloads bills through these mechanic routes (`Profile.jsx`) — meaning a **customer must send a mechanic token** or the call 401s. Potential mismatch — flag for verification (`15_Tech_Debt.md`).

## User profile (`/api/user`) — User (every route uses `auth`)

| GET/PUT | `/profile` |
| GET/POST | `/cars` ; PUT/DELETE `/cars/:id` |
| GET | `/bookings` ; GET `/bookings/:id` ; POST `/bookings/:id/cancel` |
| GET | `/mechanic/:mechanicId` (services + user cars for booking) |
| POST | `/booking-create` |
| GET | `/user-bookings` (duplicate route registered twice) |
| GET | `/get-services` |
| GET | `/service-history` |
| GET | `/inspection/:bookingId` |
| POST | `/inspection/:reportId/decision` |

## Public (`/api/public`) — none
| GET | `/public/find` | mechanic search (filters + geo + pagination) |
| GET | `/public/:id` | mechanic details |

## Carousel (`/api/carousel`)
| GET | `/public` | none | active slides |
| POST | `/` | Admin | add slide |
| GET | `/all` | Admin | all slides |
| PUT | `/:id` | Admin | update order/active |
| DELETE | `/:id` | Admin | delete |

## Admin (all **Admin**-gated by the global middleware)

### `/api/admin` (`superAdmin.js`)
`POST /login`(*), `POST /register`(*), `POST /addmechanic`, `POST /update-booking`, `POST /update-sparepart-status`, `POST /add-customer`, `POST /add-service`, `GET /get-all-mechanics`, `GET /get-all-bookings`, `GET /get-all-spareparts`, `GET /get-customers`, `GET /get-services`, `GET /get-notifications`, `PUT /updatemechanic`, `DELETE /deletemechanic/:id`, plus booking helpers (`/get-booking/:id`, `/update-booking-status`, `/reassign-mechanic`, `/handle-booking-action`).
(*) `SuperAdmin.loginAdmin/registerAdmin` are **phone-based and broken** (SuperAdmin model has no `phone`/`name`); real admin login is `/api/adminauth/login`. And these are behind the admin gate anyway — unreachable without a token.

### `/api/admin/user` (`userRoutes.js`)
`POST /register`, `POST /login`, `GET /profile`, `GET /get-all-customers`, `GET /get-customer/:id`, `POST /create-customer`, `PUT /update-customer-status`, `DELETE /delete-customer/:id`.
> These are admin-gated by position even though some are conceptually "user" endpoints (register/login here are effectively unusable behind the admin gate). The **real** user auth is `/api/auth`.

### `/api/admin/booking` (`bookings.js`)
`GET /get-all-bookings`, `GET /get-booking/:id`, `PUT /handle-booking-action`, `PUT /update-booking-status`, `PUT /reassign-mechanic`, `POST /create-booking`, `DELETE /delete-booking/:id`.

### `/api/admin/spareParts` (`sparePartsRoutes.js`)
`GET /get-all-spare-parts`, `GET /get-spare-part/:id`, `PUT /update-spare-part-status`, `POST /create-spare-part-request`, `DELETE /delete-spare-part/:id`.

### `/api/admin/services` (`services.js`)
`GET /get-all-services`, `GET /get-service/:id`, `POST /create-service`, `PUT /update-service/:id`, `DELETE /delete-service/:id`, `PATCH /toggle-service-status/:id`.

### `/api/admin/analytics` (`analytics.js`)
`GET /dashboard-analytics`, `GET /export-analytics` (stub).
> Frontend calls `GET /api/admin/dashboard-analytics` (mounted at `/api/admin` too? — actually via `superAdmin`?). Verify: the admin dashboard uses `/admin/dashboard-analytics`; analytics router is mounted at `/api/admin/analytics/dashboard-analytics`. **Path mismatch risk — flag** (`15_Tech_Debt.md`).

## Response-shape inconsistency
Some endpoints return `{ success, data }`, others `{ message }`, others raw arrays/documents. Frontend adapts per-call. Documented per controller in `10_Services.md`.

## Confidence: High for routes; Medium for a few analytics/bill path-mismatch calls (need runtime confirmation).
