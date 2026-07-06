# 01 — Backend Project Overview

> Reverse-engineered from `mechpro-backend/`. All claims are code-derived; uncertainties are flagged.

## What it is

`mechpro-backend` is the REST + realtime API for **MechanicPro**. It is a single **Express 5** application (CommonJS) backed by **MongoDB via Mongoose 5**, with **Socket.IO** for realtime, **Firebase Admin (FCM)** for push, **Twilio** for SMS OTP, and **PDFKit** for invoice generation.

- Entry point: `index.js` (`npm start` → `node index.js`; `npm run dev` → `nodemon`).
- Author: `onlyusmedia.in` (from `package.json`).
- Deployed at `https://mechpro-backend.vercel.app` (the frontend hard-codes this).

## Responsibilities

| Domain | Summary |
|---|---|
| Auth | Three identities: **User** (customer), **Mechanic**, **SuperAdmin**. JWT bearer tokens. |
| Bookings | Full service-booking lifecycle with a 9-state status machine. |
| Inspections | Mechanic creates inspection report; customer approves/rejects. |
| Billing | Line-item bills + branded PDF invoices (PDFKit). |
| Spare parts | Mechanic requests parts; admin approves; FCM both ways. |
| Services catalog | Admin CRUD of service offerings (grouped by category for booking). |
| Mechanic discovery | Public geo search (Haversine distance). |
| Analytics | Admin dashboard aggregates (revenue, distributions, recent activity). |
| Carousel | Homepage marketing slides. |
| Notifications | Socket.IO (in-app) + FCM (push) + Twilio (SMS OTP). |

## Tech stack (`package.json`)

- **express@^5.1.0** (note: Express **5**, not 4 — routing/error semantics differ).
- **mongoose@^5.13.15** (note: Mongoose **5**, legacy) + `mongodb@^3.7.3` driver (used directly in one place for `ObjectId`).
- **socket.io@^4.8.1**.
- **firebase-admin@^13.5.0** (FCM push).
- **twilio@^5.10.7** (SMS OTP).
- **jsonwebtoken@^9**, **bcrypt@^6** + **bcryptjs@^3** (both installed; **bcryptjs** is the one actually used).
- **pdfkit@^0.17** (invoice PDFs).
- **cors**, **dotenv**, **nodemon**.

## Architectural style

- **Classic layered MVC-ish**: `routes → controllers → mongoose models`. There is **no service/repository layer** (except `services/` for FCM + SMS side-effects). Business logic lives in controllers.
- **Two controller folders**: `contollers/` (misspelled — holds ~17 controllers, the real ones) and `controllers/` (correctly spelled — holds only `carouselController.js`). Both are wired in `index.js`. See `02_Folder_Structure.md`.
- **Socket helpers** are a module singleton (`socket/socket.js`) imported by controllers to push events.

## Confidence

| Area | Confidence |
|---|---|
| Stack, structure, responsibilities | High |
| Deployment specifics (Vercel serverless + Socket.IO) | Medium — see `14_Deployment.md` |
