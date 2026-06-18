# Household Manager — Setup Guide

## Step 1 — Run the Supabase SQL Schema

1. Open your Supabase project → **SQL Editor** → **New Query**
2. Open the file `supabase_schema.sql` (in the root of this project)
3. Paste the entire contents and click **Run**

You should now see these tables in **Table Editor**:

- `members`
- `tasks`
- `task_logs`
- `expenses`
- `shopping_items`
- `events`

---

## Step 2 — Get your Supabase Service Role Key

1. In your Supabase project go to **Settings → API**
2. Under **Project API keys** find the **service_role** key  
   ⚠️ This is different from the anon key — it bypasses RLS and must stay secret
3. Copy it

---

## Step 3 — Configure the Backend .env

Open `backend/.env` and fill in your values:

```
PORT=3001
SUPABASE_URL=https://jrpxbqepjfcajrkkhtqp.supabase.co
SUPABASE_SERVICE_KEY=paste-your-service-role-key-here
```

The `SUPABASE_URL` is already set. You only need to paste the **service_role key**.

---

## Step 4 — Install and Run

### Backend

```bash
cd household-manager/backend
npm install
npm run dev
```

You should see:

```
🏠 Household Manager API → http://localhost:3001
   Supabase URL: https://jrpxbqepjfcajrkkhtqp.supabase.co
```

### Frontend

```bash
cd household-manager/frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Step 5 — First Login

1. Open the app — it auto-detects no admin exists and shows **Sign Up**
2. Enter your name, email, password → you become the **Admin**
3. Go to **Members** → **Add Member** to create member accounts (set their password)
4. Members log in at the same URL and see their personal task portal

---

## How It Works

| Role   | What they see                                                                       |
| ------ | ----------------------------------------------------------------------------------- |
| Admin  | Full dashboard: tasks, budget, shopping, events, reports, member progress           |
| Member | My Tasks (tick daily tasks), My Reports (charts), My Profile (change password/name) |

### Key Rules

- Only **one** admin can self-register (the very first signup)
- After that, **only the admin** can create new accounts via the Members page
- **Only the admin** can change roles (admin ↔ member)
- Members can update their own name, email, avatar colour and password
- All data persists in **Supabase** — no data loss on server restart

---

## Project Structure

```
household-manager/
├── backend/
│   ├── db/
│   │   └── supabase.js        ← Supabase client (service role)
│   ├── routes/
│   │   ├── auth.js            ← signup, login, profile update
│   │   ├── members.js         ← admin CRUD for members
│   │   ├── tasks.js           ← task management
│   │   ├── taskLogs.js        ← member task completions + charts
│   │   ├── expenses.js        ← income/expense tracker
│   │   ├── shopping.js        ← shopping list
│   │   └── events.js          ← household events/calendar
│   ├── .env                   ← ⚠️ never commit this
│   ├── .env.example
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── member/        ← member portal (tasks, reports, profile)
│   │   │   └── ...            ← admin pages
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   └── api/api.js
│   └── .env                   ← frontend Supabase anon key (public)
└── supabase_schema.sql        ← run this in Supabase SQL Editor
```
