# 10 — Services & Controllers (Business Logic)

The app has **two meanings of "service"**: (a) the `services/` side-effect modules, and (b) the controllers that hold business logic. Both are documented here.

## `services/` — side-effect modules

### `fcmService.js` (Firebase Cloud Messaging)
- Singleton class instance. `sendToUser(fcmToken, message, type, userId)`:
  - Builds an FCM payload (`notification{title,body}` + `data{type,bookingId,click_action}`).
  - `admin.messaging().send(payload)`.
  - On `messaging/registration-token-not-registered`, **unsets** the stale token on the matching model (`User`/`Mechanic`/`SuperAdmin` by `type`). Good hygiene.
- Depends on `config/firebaseAdmin.js` (initialized from committed `serviceAccountkey.json`).

### `smsService.js` (Twilio)
- **Lazy init** — reads `TWILIO_*` env at first send; logs config presence.
- `sendOTPSMS(phone, otp)` — normalizes phone to `+91…` (assumes India), sends templated OTP; returns `{success,...}`; never throws to caller.
- `sendCustomSMS(phone, message)` — generic sender (used for arbitrary messages; currently only OTP path is wired).

## Controllers — responsibilities & key logic

| Controller | Owns | Notable logic |
|---|---|---|
| `AuthControllers` | user auth + OTP reset | bcrypt; 6-digit OTP w/ 10-min expiry; Twilio |
| `AuthAdmin` | admin (SuperAdmin) auth | email/password; the working admin login |
| `UserControllers` | user auth (dup) + admin customer CRUD | `getAllCustomers` computes per-customer stats (**N+1 queries**) |
| `userprofilecontrollers` | user profile/cars/bookings | bookings matched by `customer.phone`; cancel notifies mechanic (socket+FCM) |
| `MechanicControllers` | mechanic auth/profile/bookings/spareparts/stats | resource-scoped by `req.mechanic.id`; blocks status change on completed |
| `bookingprocess` | user booking creation + mechanic service catalog | groups services by category w/ icon map; multi-doc updates; heavy notification fan-out |
| `BookingControllers` | admin/global booking actions | `handleBookingAction` maps accept/decline/start/complete/cancel → status |
| `inspectionController` | inspection report lifecycle | one report per booking (unique); computes `totalEstimatedCost`; drives status `inspection_completed → user_approved/rejected` |
| `billController` | bills + PDF | ownership check; duplicate-bill guard; **PDFKit branded invoice** streamed to response |
| `serviceHistoryController` | per-car history | ⚠️ fetches ALL bookings then **filters by license plate** in memory |
| `servicesController` | services catalog CRUD | `{success,data}` envelope; toggle status |
| `sparePartsController` | admin spare-parts | populate mechanic; FCM to mechanic on status change |
| `SuperAdmin` | admin aggregate ops | mechanic/customer/service CRUD; `GetNotifications` hardcodes `admin@gmail.com`; phone-based admin login is dead |
| `AnalyticsControllers` | dashboard metrics | revenue from **completed** bookings; 6-month series; `$group` aggregations; export is a stub |
| `AdminNotifications` | SuperAdmin notifications | **not wired to any route** (dead) |
| `PublicControllers` | mechanic discovery | Haversine distance; avg rating from reviews |
| `carouselController` | homepage slides | stores imgBB URL only (upload is frontend) |

## Notification fan-out pattern (recurring)
Most state-changing controllers do the same 3-step side effect:
1. `sendNotificationToX(id, data)` — Socket.IO (in-app, live).
2. `fcmService.sendToUser(token, msg, type, id)` — browser push.
3. (sometimes) push an entry onto an embedded `notifications`/`Notifications` array.

## Invoice generation (`billController.generateBillPDF`)
Builds a fully-styled A4 invoice with PDFKit: orange header/footer bands, logo, invoice number, itemized table, totals, company footer (**A1 Car Service, Vijayawada**, phones, web). Streamed directly to the HTTP response as `application/pdf`.

## Confidence: High.
