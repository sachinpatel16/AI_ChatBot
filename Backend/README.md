# Backend – RAG Chatbot API

FastAPI backend handling authentication, chat, admin, widget configuration, and RAG (Retrieval-Augmented Generation).

---

## Table of Contents

1. [Project Layout](#project-layout)
2. [Prerequisites](#prerequisites)
3. [Step 1 – Clone the Repository](#step-1--clone-the-repository)
4. [Step 2 – Create a Virtual Environment](#step-2--create-a-virtual-environment)
5. [Step 3 – Install Dependencies](#step-3--install-dependencies)
6. [Step 4 – Set Up Environment Variables](#step-4--set-up-environment-variables)
7. [Step 5 – Run Database Migrations](#step-5--run-database-migrations)
8. [Step 6 – Create Super Admin](#step-6--create-super-admin-first-time-only)
9. [Step 7 – Start the Server](#step-7--start-the-development-server)
10. [Environment Variables Reference](#environment-variables-reference)
11. [Production](#production)

---

## Project Layout

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

---

## Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| **Python** | **3.11** (required) | `py -3.11 --version` (Windows) / `python3.11 --version` (macOS) |
| **PostgreSQL** | Any recent version | Must be running with a database created |
| **Git** | Any | `git --version` |

> If `py -3.11` or `python3.11` is not recognised, download Python 3.11 from [python.org](https://www.python.org/downloads/).

---

## Step 1 – Clone the Repository

**Windows (PowerShell / cmd):**
```cmd
git clone <repo-url>
cd AI_bot\Backend
```

**macOS / Linux:**
```bash
git clone <repo-url>
cd AI_bot/Backend
```

---

## Step 2 – Create a Virtual Environment

A virtual environment keeps project dependencies isolated from your system Python.

### Windows – PowerShell

```powershell
py -3.11 -m venv venv
.\venv\Scripts\Activate.ps1
```

> If you get a permissions error in PowerShell, run:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
> then try activating again.

### Windows – Command Prompt (cmd)

```cmd
py -3.11 -m venv venv
venv\Scripts\activate.bat
```

### macOS / Linux

```bash
python3.11 -m venv venv
source venv/bin/activate
```

### Verify activation

After activating, confirm you are using Python 3.11:

```bash
python --version
# Expected: Python 3.11.x
```

Your terminal prompt will show `(venv)` when the environment is active.

---

## Step 3 – Install Dependencies

Use `dev-requirements.txt` for local development (includes all packages):

```bash
pip install -r dev-requirements.txt
```

> For production, use `requirements.txt` instead (leaner install).

---

## Step 4 – Set Up Environment Variables

Copy the example file to create your `.env`:

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

Then open `.env` in a text editor and fill in your values. See the [Environment Variables Reference](#environment-variables-reference) section below.

---

## Step 5 – Run Database Migrations

Ensure PostgreSQL is running and the database exists, then apply all migrations:

```bash
alembic upgrade head
```

> Alembic reads `DATABASE_URL` directly from your `.env` file.
> Run this every time there are new migrations (after pulling updates).

---

## Step 6 – Create Super Admin (First-time Only)

Run this once after migrations to create the first super-admin user:

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

---

## Step 7 – Start the Development Server

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

---

## Environment Variables Reference

All variables are set in `.env` (copied from `.env_example`):

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

---

## Production

- Install dependencies from `requirements.txt` (not dev-requirements):
  ```bash
  pip install -r requirements.txt
  ```
- Run uvicorn **without** `--reload`:
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port 8000
  ```
- Set `LOG_LEVEL=WARNING` or `LOG_LEVEL=ERROR` in `.env` for production.
