# AeroBook — Black & Gold Airline Booking System

A structured React + Express + MongoDB full-stack demo with email/password and Google OAuth login/signup, flight search, seat selection, reservations, PDF tickets and an admin dashboard.

> **Demo only:** Flight records are admin-managed sample data. Confirmations are not airline-issued tickets, and no payment or live airline inventory integration is included.

## Project structure

```text
aerobook/
├── frontend/
│   ├── src/components/       # Shared layout
│   ├── src/context/          # Authentication state
│   ├── src/lib/              # API client
│   ├── src/pages/            # All screens
│   ├── src/styles.css        # Responsive black-and-gold theme
│   ├── .env.example
│   └── package.json
├── backend/
│   ├── src/config/          # Google Passport strategy
│   ├── src/middleware/      # JWT and admin guards
│   ├── src/models/          # MongoDB schemas
│   ├── src/routes/          # REST API endpoints
│   ├── src/utils/           # Auth helpers
│   ├── src/server.js
│   ├── scripts/seed.js      # Demo flights and admin user
│   ├── .env.example
│   └── package.json
├── package.json
└── README.md
```

## Setup (Windows PowerShell)

1. Install Node.js 20+ and create a MongoDB Atlas cluster with a database user and network access. Copy your Atlas connection string.
2. In the `backend` folder, copy `.env.example` to `.env`. Fill `MONGODB_URI`, `JWT_SECRET`, `SESSION_SECRET`, `FRONTEND_URL`, and `BACKEND_URL`. Replace the sample admin credentials.
3. In the `frontend` folder, copy `.env.example` to `.env` (default API URL is already `http://localhost:5000/api`).
4. From the project root:

```powershell
npm install
npm run install:all
npm run dev
```

5. In another terminal, seed example flights and your admin account:

```powershell
cd backend
npm run seed
```

6. Visit **http://localhost:5173**. Backend health check: **http://localhost:5000/api/health**.

## Google OAuth setup — works on BOTH Login and Signup

1. Open Google Cloud Console → APIs & Services → Credentials.
2. Configure OAuth consent screen (External for personal testing); add yourself as a test user if in Testing mode.
3. Create an OAuth Client ID of type **Web application**.
4. Authorized JavaScript origin: `http://localhost:5173` (optional for this server redirect flow).
5. **Authorized redirect URI:** `http://localhost:5000/api/auth/google/callback`.
6. Put the Client ID and Client Secret into `backend/.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
7. Restart the backend. The **Continue with Google** button on both `/login` and `/signup` uses the same OAuth flow. A new Google user is created; an existing matching email is linked to that Google account. The backend sets a signed HTTP-only auth cookie and redirects to the frontend.

**Production note:** Use HTTPS and configure `GOOGLE_CALLBACK_URL`, `FRONTEND_URL`, `BACKEND_URL` for your deployed domains. Cross-site cookies require `SameSite=None; Secure` and browser support. For best reliability host frontend/backend under the same site. Do not commit `.env` files.

## User experience

- Homepage: airplane photography, one-way search, trip filters and features.
- Flights: searchable, sortable airline listings.
- Seat selection: available/occupied/selected seats with conflict protection.
- Booking: logged-in user confirms one passenger, one seat, one flight.
- My Bookings: view reservations, cancel and download PDF e-ticket.
- Admin: flight CRUD (create/delete in UI, update via API), booking stats and recent bookings.

## Main API endpoints

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/signup` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/google` | Public |
| GET | `/api/auth/google/callback` | Google OAuth |
| GET | `/api/auth/me` | Signed in |
| POST | `/api/auth/logout` | Public |
| GET | `/api/flights?from=LHE&to=DXB` | Public |
| GET | `/api/flights/:id` | Public |
| POST/PATCH/DELETE | `/api/flights` / `/api/flights/:id` | Admin |
| POST/GET | `/api/bookings` | Signed in |
| PATCH | `/api/bookings/:id/cancel` | Booking owner |
| GET | `/api/bookings/:id/ticket` | Booking owner |
| GET | `/api/admin/stats` | Admin |
| GET | `/api/admin/bookings` | Admin |
| GET | `/api/admin/users` | Admin |

## Security and functional limitations

- Passwords are hashed with bcrypt; sessions use HTTP-only JWT cookies; admin routes check DB roles.
- A MongoDB partial unique index prevents two **confirmed** bookings from claiming the same seat. Cancellation releases the seat.
- This starter implements **single-passenger, one-way bookings**, not multi-city/round-trip checkout, temporary seat holds, actual payment, email delivery, real flight inventory, or airline ticket issuance.
- Seeded sample prices, schedules, airlines, and booking records are fictional demonstration data.
- The Google account linking behavior uses a matching email; for production, require verified Google email and consider explicit account-linking confirmation.
- Before real-world production use, add CSRF protection for cookie-authenticated mutations, email verification, monitoring, booking transactions/seat holds, robust validation, refresh-token/session revocation, comprehensive automated tests, and provider integrations.


## Black & Gold visual edition

This edition preserves the selected AeroBook luxury palette across the homepage, search, seats, account pages, and admin dashboard. The airplane hero image is bundled locally in `frontend/public/images/airplane-sunset.webp` (no external image URL required).

The frontend and backend source is separated into named modules, and CSS is expanded into readable, maintainable rules. No generated minified build files or secrets are included.

### Integrations still to configure

- MongoDB Atlas URI in `backend/.env`
- JWT/session secrets and Google OAuth credentials
- SMTP settings for email notifications
- Amadeus Flight Offers API (future integration; **not connected yet**)
- Multi-passenger reservations (future backend upgrade; current demo booking supports one passenger)

**Important:** Flight data is currently seeded/admin-managed demo data, not live airline inventory. A demo PDF is not an issued airline ticket. Do not present mockup numbers as real transactions.

### Install and run

```powershell
npm install
npm run install:all
Copy-Item backend/.env.example backend/.env
# Fill backend/.env with your own secrets and MongoDB URI
npm run dev
```
