# IIIT Bhubaneswar Mess Management System

A full-stack, production-grade centralized mess management web application built for **IIIT Bhubaneswar** (`@iiit-bh.ac.in`). It provides dedicated role-based portals for **Students** and **Mess Personnel**, enforcing strict Monday 00:00:00 IST weekly booking deadlines, a ₹476 minimum weekly purchase threshold, server-authoritative pricing, Razorpay test-mode payment verification, digital QR meal coupons, real-time coupon scanning & atomic redemption, menu CRUD, and CSV reporting.

---

## Key Features

### Student Portal
- **Restricted Institutional Onboarding**: Student registration strictly allows **only** `@iiit-bh.ac.in` email addresses (rejecting `@iiitbbs.ac.in`, Gmail, Outlook, Yahoo, and all other external domains), enforces strong password rules, hashes passwords with `bcrypt`, and automatically extracts the Student ID (e.g., `B123026@iiit-bh.ac.in` → `B123026`).
- **Interactive Weekly Meal Booking (₹476 Minimum)**: Select any combination of Breakfast (`₹20`), Lunch (`₹55`), and Dinner (`₹45`) across Monday–Sunday of the immediately upcoming week with live itemized totals, a live remaining-amount indicator showing how much is left to reach the **₹476** minimum weekly threshold, and a sticky summary panel where **Proceed to Payment** unlocks once the total is **≥ ₹476**.
- **Same-Day Instant Meal Booking**: Book today's individual meals with live IST countdown cutoffs (no ₹476 minimum required): Breakfast (`₹25`, before **6:00 AM IST**), Lunch (`₹65`, before **10:00 AM IST**), and Dinner (`₹55`, before **5:00 PM IST**). Prevents duplicate booking if today's meal is already booked via weekly or earlier same-day passes.
- **Strict Monday 12:00 AM IST Deadline Logic**: Enforced identically on both frontend and backend in `Asia/Kolkata` timezone. Prevents booking current, past, >1 week ahead, duplicate weekly bookings, or submissions past Sunday 23:59:59 IST.
- **Razorpay Test Mode & Payment Verification**: Authoritative backend order calculation, cryptographic HMAC-SHA256 signature verification, atomic booking confirmation & coupon issuance, failed payment logging, plus a strictly development-only payment simulator when Razorpay test credentials are not configured.
- **Digital QR Meal Coupons**: One unique QR pass per paid meal (`ACTIVE`, `REDEEMED`, `EXPIRED`) with downloadable/printable modal view.
- **Booking History, Payment Receipts & Profile**: Inspect individual meals inside any weekly booking, print official payment receipts, update profile info, and change passwords.

### Mess Personnel Portal
- **Pre-seeded Mess Admin Account**: Pre-generated via database seed (`mess@iiit-bh.ac.in` / `mess1234`), barred from public registration, with built-in password change support.
- **Live Analytics Dashboard**: Database-driven KPIs (total students, today's meal counts, upcoming bookings, total revenue) and interactive Recharts visualizations (daily meal distribution, weekly meal demand, Breakfast/Lunch/Dinner split, weekly revenue trend).
- **Daily Meal Overview**: Inspect confirmed & paid preparation counts for any selected date; click any meal count to view searchable, filterable, paginated student tables.
- **Weekly Menu Management**: Full CRUD for Breakfast, Lunch, and Dinner across a weekly calendar (Monday–Sunday) with Veg/Non-Veg indicators and instant reflection on the student portal.
- **QR & Manual Coupon Verification**: Live webcam QR scanner, QR image upload scanner, and manual coupon ID lookup. Validates coupon existence, paid booking ownership, today's IST date match, active serving meal type match, and blocks duplicate redemption via atomic database transactions.
- **Payment Reports & CSV Export**: Date-range summaries with downloadable CSV exports for meal bookings, payment transactions, and student summaries.

---

## Technology Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 18 (Vite), Tailwind CSS, React Router DOM, Axios, Lucide React, Recharts, `qrcode.react`, `html5-qrcode`, React Hot Toast |
| **Backend** | Node.js, Express.js, Prisma ORM, PostgreSQL, JWT (`jsonwebtoken`), `bcrypt`, Zod, Razorpay Node SDK |
| **Security** | Helmet, CORS, Express Rate Limit, Role Authorization Middleware, HMAC-SHA256 Payment Verification |

---

## Project Architecture

```text
IIIT_MESS/
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── components/         # Reusable UI, modals, QR scanner, countdown
│   │   ├── context/            # AuthContext (JWT session & role state)
│   │   ├── hooks/              # useCountdown hook
│   │   ├── layouts/            # AuthLayout, StudentLayout, MessLayout
│   │   ├── pages/              # Auth, Student Portal, and Mess Portal pages
│   │   ├── routes/             # ProtectedRoute & PublicOnlyRoute guards
│   │   ├── services/           # Axios API client & domain service modules
│   │   └── utils/              # IST date helpers, validators, currency formatters
├── server/                     # Node.js + Express + Prisma backend
│   ├── prisma/
│   │   ├── schema.prisma       # PostgreSQL relational schema
│   │   └── seed.js             # Idempotent seed for MESS account & sample menus
│   ├── src/
│   │   ├── config/             # Environment, PrismaClient, Razorpay config
│   │   ├── controllers/        # Express request handlers
│   │   ├── middleware/         # JWT auth, role guard, Zod validation, rate limits, error handler
│   │   ├── routes/             # Modular /api/auth, /api/student, /api/mess, /api/webhooks
│   │   ├── services/           # Business logic, IST deadlines, transactions, CSV/analytics
│   │   └── utils/              # IST calendar math, validators, CSV builder, errors
│   └── tests/                  # Automated business rules & end-to-end tests
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Database Schema Overview

Defined in [`server/prisma/schema.prisma`](server/prisma/schema.prisma):
- **`User`**: Stores students (`STUDENT`) and mess personnel (`MESS`), unique `email`, unique extracted `studentId`, and `bcrypt` password hash.
- **`Menu` & `MenuItem`**: Unique `(date, mealType)` menu entries with ordered food items (`name`, `category`, `isVeg`) and `updatedBy` tracking.
- **`WeeklyBooking`**: Unique `(studentId, weekStartDate)` weekly booking record with decimal-safe `totalAmount`, meal counts, `bookingStatus` (`PENDING`, `CONFIRMED`, `CANCELLED`), and `paymentStatus`.
- **`MealBooking`**: Individual selected meals unique per `(weeklyBookingId, mealDate, mealType)` with authoritative per-meal `price`.
- **`Payment`**: Payment attempt & verification records storing `provider` (`RAZORPAY` / `DEV_SIMULATOR`), unique `razorpayOrderId`, `razorpayPaymentId`, `transactionId`, signature, `status`, and `paidAt`.
- **`Coupon`**: Individual meal coupons (`ACTIVE`, `REDEEMED`, `EXPIRED`) with unique `couponCode`, `qrPayload`, `redeemedAt`, and `redeemedById` audit reference.

---

## Local Setup Instructions

### 1. Prerequisites
- **Node.js** v18+ (tested on Node v22)
- **PostgreSQL** v15+ (tested on PostgreSQL 17)

### 2. PostgreSQL Setup
Create a PostgreSQL database named `iiit_mess`:
```sql
CREATE DATABASE iiit_mess;
```

### 3. Environment Configuration
Copy the example environment file into `server/.env`:
```bash
cp .env.example server/.env
```
Edit `server/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/iiit_mess?schema=public"
JWT_SECRET="replace-with-a-strong-random-secret-key-at-least-32-chars"
JWT_EXPIRES_IN="7d"

# Optional for Razorpay Test Mode (leave blank in development to use Dev Payment Simulator)
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
RAZORPAY_WEBHOOK_SECRET=""

MESS_EMAIL="mess@iiit-bh.ac.in"
MESS_INITIAL_PASSWORD="mess1234"

PORT=5000
CLIENT_URL="http://localhost:5173"
NODE_ENV="development"
```

### 4. Install Dependencies
From the project root:
```bash
npm run install:all
```

### 5. Prisma Migration & Seeding
Run migrations and seed the pre-generated mess account and sample menus:
```bash
npm --prefix server run prisma:generate
npm --prefix server run prisma:migrate
npm --prefix server run prisma:seed
```

### 6. Run the Application
Start both backend and frontend concurrently from the root:
```bash
npm run dev
```
Or run them in separate terminals:
- **Backend API** (`http://localhost:5000`):
  ```bash
  npm --prefix server run dev
  ```
- **Frontend Client** (`http://localhost:5173`):
  ```bash
  npm --prefix client run dev
  ```

---

## Razorpay Test-Mode Configuration

Only your **Test API Key** and **Test Key Secret** from Razorpay's *Test API Key & Secret* modal are required (no webhook secret or frontend key env var is needed):

1. In the Razorpay Dashboard (**Test Mode**), copy your **Test API Key** (`rzp_test_...`) and **Test Key Secret**.
2. Paste them into `server/.env`:
   ```env
   RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxxxx"
   RAZORPAY_KEY_SECRET="your_test_key_secret"
   ```
   Leave `RAZORPAY_WEBHOOK_SECRET=""` empty — payment verification works completely via the backend's HMAC-SHA256 signature verification (`/api/student/payments/verify`) using only `RAZORPAY_KEY_SECRET`, and the backend sends the public `rzp_test_...` key to Razorpay Checkout automatically.
3. No real money moves in Test Mode: use Razorpay's test UPI (`success@razorpay`), test netbanking, or test cards inside the Razorpay Checkout popup.
4. When `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are omitted and `NODE_ENV=development`, the backend automatically falls back to the **Development Payment Simulator** so you can verify successful and failed payment flows locally. In `NODE_ENV=production`, simulated payments are strictly disabled.

---

## Default Mess Login Credentials

Seeded via `server/prisma/seed.js`:
- **Email**: `mess@iiit-bh.ac.in`
- **Initial Password**: `mess1234`

> You can change the mess password anytime from the Mess Admin Console via **Security / Change Password**. Subsequent runs of the seed script preserve any updated password.

---

## Important Business Rules

1. **Email & Role Enforcement**:
   - **Only** `@iiit-bh.ac.in` addresses may register or log in (`@iiitbbs.ac.in`, Gmail, Outlook, Yahoo, etc. are rejected).
   - Public registration only creates `STUDENT` accounts; `MESS` accounts cannot be registered via UI or API.
2. **Meal Pricing & Minimum Weekly Spend (Server-Authoritative)**:
   - **Weekly Advance Booking** (next Monday–Sunday, minimum **`₹476`** per weekly booking): Breakfast `₹20`, Lunch `₹55`, Dinner `₹45`.
   - **Same-Day Instant Booking** (today IST only, no minimum spend): Breakfast `₹25` (strictly before **06:00 AM IST**), Lunch `₹65` (strictly before **10:00 AM IST**), Dinner `₹55` (strictly before **05:00 PM IST**).
   - Duplicate meal bookings for the same date & meal (across weekly or same-day orders) are blocked.
   - All order totals are calculated and verified exclusively on the backend.
3. **Weekly Booking & Monday 12:00 AM IST Deadline**:
   - Mess weeks run **Monday through Sunday** in `Asia/Kolkata` (`IST`).
   - Students may book **only** the immediately upcoming Monday–Sunday week.
   - Booking closes at **Sunday 23:59:59 IST**. At **Monday 00:00:00 IST**, booking for that week closes and shifts to the following week.
   - Current week, past weeks, >1 week ahead, and duplicate weekly bookings are rejected.
4. **Coupon Verification & Atomic Redemption**:
   - Coupons are issued inside an atomic database transaction only after payment verification succeeds.
   - Redemption checks: valid coupon code, confirmed & paid booking, coupon `mealDate` equals today's IST date, coupon `mealType` matches the meal currently being served, and coupon is `ACTIVE`. Atomic conditional updates prevent double redemption.

---

## API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a student (`@iiit-bh.ac.in` only)
- `POST /api/auth/login` — Login for `STUDENT` or `MESS`
- `GET /api/auth/me` — Fetch authenticated user profile
- `PATCH /api/auth/profile` — Update display name
- `POST /api/auth/change-password` — Change current password
- `POST /api/auth/logout` — Logout endpoint

### Student Portal (`/api/student`, requires `STUDENT` role)
- `GET /api/student/dashboard` — Dashboard KPIs, booking window countdown, upcoming meals, today's menu
- `GET /api/student/menu/weekly?date=YYYY-MM-DD` — Weekly Mon–Sun menu
- `GET /api/student/menu/daily?date=YYYY-MM-DD` — Single day menu
- `GET /api/student/bookings/window` — Active upcoming week window & existing booking status
- `POST /api/student/bookings/create-order` — Create pending weekly booking & Razorpay/dev order
- `GET /api/student/bookings/same-day/window` — Today's same-day cutoffs, prices, already-booked state & today's menu
- `POST /api/student/bookings/same-day/create-order` — Create pending same-day meal order & Razorpay/dev order
- `GET /api/student/bookings` — List all weekly bookings
- `GET /api/student/bookings/:id` — Inspect booking & individual meals
- `GET /api/student/coupons` — List digital coupons (`ACTIVE`, `REDEEMED`, `EXPIRED`)
- `GET /api/student/payments` — Payment history & receipts
- `POST /api/student/payments/verify` — Verify payment signature, confirm booking & generate coupons
- `POST /api/student/payments/fail` — Record failed payment without generating coupons

### Mess Personnel Portal (`/api/mess`, requires `MESS` role)
- `GET /api/mess/dashboard` — KPIs and Recharts datasets from PostgreSQL
- `GET /api/mess/menu/weekly?date=YYYY-MM-DD` — Fetch weekly menu calendar
- `PUT /api/mess/menu` — Create or update a meal menu (`date`, `mealType`, `items`)
- `DELETE /api/mess/menu/:id` — Delete a published menu
- `GET /api/mess/bookings/daily?date=YYYY-MM-DD&mealType=...&search=...&page=1` — Daily meal counts & student list
- `GET /api/mess/bookings` — Filterable/paginated weekly student bookings
- `GET /api/mess/coupons/session` — Current IST date, suggested meal session & today's redemptions
- `POST /api/mess/coupons/verify` — Validate & atomically redeem a meal coupon
- `GET /api/mess/reports?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` — Range report data
- `GET /api/mess/reports/export?startDate=...&endDate=...&type=meals|payments|students` — Export CSV report
