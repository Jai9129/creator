# Creator Alliance — Full Stack Setup Guide

## Architecture
```
creator-alliance/
├── backend/           ← Node.js + Express API
│   ├── server.js      ← Entry point
│   ├── .env           ← Your Neon connection string goes here
│   ├── db/
│   │   ├── client.js  ← Neon connection
│   │   └── setup.js   ← Run once to create tables
│   ├── routes/
│   │   ├── admin.js   ← Login, stats, activity log
│   │   └── applications.js ← CRUD for applications
│   └── middleware/
│       └── auth.js    ← JWT verification
└── frontend/
    └── index.html     ← Complete frontend (open in browser)
```

---

## Step 1 — Configure your Neon database

Open `backend/.env` and paste your connection string:

```env
DATABASE_URL=postgresql://neondb_owner:YOUR_PASSWORD@ep-divine-flower-aedzt3sy-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
JWT_SECRET=change_this_to_a_random_string
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
PORT=3001
FRONTEND_URL=http://localhost:5500
```

---

## Step 2 — Install dependencies

```bash
cd backend
npm install
```

---

## Step 3 — Create database tables

```bash
npm run setup-db
```

This creates:
- `applications` table — all member applications
- `admins` table — admin accounts
- `activity_log` table — tracks all approve/reject actions
- Indexes for fast filtering
- Seeds default admin + 6 sample applications

---

## Step 4 — Start the API server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

Server runs at: http://localhost:3001
Health check:   http://localhost:3001/api/health

---

## Step 5 — Open the frontend

Open `frontend/index.html` in your browser.

> **Tip:** Use VS Code Live Server or `npx serve frontend` for best results.
> The frontend connects to `http://localhost:3001/api` by default.
> To change this, edit the `API_URL` constant at the top of the `<script>` tag.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/admin/login | — | Admin login → JWT token |
| GET | /api/admin/me | ✓ | Get current admin info |
| GET | /api/admin/stats | ✓ | Dashboard stats + charts data |
| GET | /api/admin/activity | ✓ | Recent admin actions |
| POST | /api/applications | — | Submit application (public) |
| GET | /api/applications | ✓ | List all with filters + pagination |
| GET | /api/applications/:id | ✓ | Get single application |
| PATCH | /api/applications/:id/status | ✓ | Approve / Reject |
| DELETE | /api/applications/:id | ✓ | Delete permanently |
| GET | /api/health | — | Server health check |

---

## Deploying to Production

### Backend → Render / Railway / Fly.io
1. Push `backend/` to GitHub
2. Set environment variables in your hosting dashboard
3. Build command: `npm install`
4. Start command: `npm start`

### Frontend → Netlify / Vercel / GitHub Pages
1. Edit `API_URL` in `frontend/index.html` to your deployed backend URL
2. Deploy the `frontend/` folder

---

## Admin Credentials
- Username: `admin`
- Password: `admin123`
> Change these in `.env` before deploying to production!
