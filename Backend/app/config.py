import os
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.chat_models import init_chat_model

# Only load .env if DATABASE_URL is not already set (i.e., not in Docker)
if not os.getenv("DATABASE_URL"):
    load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")


def get_chat_model():
    """Return the default chat LLM using hardcoded/env config (startup fallback)."""
    return init_chat_model(
        "claude-sonnet-4-5-20250929",
        max_tokens=1000,
    )


def get_chat_model_dynamic(db, user_id=None) -> object:
    """
    Return a chat LLM built from the active AIConfig row in the database.
    Falls back to env API keys if no matching key is in master_settings.
    Falls back to default model if no active config exists.
    """
    from app import models as _models

    # Always scope by user_id — never fall back to another admin's config
    config = db.query(_models.AIConfig).filter_by(user_id=user_id, is_active=True).first() if user_id else None

    if config is None:
        return get_chat_model()

    # Resolve API key: prefer DB master_settings, fall back to .env
    if config.model_provider == "anthropic":
        query = db.query(_models.MasterSetting).filter_by(name="ANTHROPIC_API_KEY", is_active=True)
        if user_id:
            query = query.filter_by(user_id=user_id)
        key_setting = query.first()
        api_key = key_setting.value if key_setting else ANTHROPIC_API_KEY
        return init_chat_model(
            config.model_name,
            max_tokens=config.max_tokens,
            anthropic_api_key=api_key,
        )
    else:
        query = db.query(_models.MasterSetting).filter_by(name="OPENAI_API_KEY", is_active=True)
        if user_id:
            query = query.filter_by(user_id=user_id)
        key_setting = query.first()
        api_key = key_setting.value if key_setting else OPENAI_API_KEY
        return ChatOpenAI(
            model=config.model_name,
            max_tokens=config.max_tokens,
            temperature=config.temperature,
            openai_api_key=api_key,
        )


def get_embeddings() -> OpenAIEmbeddings:
    """Return the embedding model using the env/module-level API key."""
    return OpenAIEmbeddings(model="text-embedding-ada-002", api_key=OPENAI_API_KEY)


def get_embeddings_dynamic(db, user_id=None) -> OpenAIEmbeddings:
    """
    Return the embedding model, preferring OPENAI_API_KEY from master_settings DB.
    Falls back to the .env key if no active DB setting is found.
    """
    from app import models as _models

    query = db.query(_models.MasterSetting).filter_by(name="OPENAI_API_KEY", is_active=True)
    if user_id:
        query = query.filter_by(user_id=user_id)
    key_setting = query.first()
    api_key = key_setting.value if key_setting else OPENAI_API_KEY
    return OpenAIEmbeddings(model="text-embedding-ada-002", api_key=api_key)


# ChromaDB is fully local — no API keys needed
# Vector store persists to CHROMA_DIR on disk
print(f"DATABASE_URL being used: {DATABASE_URL}")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 3000

UPLOAD_DIR = "uploads"
CHROMA_DIR = "chroma_db"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(CHROMA_DIR, exist_ok=True)


from datetime import datetime as _dt, timezone as _tz, timedelta as _td

# ── Timezone Utilities ────────────────────────────────────────────────────────
# Single source of truth for all timezone handling across the app.
# Rule: always STORE UTC in DB, always DISPLAY IST to users.

IST = _tz(_td(hours=5, minutes=30))   # UTC+5:30  (Indian Standard Time)
UTC = _tz.utc


def now_utc() -> _dt:
    """Return the current time as a timezone-aware UTC datetime.
    Use this for all DB writes (replaces the deprecated datetime.utcnow)."""
    return _dt.now(UTC)


def now_ist() -> _dt:
    """Return the current time as a timezone-aware IST datetime."""
    return _dt.now(IST)


def to_ist(dt: _dt | None) -> _dt | None:
    """Convert any datetime to IST.

    - If *dt* is naive it is assumed to be UTC (as stored by the DB).
    - If *dt* is already timezone-aware it is simply converted to IST.
    - Returns None if *dt* is None.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)   # treat naive DB value as UTC
    return dt.astimezone(IST)