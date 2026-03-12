# Frontend – RAG Chatbot Admin UI

React + Vite + TypeScript admin interface for the RAG Chatbot. Connects to the Backend API for auth, documents, AI settings, widget config, and (for super admins) user management and logs.

---

## Table of Contents

1. [Project Layout](#project-layout)
2. [Prerequisites](#prerequisites)
3. [Step 1 – Clone and Enter Frontend](#step-1--clone-and-enter-frontend)
4. [Step 2 – Install Dependencies](#step-2--install-dependencies)
5. [Step 3 – Environment Variables](#step-3--environment-variables)
6. [Step 4 – Run the Dev Server](#step-4--run-the-dev-server)
7. [Environment Variables Reference](#environment-variables-reference)
8. [App Structure / Pages](#app-structure--pages)
9. [Build and Preview](#build-and-preview)

---

## Project Layout

```
Frontend/
├── src/
│   ├── components/     # Layout, pages, shared UI
│   ├── contexts/       # Auth, theme
│   ├── services/       # API client (api.ts)
│   ├── types/          # TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── vite.config.ts
├── .env_example        # Copy to .env
└── .env                # Your local env (do not commit)
```

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | 18+ or 20 LTS recommended. Check: `node --version` |
| **npm** | Usually ships with Node. Or use yarn/pnpm |
| **Backend** | Backend API should be running for full functionality (see [Backend README](../Backend/README.md)) |

---

## Step 1 – Clone and Enter Frontend

**Windows (PowerShell / cmd):**
```cmd
cd AI_bot\Frontend
```

**macOS / Linux:**
```bash
cd AI_bot/Frontend
```

(If you cloned the repo at the root, adjust the path to the repo root first.)

---

## Step 2 – Install Dependencies

```bash
npm install
```

---

## Step 3 – Environment Variables

Copy the example env file, then edit `.env` with your values.

**Windows (PowerShell):**
```powershell
Copy-Item .env_example .env
```

**Windows (cmd):**
```cmd
copy .env_example .env
```

**macOS / Linux:**
```bash
cp .env_example .env
```

Open `.env` and set `VITE_API_BASE_URL` to your Backend API URL (e.g. `http://localhost:8000`). If you leave it unset, the app uses `http://localhost:8000` by default.

---

## Step 4 – Run the Dev Server

```bash
npm run dev
```

Vite will print the local URL (e.g. **http://localhost:5173**). Open it in a browser. Ensure the Backend is running so login and API calls work (see [Backend README](../Backend/README.md)).

---

## Environment Variables Reference

All variables are read from `.env` (copy from `.env_example`). Vite only exposes variables prefixed with `VITE_`.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | No (has default) | Backend API base URL. Default in code: `http://localhost:8000`. Set for staging/production or a different host/port. |

---

## App Structure / Pages

The app does **not** use URL-based routing (no react-router). After login, navigation is in-app via the sidebar; the current “page” is kept in state.

| Role | Pages (sidebar) |
|------|------------------|
| **Admin** | Dashboard, Documents, AI Chatbot, Widget, Settings |
| **Super Admin** | Super Admin, System Logs |

- **Login** is the only screen before authentication.
- **Profile** is available from the layout (e.g. user menu) for both roles.
- Super admins see Super Admin (user/trial management) and System Logs; admins see Dashboard, Documents, AI Chatbot, Widget, and Settings.

---

## Build and Preview

**Production build:**
```bash
npm run build
```

**Preview the production build locally:**
```bash
npm run preview
```

For production deployment, set `VITE_API_BASE_URL` in your build environment to the correct Backend API URL.
