# Smart Flow HQ – Backend API

Production-ready NestJS backend for salons/clinics/service desks. Provides appointment scheduling, smart queueing, staff/service management, email-based OTP verification, and operational dashboards. Built with TypeScript, Prisma, and PostgreSQL for reliable, scalable delivery.

---

## Features
- Authentication with JWT and email OTP verification (login blocked until verified)
- Profile endpoints (`/profile/me`, `update-me`, `delete-me`) with cookie clearing on account removal
- Appointments with staff assignment, status tracking (scheduled, completed, cancelled, no-show)
- Waiting queue with next-available-slot calculation and activity logging
- Staff and service catalogs plus staff load summaries
- Dashboard summaries and recent activities
- Templated transactional emails (OTP, welcome) via SMTP
- Prisma ORM with PostgreSQL and validated DTOs

---

## Tech Stack

| Layer        | Technology                                      |
|--------------|-------------------------------------------------|
| Runtime      | Node.js, TypeScript                             |
| Framework    | NestJS                                          |
| Database ORM | Prisma (PostgreSQL)                             |
| Auth         | JWT, cookie support, OTP email verification     |
| Validation   | class-validator, class-transformer              |
| Email        | Nodemailer (SMTP)                               |
| Docs         | Swagger (OpenAPI)                               |
| Tooling      | ESLint, Prettier, Jest                          |

---

## 📁 Project Structure

```text
prisma/
├─ schema/               # Prisma schemas (users, staff, services, appointments, queue)
├─ migrations/           # Database migrations

src/
├─ main.ts               # Application bootstrap
├─ app.module.ts         # Root application module

├─ common/               # Shared decorators, guards, filters, interceptors, enums
├─ config/               # Application & mail configuration

├─ modules/
│  ├─ auth/              # Authentication & OTP flows
│  ├─ profile/           # Current user profile CRUD
│  ├─ staff/             # Staff catalog & management
│  ├─ service/           # Service catalog
│  ├─ appointment/       # Appointment management & details
│  ├─ queue/             # Waiting queue & staff assignments
│  └─ dashboard/         # Dashboard summary & activity feeds

├─ prisma/               # Prisma module & service
├─ utils/                # Utilities (Crypto, JWT, Mail, OTP, Response helpers)

test/
└─ e2e/                  # End-to-End testing setup

## Getting Started

### 1) Install dependencies
```bash
npm install

```
---
### 2) Environment variables
Create a `.env` file in the project root:

```
DATABASE_URL=postgresql://user:password@host:5432/dbname

JWT_SECRET=supersecret
JWT_EXPIRES_IN=7d
NODE_ENV=development

SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-pass
SMTP_FROM="Smart Appointment <no-reply@yourdomain.com>"
```

### 3) Database setup
```bash
npx prisma generate
npx prisma migrate deploy   # or migrate dev in local development
```

### 4) Run the server
```bash
npm run start:dev   # watch mode
# or
npm run start       # production config after build
```

---

## Scripts
- `npm run start:dev` – Start in watch mode
- `npm run start` – Start compiled app
- `npm run build` – Compile TypeScript
- `npm run lint` – Lint with ESLint
- `npm run test` / `test:e2e` – Unit/E2E tests

---

## Core Modules & Endpoints

### Auth
- `POST /auth/register` – Register, send verification OTP, `isVerified=false`
- `POST /auth/verify-otp` – Verify OTP, mark verified, return JWT
- `POST /auth/login` – Login only if verified; sets cookie in controller
- `POST /auth/resend-otp` – Resend current OTP type
- `POST /auth/forgot-password` / `reset-password` – Password reset with OTP

### Profile
- `GET /profile/me` – Current user profile
- `PATCH /profile/update-me` – Update profile (validated DTO)
- `DELETE /profile/delete-me` – Delete profile and clear `access_token` cookie

### Staff & Service
- `GET /staff` + load summaries
- `GET /service` catalog operations

### Appointments & Queue
- Create/update appointments with staff assignment and status updates (including no-show)
- Retrieve detailed appointment views with staff/service data
- Queue management with next-available-slot suggestion and assignment logging

### Dashboard
- Summary metrics and recent activity feed

---

## Email & OTP
- 6-digit OTP, expires in 10 minutes
- Verification required before login
- Branded HTML templates for OTP and welcome emails
- SMTP configurable via environment

---

## Testing & Quality
- DTO validation across endpoints
- ESLint + Prettier configuration
- Jest test setup (`test/`, `test/jest-e2e.json`)

---

## Deployment Notes
- Requires PostgreSQL and SMTP credentials
- Run migrations before start: `npx prisma migrate deploy`
- Use `npm run start:prod` after `npm run build` in production environments

---

## License
UNLICENSED (see package.json)