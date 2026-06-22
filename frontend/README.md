# DriveDesk PMS — Frontend

React + Vite + Tailwind CSS admin dashboard for the car rental PMS.

See the root `README.md` for full project setup. Quick start once the backend is running:

```bash
npm install
cp .env.example .env      # set VITE_API_BASE_URL if your backend isn't on localhost:8000
npm run dev
```

Open http://localhost:5173

## Build for production

```bash
npm run build
```

Outputs static files to `dist/` — serve these with nginx, Caddy, or any static file host. Make sure
`VITE_API_BASE_URL` in `.env` points at your deployed backend before building, since Vite bakes env
vars into the build at build time.

## Project structure

```
src/
  api/          - one file per backend resource (axios calls)
  components/
    ui/         - generic building blocks (Button, Modal, SearchableSelect, etc.)
    layout/     - sidebar, topbar, app shell
    common/     - small shared widgets (StatCard, SessionExpiredModal)
  context/      - AuthContext (JWT/session), SettingsContext (app settings cache)
  pages/        - one folder per dashboard module (rentals, vehicles, owners, etc.)
  hooks/        - useDebounce
  utils/        - formatting helpers, className helper
```

## Notes

- The searchable dropdowns (`components/ui/SearchableSelect.jsx`) are used everywhere a person picks
  a customer, vehicle, or owner — type to filter live.
- Dynamic UPI QR codes are rendered via `components/ui/PaymentQRDisplay.jsx`, which re-fetches from
  the backend whenever the displayed amount changes.
- Session timeout (default 24h, configurable in Settings) is enforced client-side in `api/client.js`
  and will force a re-login automatically.
