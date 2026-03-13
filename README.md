# AI Bot – RAG Chatbot

This project is a **RAG (Retrieval-Augmented Generation) Chatbot** with a FastAPI backend and a React admin frontend. The **Backend** handles authentication, chat, admin, widget configuration, and RAG. The **Frontend** is a React + Vite + TypeScript admin UI that connects to the Backend API for auth, documents, AI settings, widget config, and (for super admins) user management and logs.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Backend – RAG Chatbot API](#backend--rag-chatbot-api)
   - [Backend – Project Layout](#backend--project-layout)
   - [Backend – Prerequisites](#backend--prerequisites)
   - [Backend – Step 1 – Clone the Repository](#backend--step-1--clone-the-repository)
   - [Backend – Step 2 – Create a Virtual Environment](#backend--step-2--create-a-virtual-environment)
   - [Backend – Step 3 – Install Dependencies](#backend--step-3--install-dependencies)
   - [Backend – Step 4 – Set Up Environment Variables](#backend--step-4--set-up-environment-variables)
   - [Backend – Step 5 – Run Database Migrations](#backend--step-5--run-database-migrations)
   - [Backend – Step 6 – Create Super Admin](#backend--step-6--create-super-admin-first-time-only)
   - [Backend – Step 7 – Start the Server](#backend--step-7--start-the-development-server)
   - [Backend – Environment Variables Reference](#backend--environment-variables-reference)
   - [Backend – Production](#backend--production)
3. [Frontend – RAG Chatbot Admin UI](#frontend--rag-chatbot-admin-ui)
   - [Frontend – Project Layout](#frontend--project-layout)
   - [Frontend – Prerequisites](#frontend--prerequisites)
   - [Frontend – Step 1 – Clone and Enter Frontend](#frontend--step-1--clone-and-enter-frontend)
   - [Frontend – Step 2 – Install Dependencies](#frontend--step-2--install-dependencies)
   - [Frontend – Step 3 – Environment Variables](#frontend--step-3--environment-variables)
   - [Frontend – Step 4 – Run the Dev Server](#frontend--step-4--run-the-dev-server)
   - [Frontend – Environment Variables Reference](#frontend--environment-variables-reference)
   - [Frontend – App Structure / Pages](#frontend--app-structure--pages)
   - [Frontend – Build and Preview](#frontend--build-and-preview)

---

## Quick Start

1. **Backend:** From the repo root, `cd Backend`, create a virtual environment, install dependencies (`pip install -r dev-requirements.txt`), copy `.env_example` to `.env`, run `alembic upgrade head`, create a super admin (`python super_admin.py ...`), then start the API: `uvicorn app.main:app --reload`.
2. **Frontend:** From the repo root, `cd Frontend`, run `npm install`, copy `.env_example` to `.env`, then `npm run dev`.
3. The frontend expects the backend at **http://localhost:8000** by default. Open the dev server URL (e.g. http://localhost:5173) in a browser.

---

## Backend – RAG Chatbot API

FastAPI backend handling authentication, chat, admin, widget configuration, and RAG (Retrieval-Augmented Generation).

### Backend – Project Layout

```
Backend/
├── app/
│   ├── main.py          # FastAPI app entry point
│   ├── config.py        # Settings and LLM setup
│   ├── database.py      # SQLAlchemy engine and session
│   ├── models.py        # Database models
│   ├── auth.py          # JWT auth helpers
│   └── routes/          # Route handlers (auth, chat, admin, widget, etc.)
├── alembic/             # Database migrations
├── super_admin.py       # CLI script to create the first super-admin user
├── requirements.txt     # Production dependencies
├── dev-requirements.txt # Development dependencies (use for local setup)
└── .env_example         # Environment variable template – copy to .env
```

### Backend – Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| **Python** | **3.11** (required) | `py -3.11 --version` (Windows) / `python3.11 --version` (macOS) |
| **PostgreSQL** | Any recent version | Must be running with a database created |
| **Git** | Any | `git --version` |

> If `py -3.11` or `python3.11` is not recognised, download Python 3.11 from [python.org](https://www.python.org/downloads/).

### Backend – Step 1 – Clone the Repository

**Windows (PowerShell / cmd):**
```cmd
git clone <repo-url>
cd AI_bot
cd Backend
```

**macOS / Linux:**
```bash
git clone <repo-url>
cd AI_bot/Backend
```

### Backend – Step 2 – Create a Virtual Environment

A virtual environment keeps project dependencies isolated from your system Python.

**Windows – PowerShell**

```powershell
py -3.11 -m venv venv  or  python -3.11 -m venv venv
.\venv\Scripts\Activate.ps1
```

> If you get a permissions error in PowerShell, run:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
> then try activating again.

**Windows – Command Prompt (cmd)**

```cmd
py -3.11 -m venv venv  or   python -3.11 -m venv venv
venv\Scripts\activate.bat
```

**macOS / Linux**

```bash
python3.11 -m venv venv  or python3 -m venv venv
source venv/bin/activate
```

**Verify activation**

After activating, confirm you are using Python 3.11:

```bash
python --version
# Expected: Python 3.11.x
```

Your terminal prompt will show `(venv)` when the environment is active.

### Backend – Step 3 – Install Dependencies

Use `dev-requirements.txt` for local development (includes all packages):

```bash
pip install -r dev-requirements.txt
```

> For production, use `requirements.txt` instead (leaner install).

### Backend – Step 4 – Set Up Environment Variables

Copy the example file to create your `.env` (from the `Backend` directory):

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

Then open `.env` in a text editor and fill in your values. See the [Backend – Environment Variables Reference](#backend--environment-variables-reference) section below.

### Backend – Step 5 – Run Database Migrations

Ensure PostgreSQL is running and the database exists, then apply all migrations (from the `Backend` directory):

```bash
alembic upgrade head
```

> Alembic reads `DATABASE_URL` directly from your `.env` file.
> Run this every time there are new migrations (after pulling updates).

### Backend – Step 6 – Start the Development Server

From the `Backend` directory:

```bash
uvicorn app.main:app --reload
```

**Optional – bind to all network interfaces:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

| URL | Description |
|-----|-------------|
| `http://localhost:8000/docs` | Swagger UI (interactive API docs) |
| `http://localhost:8000/redoc` | ReDoc API docs |

### Backend – Step 7 – Create Super Admin (First-time Only)

Run this once after migrations to create the first super-admin user (from the `Backend` directory):

```bash
python super_admin.py <username> <email> <password> [fullname]
```

| Argument | Required | Description |
|----------|----------|-------------|
| `username` | Yes | Login username |
| `email` | Yes | Login email address |
| `password` | Yes | Account password |
| `fullname` | No | Display name (uses username if omitted) |

**Example:**
```bash
python super_admin.py admin admin@example.com MySecurePass "Admin User"
```

The user is created with the `super_admin` role, active status, and a 10-year trial.

> The database and migrations (Step 5) must be completed before running this script.

### Backend – Environment Variables Reference

All variables are set in `.env` (copied from `.env_example`) in the `Backend` directory:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string, e.g. `postgresql://user:password@localhost:5432/mydb` |
| `SECRET_KEY` | Yes | Long random string used to sign JWT tokens |
| `OPENAI_API_KEY` | Yes | OpenAI API key for chat and embeddings |
| `ANTHROPIC_API_KEY` | No | For Anthropic/Claude models; leave blank if using OpenAI only |
| `LOG_LEVEL` | No | Logging verbosity: `DEBUG`, `INFO`, `WARNING`, `ERROR` (default: `INFO`) |

**Generating a secure `SECRET_KEY`:**

**Windows (PowerShell):**
```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

**macOS / Linux:**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Backend – Production

- Install dependencies from `requirements.txt` (not dev-requirements):
  ```bash
  pip install -r requirements.txt
  ```
- Run uvicorn **without** `--reload`:
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port 8000
  ```
- Set `LOG_LEVEL=WARNING` or `LOG_LEVEL=ERROR` in `.env` for production.

---

## Frontend – RAG Chatbot Admin UI

React + Vite + TypeScript admin interface for the RAG Chatbot. Connects to the Backend API for auth, documents, AI settings, widget config, and (for super admins) user management and logs.

### Frontend – Project Layout

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

### Frontend – Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | 18+ or 20 LTS recommended. Check: `node --version` |
| **npm** | Usually ships with Node. Or use yarn/pnpm |
| **Backend** | Backend API should be running for full functionality (see [Backend](#backend--rag-chatbot-api) section above). |

### Frontend – Step 1 – Clone and Enter Frontend

From the repo root (after cloning):

**Windows (PowerShell / cmd):**
```cmd
cd AI_bot\Frontend
```

**macOS / Linux:**
```bash
cd AI_bot/Frontend
```

### Frontend – Step 2 – Install Dependencies

```bash
npm install
```

### Frontend – Step 3 – Environment Variables

Copy the example env file, then edit `.env` with your values (in the `Frontend` directory).

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

### Frontend – Step 4 – Run the Dev Server

```bash
npm run dev
```

Vite will print the local URL (e.g. **http://localhost:5173**). Open it in a browser. Ensure the Backend is running so login and API calls work (see [Backend](#backend--rag-chatbot-api) section above).

### Frontend – Environment Variables Reference

All variables are read from `.env` (copy from `.env_example`) in the `Frontend` directory. Vite only exposes variables prefixed with `VITE_`.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | No (has default) | Backend API base URL. Default in code: `http://localhost:8000`. Set for staging/production or a different host/port. |

### Frontend – App Structure / Pages

The app does **not** use URL-based routing (no react-router). After login, navigation is in-app via the sidebar; the current "page" is kept in state.

| Role | Pages (sidebar) |
|------|------------------|
| **Admin** | Dashboard, Documents, AI Chatbot, Widget, Settings |
| **Super Admin** | Super Admin, System Logs |

- **Login** is the only screen before authentication.
- **Profile** is available from the layout (e.g. user menu) for both roles.
- Super admins see Super Admin (user/trial management) and System Logs; admins see Dashboard, Documents, AI Chatbot, Widget, and Settings.

### Frontend – Build and Preview

**Production build:**
```bash
npm run build
```

**Preview the production build locally:**
```bash
npm run preview
```

For production deployment, set `VITE_API_BASE_URL` in your build environment to the correct Backend API URL.
