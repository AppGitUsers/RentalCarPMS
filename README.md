# DriveDesk PMS — Car Rental Property Management System

A production-ready, single-tenant admin dashboard for a car rental business that takes vehicles
from car owners, rents them out to customers, and keeps a percentage of the rental revenue.

**Stack:** Python / Django / Django REST Framework / PostgreSQL (backend) · React / Vite / Tailwind
CSS (frontend). Single admin login (superuser-only), JWT auth with a 24-hour session timeout.

---

## What's inside

- **Dashboard** — fleet status counts, today's activity, this month's finance snapshot, document
  expiry alerts.
- **Car Rentals** — 3-step booking wizard (customer → vehicle/trip → payment), active/upcoming/closed
  filtering, pickup & return flow with automatic pro-rated billing, late fee and extra-km charges,
  invoice + rental agreement PDF generation, dynamic UPI QR for customer payment.
- **Owners & Cars** — fleet view with categorized counts (available / rented / maintenance) and
  vehicle cards, car owner CRUD with UPI payout details, single-rental and collective payout flows
  with dynamic QR, full rental history per vehicle/owner.
- **Customers** — legal ID details, photo + ID proof uploads, rental history.
- **Staff** — team directory, daily attendance with shift in/out times, monthly payroll computed
  from hours worked vs. expected hours, adjustment + Pay button.
- **Finance** — month-by-month income/expense/savings breakdown, 12-month trend chart, custom
  income/expense entries, Excel export (rental income sheet + expense sheet).
- **Settings** — single screen controlling owner-share %, GST %, late fee, extra-km charge, free-km
  allowance, grace period, invoice branding/terms, company UPI ID. Everything here is read live by
  the rest of the app — there are no hardcoded business rules in the code.

---

## Project layout

```
car-rental-pms/
├── backend/         Django REST API
│   ├── accounts/     admin auth (JWT, 24h session)
│   ├── settings_app/ singleton ApplicationSettings (all business-rule constants)
│   ├── owners/       car owners + payout QR/history
│   ├── vehicles/     fleet CRUD, gallery images, status summary
│   ├── customers/    renter profiles + ID documents
│   ├── rentals/      booking lifecycle, pricing engine, payments, owner payouts
│   ├── staff/        staff, attendance, payroll
│   ├── finance/      custom ledger entries, dashboard aggregation, Excel export
│   └── core/         shared utilities (QR generation, PDF generation)
└── frontend/        React + Vite + Tailwind admin UI
```

---

## Prerequisites

- Python 3.11+
- PostgreSQL 14+ (or use SQLite for a quick local trial — see below)
- Node.js 18+

---

## Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
```

Edit `.env`:

```ini
SECRET_KEY=replace-with-a-long-random-string
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

USE_SQLITE=False        # set True to skip Postgres setup for a quick local trial
DB_NAME=car_rental_pms
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

CORS_ALLOWED_ORIGINS=http://localhost:5173

INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=choose-a-strong-password
INITIAL_ADMIN_EMAIL=admin@example.com
```

If using PostgreSQL, create the database first:

```bash
createdb car_rental_pms
# or: psql -U postgres -c "CREATE DATABASE car_rental_pms;"
```

Then:

```bash
python manage.py migrate
python manage.py bootstrap_admin     # creates the one admin login from your .env values
python manage.py runserver           # http://localhost:8000
```

To manage data directly at any time, Django admin is available at `/admin/` using the same
admin login.

### Media files

Uploaded photos (vehicle images, customer ID proofs, staff photos, company logo) are stored under
`backend/media/` in development. For production, point `MEDIA_ROOT`/`MEDIA_URL` at S3-compatible
storage or a mounted volume — see Django's file storage docs.

---

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env` if your backend isn't on `localhost:8000`:

```ini
VITE_API_BASE_URL=http://localhost:8000/api
```

```bash
npm run dev          # http://localhost:5173
```

Log in with the admin credentials you set in the backend `.env`.

---

## First-time configuration checklist

Once both servers are running and you've logged in, go to **Settings** and fill in:

1. **Company name, address, phone, logo** — shown on every invoice and rental agreement.
2. **Company UPI ID** — required before the customer-payment QR will render (otherwise the QR
   screen will show a clear "no UPI configured" message instead of a blank QR).
3. **Default owner share %** — the default cut paid to car owners; override per-owner or per-vehicle
   any time.
4. **GST %** — defaults to 0; set if applicable.
5. **Late fee / hour, grace period, extra-km charge, free-km allowance** — these drive the automatic
   charge calculation when a rental is closed.

Then add your **Car Owners** (with their UPI ID, for the payout QR), their **Vehicles**, and you're
ready to take your first booking.

---

## How the pricing engine works

Every booking snapshots the current Settings values at creation time (daily rate, GST %, owner
share %, late fee, extra-km charge, free-km allowance) onto the `Rental` row itself. This means
changing Settings later never retroactively alters historical invoices — only new bookings pick up
new rates.

**On close:**

- **Base amount** = pro-rated by hour: `(hours actually used / 24) × daily_rate`, capped at the
  full price of the originally booked number of days (so an early return never costs *more* than
  the original booking would have).
- **Late fee** only applies if the return is after `scheduled_end + grace_period`, charged per hour
  (rounded up) past that deadline.
- **Extra-km charge** applies to km driven beyond the free-km allowance for the booking.
- **GST** is applied on top of (base + late fee + extra-km + damage charge).
- If the total already-paid amount exceeds the final total (e.g. an early return after prepayment),
  the UI clearly shows **"Refund Due to Customer"** rather than a confusing negative balance.

---

## Owner payouts

- **Single payout** — pay the owner's share for one specific closed rental.
- **Collective payout** — select multiple unpaid closed rentals and pay them in one lump sum.
- Both generate a dynamic UPI QR (using the owner's UPI ID) for the admin to scan and pay manually,
  then click "Mark as Paid" to record it — there is no payment gateway integration, by design.
- Owner share % resolves in this order: per-vehicle override → per-owner default → global Settings
  default.

---

## Deployment notes (production)

This ships as a Django dev server + Vite dev server for local development. For production:

- **Backend:** run behind Gunicorn/uWSGI + nginx, set `DEBUG=False`, set a real `SECRET_KEY`, set
  `ALLOWED_HOSTS` to your real domain, and point `CORS_ALLOWED_ORIGINS` at your frontend's deployed
  URL. Use a managed Postgres instance.
- **Frontend:** `npm run build` produces static files in `frontend/dist/` — serve these via nginx,
  Caddy, or any static host, with `VITE_API_BASE_URL` baked in at build time to point at your
  deployed backend.
- **Media storage:** switch to S3-compatible object storage (`django-storages`) instead of local
  disk for uploaded photos, so they survive container restarts/redeploys.
- **HTTPS:** required in production for the JWT auth flow and any real UPI deep-linking to behave
  correctly on mobile devices scanning the QR.

---

## Tech stack summary

| Layer | Technology |
|---|---|
| Backend framework | Django 6 + Django REST Framework |
| Auth | djangorestframework-simplejwt (24h access/refresh tokens) |
| Database | PostgreSQL (SQLite supported for local trials) |
| PDF generation | ReportLab (DejaVu Sans embedded for ₹ symbol support) |
| QR generation | `qrcode` library, UPI deep-link format, generated on-the-fly (no static images) |
| Excel export | openpyxl |
| Frontend framework | React 19 + Vite |
| Styling | Tailwind CSS (custom navy/white/amber theme) |
| Charts | Recharts |
| Icons | lucide-react |
