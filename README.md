<div align="center">

# ⚔️ ROK Dashboard

### Rise of Kingdoms — Kingdom Management Dashboard

Track governor statistics, analyze kingdom trends, manage KvK wars, and calculate DKP — all in one place.

[![Built with React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com/)
[![Deploy with Vercel](https://img.shields.io/badge/Vercel-Deployed-000?logo=vercel&logoColor=white)](https://vercel.com/)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Deploy Your Own](#deploy-your-own)
- [Environment Variables](#environment-variables)
- [CSV Upload Format](#csv-upload-format)
- [DKP System](#dkp-system)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**ROK Dashboard** is a self-hostable web app built for **Rise of Kingdoms** kingdom leaders and alliance officers. Upload CSV snapshots of governor data and instantly get:

- Sortable rankings across 13+ metrics
- Kingdom-wide trend charts over time
- Side-by-side snapshot comparisons
- Per-war KvK contribution tracking with DKP scoring
- Admin tools for user management, announcements, and settings

It's designed so any kingdom can fork, deploy, and run their own instance.

---

## Features

### For All Members

| Page | Description |
|------|-------------|
| **Dashboard** | Kingdom overview — total power, kills, deaths, announcements |
| **Rankings** | Searchable, sortable governor table with CSV export |
| **Charts** | Trend lines for power, KP, T4/T5 kills, deaths, resources over time |
| **Snapshots** | Compare any two snapshots to see per-governor stat deltas |
| **KvK / DKP** | War-by-war tracking, DKP leaderboard, power-tier qualification |

### Admin-Only

| Feature | Description |
|---------|-------------|
| **CSV Upload** | Upload governor snapshots with column validation and error reporting |
| **User Management** | Create user accounts with avatars and role assignment |
| **Kingdom Settings** | Configure kingdom name/number |
| **DKP Weights** | Adjust T4, T5, and death point multipliers |
| **KvK Thresholds** | Define power-tier graduation requirements |
| **Announcements** | Post kingdom-wide messages shown on the dashboard |

### Quality of Life

- 🌗 Dark / Light theme toggle
- 📱 Responsive mobile-first design
- ⚡ Lazy-loaded routes with code splitting
- 🔐 Role-based access control (admin / user)
- 📊 Real-time data validation on upload

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React 18 + TypeScript |
| **Build** | Vite (SWC) |
| **UI** | Shadcn-ui + Radix UI + Tailwind CSS |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod |
| **Data Fetching** | TanStack React Query |
| **Backend** | Supabase (PostgreSQL, Auth, Edge Functions, Storage) |
| **Deployment** | Vercel |
| **Testing** | Vitest |
| **Package Manager** | Bun |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or [Node.js](https://nodejs.org/) v18+
- A [Supabase](https://supabase.com/) project (free tier works)
- (Optional) [Supabase CLI](https://supabase.com/docs/guides/cli) for running migrations

### 1. Clone the repository

```bash
git clone https://github.com/AbdUlrahman097/ROK-dashboard.git
cd ROK-dashboard
```

### 2. Install dependencies

```bash
bun install
# or: npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com/dashboard)
2. Copy your **Project URL** and **anon (public) key** from Settings → API
3. Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

4. Run the database migrations to set up tables, RLS policies, and functions:

```bash
# Using Supabase CLI (link to your project first)
supabase link --project-ref YOUR_PROJECT_ID
supabase db push
```

Or manually run the SQL files from `supabase/migrations/` in order via the Supabase SQL Editor.

5. Deploy the Edge Function for user creation:

```bash
supabase functions deploy create-user
```

### 4. Start the dev server

```bash
bun run dev
# or: npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — the first registered user can claim admin privileges automatically.

---

## Deploy Your Own

### Option A: Deploy to Vercel (Recommended)

1. Fork this repository
2. Go to [vercel.com/new](https://vercel.com/new) and import your fork
3. Add the environment variables (see below)
4. Deploy — Vercel auto-detects Vite and builds it

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAbdUlrahman097%2FROK-dashboard&env=VITE_SUPABASE_URL,VITE_SUPABASE_PUBLISHABLE_KEY&envDescription=Supabase%20project%20credentials&project-name=rok-dashboard&repository-name=rok-dashboard)

### Option B: Deploy to Netlify

1. Fork and connect to [Netlify](https://app.netlify.com/)
2. Build command: `bun run build`
3. Publish directory: `dist`
4. Add a `_redirects` file in `public/`:
   ```
   /*    /index.html   200
   ```
5. Add environment variables and deploy

### Option C: Self-Host (Any Static Host)

```bash
bun run build
```

Upload the `dist/` folder to any static hosting provider (Cloudflare Pages, GitHub Pages, Firebase Hosting, etc.). Since this is a SPA, configure a catch-all redirect to `index.html`.

### Supabase Setup (Required for All Options)

No matter where you host the frontend, you need a Supabase backend:

1. Create a Supabase project
2. Run all migrations from `supabase/migrations/` in order
3. Deploy the `create-user` edge function
4. Set up a storage bucket named `avatars` (public access)
5. Set the environment variables pointing to your Supabase project

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL (`https://xxxx.supabase.co`) | ✅ |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public API key | ✅ |

> These are **public** keys safe for client-side use. The Supabase service role key is only needed on the Supabase Edge Function side (configured automatically).

---

## CSV Upload Format

Upload governor data as CSV with the following columns. The system normalizes common header variations automatically.

| Column | Aliases | Type |
|--------|---------|------|
| `governor_id` | `id` | number |
| `governor_name` | `name` | string |
| `alliance` | — | string |
| `power` | — | number |
| `t1_kills` – `t5_kills` | `t1`–`t5`, `t4` → `t4_kills` | number |
| `total_kills` | — | number |
| `t45_kills` | — | number |
| `killpoints` | `kp` | number |
| `deaths` | `deads` | number |
| `ranged` | — | number |
| `resource_gathered` | `rss_gathered` | number |
| `rss_assistance` | — | number |
| `helps` | — | number |
| `city_hall_level` | — | number |

---

## DKP System

DKP (Dragon Kill Points) measures each governor's contribution during KvK wars.

### Default Weights

| Stat | Points per Unit |
|------|----------------|
| T4 Kills gained | **5** |
| T5 Kills gained | **10** |
| Deaths gained | **40** (deducted) |

### Formula

```
DKP = (T4 kills gained × weight) + (T5 kills gained × weight) − (Deaths gained × weight)
```

Admins can adjust all weights from the KvK page. Power-tier thresholds let you set minimum requirements per power bracket for reward qualification.

---

## Project Structure

```
├── public/                  # Static assets
├── src/
│   ├── components/          # Reusable UI components (Shadcn-ui based)
│   ├── data/                # Static data files
│   ├── hooks/               # React hooks (auth, data fetching, settings)
│   ├── integrations/        # Supabase client & generated types
│   ├── lib/                 # Utilities (CSV parser, helpers)
│   ├── pages/               # Route-level page components
│   └── test/                # Vitest test files
├── supabase/
│   ├── config.toml          # Supabase project config
│   ├── functions/           # Edge functions (create-user)
│   └── migrations/          # SQL migration files (run in order)
├── vercel.json              # Vercel SPA rewrite config
├── vite.config.ts           # Vite build config
└── package.json
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add my feature"`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

This project is open source. Feel free to fork it and adapt it for your own kingdom.
