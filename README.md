# Workspace Pro (Tangent)

> Multi-tenant enterprise task and project management suite featuring dynamic custom form builders, interactive Kanban boards, timesheets, granular RBAC, and subscription billing.

---

## Architecture Overview

```
├── TODO/                 # Angular 19+ Single-Page Application (Frontend)
│   ├── vercel.json       # Vercel SPA routing & build configuration
│   ├── src/              # Angular components, signals, routes, and services
│   └── package.json
├── backend/              # Node.js Express REST API (Backend)
│   ├── vercel.json       # Vercel Serverless Function routing
│   ├── api/index.js      # Serverless entry point for Vercel
│   ├── src/              # Express controllers, routes, middleware, and config
│   ├── migrations/       # SQL schema migrations (auto-applied on init)
│   └── package.json
└── .gitignore            # Root ignore rules (keeps secrets & builds safe)
```

---

## Vercel Deployment Guide

Deploying frontend and backend as two separate services on Vercel:

### 1. Backend Deployment (`backend`)
1. In the Vercel Dashboard, click **Add New...** > **Project** and import this repository.
2. In the configuration screen:
   - **Project Name**: e.g., `workspace-pro-api`
   - **Root Directory**: Click *Edit* and select **`backend`**
   - **Framework Preset**: *Other*
3. Add **Environment Variables**:
   - `DATABASE_URL`: Your cloud MySQL connection string (e.g. from Aiven, PlanetScale, Railway, Supabase)
     - Format: `mysql://user:password@host:port/database_name?ssl={"rejectUnauthorized":true}`
   - `JWT_SECRET`: A secure random secret string
   - `APP_CLIENT_URL`: The URL of your deployed frontend (e.g., `https://workspace-pro.vercel.app`)
   - `STRIPE_SECRET_KEY`: *(Optional)* Your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET`: *(Optional)* Your Stripe webhook secret
4. Click **Deploy**. Vercel will route incoming `/api/*` calls through `api/index.js`.
5. Copy your deployed backend URL (e.g., `https://workspace-pro-api.vercel.app`).

### 2. Frontend Deployment (`TODO`)
1. In the Vercel Dashboard, click **Add New...** > **Project** and import the same repository again.
2. In the configuration screen:
   - **Project Name**: e.g., `workspace-pro`
   - **Root Directory**: Click *Edit* and select **`TODO`**
   - **Framework Preset**: *Other* (uses `TODO/vercel.json` with `npm run build:vercel`)
3. Add **Environment Variables**:
   - `API_BASE_URL`: `https://workspace-pro-api.vercel.app/api` (the backend URL from step 1)
   - `STRIPE_PUBLISHABLE_KEY`: *(Optional)* Your Stripe publishable key
4. Click **Deploy**. Vercel will compile the Angular application with base href `/` and enable SPA client-side routing.

---

## Local Development

### Prerequisites
- Node.js >= 18
- MySQL (or XAMPP)

### Running Backend Locally
```bash
cd backend
npm install
npm run dev
# Running at http://localhost:5000
```

### Running Frontend Locally
```bash
cd TODO
npm install
npm start
# Running at http://localhost:4200
```
