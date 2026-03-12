import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from uuid import uuid4
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app import models, auth, utils
from app.models import UserRole
from app.logger import get_logger
from app.schemas import (
    MasterSettingCreate,
    MasterSettingUpdate,
    MasterSettingResponse,
    AIConfigUpdate,
    AIConfigResponse,
    WidgetConfigUpdate,
    WidgetConfigResponse,
    ChatLogResponse,
    ChatLogListResponse,
    ChatLogStats,
    TopKeyword,
)
from app.response import (
    success_response,
    MSG_FETCHED,
    MSG_CREATED,
    MSG_UPDATED,
    MSG_DELETED,
)
from langchain_core.messages import HumanMessage

logger = get_logger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin — Document Management"])

ADMIN_DOC_DIR = "admin_docs"
os.makedirs(ADMIN_DOC_DIR, exist_ok=True)


# ─────────────────────────────────────────────
# Admin Auth Dependency
# ─────────────────────────────────────────────


def get_current_admin(
    current_user: models.User = Depends(auth.get_current_user),
) -> models.User:
    """Ensures the authenticated user has the admin role."""
    role_str = (
        current_user.user_type.value
        if hasattr(current_user.user_type, "value")
        else current_user.user_type
    )
    if role_str != "admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied. Admin role required.",
        )
    return current_user


# ─────────────────────────────────────────────
# Document Management
# ─────────────────────────────────────────────


@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Upload a document. Call /process next to embed it into ChromaDB."""
    logger.info(f"Admin {admin.username} uploading: {file.filename}")

    allowed_extensions = {".pdf", ".csv", ".txt", ".md", ".rtf", ".doc", ".docx", ".json", ".html"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed types: .pdf, .csv, .txt, .md, .rtf, .doc, .docx, .json, .html",
        )

    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB limit

    # Check file size before reading into memory
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File too large. Maximum allowed size is 50MB.",
        )

    try:
        unique_filename = f"{uuid4()}_{file.filename}"
        path = os.path.join(ADMIN_DOC_DIR, unique_filename)

        with open(path, "wb") as f:
            # Read and write in 1MB chunks to prevent memory crashes
            while chunk := await file.read(1024 * 1024):
                f.write(chunk)

        doc = models.Document(
            filename=file.filename,
            path=path,
            user_id=admin.id,
            is_active=False,
            is_processed=False,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        logger.info(f"Uploaded doc ID={doc.id} by admin {admin.username}")
        return success_response(
            data={
                "document_id": doc.id,
                "filename": doc.filename,
                "is_processed": False,
                "is_active": False,
                "status": doc.status,
            },
            message="Document uploaded. Click 'Process' to embed it.",
        )
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="File upload failed")


def background_process_doc(doc_id: str, doc_path: str, user_id: str):
    """Background task to process document embedding."""
    from app.database import SessionLocal
    db_session = SessionLocal()
    
    doc = db_session.query(models.Document).filter_by(id=doc_id).first()
    if not doc:
        db_session.close()
        return

    try:
        # Update state to processing
        doc.status = "processing"
        doc.error_message = None
        db_session.commit()

        # Run embedding process
        namespace = utils.process_document(doc_path, doc_id, db=db_session, user_id=user_id)

        # Update state on success
        doc.is_processed = True
        doc.status = "completed"
        doc.vector_namespace = namespace
        db_session.commit()
        logger.info(f"Background processing SUCCESS for doc {doc_id}")
    except Exception as e:
        # Handle failure
        logger.error(f"Background processing FAILED for doc {doc_id}: {e}")
        db_session.rollback()
        
        # Re-fetch doc and update error state
        doc = db_session.query(models.Document).filter_by(id=doc_id).first()
        if doc:
            doc.status = "failed"
            doc.error_message = str(e)
            db_session.commit()
    finally:
        db_session.close()


@router.post("/documents/{doc_id}/process")
async def process_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Queue a document to be embedded into the ChromaDB vector store."""
    doc = db.query(models.Document).filter_by(id=doc_id, user_id=admin.id).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.path):
        raise HTTPException(status_code=404, detail="File not found on server")

    if doc.status == "processing":
        raise HTTPException(status_code=400, detail="Document is already processing")

    if doc.is_processed:
        return success_response(
            data={
                "document_id": doc_id,
                "filename": doc.filename,
                "is_processed": True,
                "status": doc.status,
                "vector_namespace": doc.vector_namespace,
            },
            message="Document already processed.",
        )

    # Add to background queue
    background_tasks.add_task(background_process_doc, doc_id, doc.path, admin.id)

    return success_response(
        data={
            "document_id": doc_id,
            "filename": doc.filename,
            "is_processed": doc.is_processed,
            "status": "processing",
        },
        message=f"Processing started for '{doc.filename}' in the background.",
    )


class DocumentStatusUpdate(BaseModel):
    is_active: bool


@router.patch("/documents/{doc_id}/status")
async def update_document_status(
    doc_id: str,
    data: DocumentStatusUpdate,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update active status of a document."""
    doc = db.query(models.Document).filter_by(id=doc_id, user_id=admin.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if data.is_active and not doc.is_processed:
        raise HTTPException(
            status_code=400,
            detail="Document not processed yet. Please process it first.",
        )

    doc.is_active = data.is_active
    db.commit()

    status_str = "active" if data.is_active else "inactive"
    logger.info(f"Admin {admin.username} marked doc {doc_id} as {status_str}")
    return success_response(
        data={
            "document_id": doc.id,
            "is_active": doc.is_active,
            "status": doc.status,
            "error_message": doc.error_message,
        },
        message=f"'{doc.filename}' is now {status_str}.",
    )


@router.get("/documents")
async def list_documents(
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all documents with their processing and activation status."""
    docs = db.query(models.Document).filter_by(user_id=admin.id).all()
    data = [
        {
            "id": doc.id,
            "filename": doc.filename,
            "is_processed": doc.is_processed,
            "is_active": doc.is_active,
            "status": doc.status,
            "error_message": doc.error_message,
            "vector_namespace": doc.vector_namespace,
            "uploaded_by": doc.user_id,
            "created_at": doc.created_at,
        }
        for doc in docs
    ]
    return success_response(data=data, message=MSG_FETCHED)


@router.get("/documents/{doc_id}/download")
async def download_document(
    doc_id: str,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Download a document file."""
    doc = db.query(models.Document).filter_by(id=doc_id, user_id=admin.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.path):
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(
        path=doc.path, 
        filename=doc.filename, 
        content_disposition_type="inline"
    )


@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete a document, its file from disk, and its ChromaDB collection."""
    doc = db.query(models.Document).filter_by(id=doc_id, user_id=admin.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove file from disk
    if os.path.exists(doc.path):
        try:
            os.remove(doc.path)
        except OSError as e:
            logger.warning(f"Could not delete file {doc.path}: {e}")

    # Remove ChromaDB collection
    if doc.is_processed and doc.vector_namespace:
        utils.delete_document_collection(doc.vector_namespace)

    db.delete(doc)
    db.commit()

    logger.info(f"Admin {admin.username} deleted doc {doc_id}")
    return success_response(
        data=None, message=f"Document '{doc.filename}' deleted successfully."
    )


# ─────────────────────────────────────────────
# Admin Test Chat
# ─────────────────────────────────────────────


@router.post("/chat/test")
async def admin_test_chat(
    query: str,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Admin test endpoint — same RAG flow as public /chat.
    Uses admin's user ID as session thread for isolated test memory.
    """
    from app.routes.chat_rout import run_chat_pipeline

    logger.info(f"Admin {admin.username} testing chat: {query}")
    try:
        result = await run_chat_pipeline(query=query, db=db, user_id=admin.id)
        return success_response(data=result, message="Message sent successfully")
    except Exception as e:
        logger.error(f"Admin test chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# Master Settings (API Keys)
# ─────────────────────────────────────────────


@router.get("/master-settings")
async def list_master_settings(
    include_inactive: bool = False,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all master settings (API keys and other config values)."""
    query = db.query(models.MasterSetting).filter_by(user_id=admin.id)
    if not include_inactive:
        query = query.filter_by(is_active=True)
    settings = query.order_by(models.MasterSetting.name).all()
    data = [MasterSettingResponse.model_validate(s).model_dump() for s in settings]
    return success_response(data=data, message=MSG_FETCHED)


@router.post("/master-settings")
async def create_master_setting(
    data: MasterSettingCreate,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Create a new master setting (e.g. OPENAI_API_KEY)."""
    existing = db.query(models.MasterSetting).filter_by(user_id=admin.id, name=data.name).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Setting '{data.name}' already exists. Use PUT to update it.",
        )
    setting = models.MasterSetting(
        user_id=admin.id,
        name=data.name,
        value=data.value,
        is_active=data.is_active,
    )
    db.add(setting)
    db.commit()
    db.refresh(setting)
    logger.info(f"Admin {admin.username} created master setting: {data.name}")
    return success_response(
        data=MasterSettingResponse.model_validate(setting).model_dump(),
        message=MSG_CREATED,
    )


@router.put("/master-settings/{name}")
async def update_master_setting(
    name: str,
    data: MasterSettingUpdate,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update value or active status of a master setting."""
    setting = db.query(models.MasterSetting).filter_by(user_id=admin.id, name=name).first()
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{name}' not found.")
    if data.value is not None:
        setting.value = data.value
    if data.is_active is not None:
        setting.is_active = data.is_active
    db.commit()
    db.refresh(setting)
    logger.info(f"Admin {admin.username} updated master setting: {name}")
    return success_response(
        data=MasterSettingResponse.model_validate(setting).model_dump(),
        message=MSG_UPDATED,
    )


@router.delete("/master-settings/{name}")
async def delete_master_setting(
    name: str,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete a master setting by name."""
    setting = db.query(models.MasterSetting).filter_by(user_id=admin.id, name=name).first()
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{name}' not found.")
    db.delete(setting)
    db.commit()
    logger.info(f"Admin {admin.username} deleted master setting: {name}")
    return success_response(data=None, message=f"Setting '{name}' deleted.")


@router.post("/master-settings/{name}/activate")
async def activate_master_setting(
    name: str,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Set a master setting's is_active to True."""
    setting = db.query(models.MasterSetting).filter_by(user_id=admin.id, name=name).first()
    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{name}' not found.")
    setting.is_active = True
    db.commit()
    db.refresh(setting)
    logger.info(f"Admin {admin.username} activated master setting: {name}")
    return success_response(
        data=MasterSettingResponse.model_validate(setting).model_dump(),
        message=MSG_UPDATED,
    )


# ─────────────────────────────────────────────
# AI Config (Model + Prompts)
# ─────────────────────────────────────────────


def _get_or_create_ai_config(db: Session, user_id: str) -> models.AIConfig:
    """Return the active AIConfig row, creating a default one if none exists."""
    config = db.query(models.AIConfig).filter_by(user_id=user_id, is_active=True).first()
    if config is None:
        config = models.AIConfig(user_id=user_id)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.get("/ai-config")
async def get_ai_config(
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get the current AI model/prompt configuration."""
    config = _get_or_create_ai_config(db, admin.id)
    return success_response(
        data=AIConfigResponse.model_validate(config).model_dump(),
        message=MSG_FETCHED,
    )


@router.put("/ai-config")
async def update_ai_config(
    data: AIConfigUpdate,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update the AI model/prompt configuration (upserts single active config)."""
    config = _get_or_create_ai_config(db, admin.id)

    update_fields = data.model_dump(exclude_none=True)
    for field, value in update_fields.items():
        setattr(config, field, value)

    db.commit()
    db.refresh(config)
    logger.info(
        f"Admin {admin.username} updated AI config: {list(update_fields.keys())}"
    )
    return success_response(
        data=AIConfigResponse.model_validate(config).model_dump(),
        message=MSG_UPDATED,
    )


# ─────────────────────────────────────────────
# Widget Config (Embed Script Settings)
# ─────────────────────────────────────────────


def _get_or_create_widget_config(db: Session, user_id: str) -> models.WidgetConfig:
    """Return the active WidgetConfig row for the user, creating a default one if none exists."""
    config = db.query(models.WidgetConfig).filter_by(user_id=user_id, is_active=True).first()
    if config is None:
        config = models.WidgetConfig(user_id=user_id)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.get("/widget-config")
async def get_widget_config(
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get the current chat widget configuration."""
    config = _get_or_create_widget_config(db, admin.id)
    return success_response(
        data=WidgetConfigResponse.model_validate(config).model_dump(),
        message=MSG_FETCHED,
    )


@router.put("/widget-config")
async def update_widget_config(
    data: WidgetConfigUpdate,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update the chat widget appearance and behaviour settings."""
    config = _get_or_create_widget_config(db, admin.id)

    update_fields = data.model_dump(exclude_none=True)
    for field, value in update_fields.items():
        setattr(config, field, value)

    db.commit()
    db.refresh(config)
    logger.info(
        f"Admin {admin.username} updated widget config: {list(update_fields.keys())}"
    )
    return success_response(
        data=WidgetConfigResponse.model_validate(config).model_dump(),
        message=MSG_UPDATED,
    )


# ─────────────────────────────────────────────
# Chat Log Analytics
# ─────────────────────────────────────────────

# Expanded list of common conversational stop words and generic bot interactions
_STOP_WORDS = {
    # Basic English
    "a", "an", "the", "is", "it", "in", "on", "at", "to", "for", "of", "and",
    "or", "but", "not", "with", "this", "that", "are", "was", "were", "be",
    "been", "have", "has", "had", "do", "does", "did", "will", "would", "can",
    "could", "should", "may", "might", "i", "you", "he", "she", "we", "they",
    "my", "your", "his", "her", "its", "our", "me", "him", "us", "them",
    "what", "how", "when", "where", "why", "who", "which", "from", "about",
    "so", "if", "as", "by", "up", "out", "no", "yes", "any", "all", "more",
    "there", "their", "then", "than", "into", "over", "after", "before",
    
    # Conversational / Bot interactions
    "hi", "hello", "hey", "help", "please", "thanks", "thank", "okay", "ok",
    "good", "bad", "yes", "no", "yeah", "nope", "tell", "ask", "asking",
    "know", "want", "need", "like", "just", "get", "got", "make", "made",
    "give", "given", "let", "see", "say", "said", "question", "questions",
    "explain", "explaining", "details", "detail", "info", "information",
    "bot", "chatbot", "assistant", "ai", "sir", "madam", "something",
    "anything", "nothing", "everything", "someone", "anyone", "everyone",
    
    # Days / Time generic
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "mon", "tue", "wed", "thu", "fri", "sat", "sun", "today", "tomorrow", "yesterday",
    "day", "days", "week", "weeks", "month", "months", "year", "years", "time",
    "morning", "afternoon", "evening", "night",
    
    # Filler numbers/letters usually mistyped
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "b", "c", "d", "e", "f", "g", "h", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"
}

# Map common related keywords to a standardized Intent/Topic string
_INTENT_MAP = {
    # Leave & Attendance
    "leave": "Leave & Time Off",
    "leaves": "Leave & Time Off",
    "pto": "Leave & Time Off",
    "sick": "Leave & Time Off",
    "vacation": "Leave & Time Off",
    "holiday": "Leave & Time Off",
    "holidays": "Leave & Time Off",
    "attendance": "Leave & Time Off",
    "absent": "Leave & Time Off",
    "sandwich": "Leave & Time Off",  # Often "sandwich policy"
    
    # Remote Work
    "wfh": "Remote Work (WFH)",
    "remote": "Remote Work (WFH)",
    "home": "Remote Work (WFH)",
    "hybrid": "Remote Work (WFH)",
    
    # HR & Policy
    "policy": "HR & Policies",
    "policies": "HR & Policies",
    "handbook": "HR & Policies",
    "rules": "HR & Policies",
    "guidelines": "HR & Policies",
    "hr": "HR & Policies",
    "culture": "HR & Policies",
    "values": "HR & Policies",
    
    # Pay & Benefits
    "pay": "Payroll & Salary",
    "salary": "Payroll & Salary",
    "payroll": "Payroll & Salary",
    "bonus": "Payroll & Salary",
    "tax": "Payroll & Salary",
    "taxes": "Payroll & Salary",
    "compensation": "Payroll & Salary",
    "benefits": "Benefits & Perks",
    "insurance": "Benefits & Perks",
    "health": "Benefits & Perks",
    "mediclaim": "Benefits & Perks",
    
    # IT / Support
    "it": "IT & Equipment",
    "laptop": "IT & Equipment",
    "computer": "IT & Equipment",
    "mouse": "IT & Equipment",
    "keyboard": "IT & Equipment",
    "monitor": "IT & Equipment",
    "access": "IT & Equipment",
    "password": "IT & Equipment",
    "login": "IT & Equipment",
    "vpn": "IT & Equipment",
    "software": "IT & Equipment",
    
    # Office & Facilities
    "office": "Office & Facilities",
    "desk": "Office & Facilities",
    "parking": "Office & Facilities",
    "cab": "Office & Facilities",
    "transport": "Office & Facilities",
    "lunch": "Office & Facilities",
    "food": "Office & Facilities",
    "cafeteria": "Office & Facilities",
    "coffee": "Office & Facilities",
}


def _extract_top_keywords(messages: list[str], top_n: int = 10) -> list[dict]:
    """
    Extract top N topics/intents from a list of user messages.
    Uses heuristic mapping to group synonyms into clear categories.
    """
    import re
    from collections import Counter

    intent_counts: Counter = Counter()

    for msg in messages:
        # We only want to count an intent ONCE per message, 
        # so if they say "sick leave vacation", that's 1 hit for "Leave & Time Off"
        msg_intents = set()
        
        words = re.findall(r"[a-z']+", msg.lower())
        for word in words:
            clean = word.strip("'")
            
            # Skip short words and noisy stopwords
            if len(clean) <= 2 or clean in _STOP_WORDS:
                continue
                
            # Check if word maps to a known intent
            if clean in _INTENT_MAP:
                msg_intents.add(_INTENT_MAP[clean])
            else:
                # If it's a new, unknown word, treat it as its own topic
                # Capitalize it nicely for the UI (e.g., "marketing" -> "Marketing")
                msg_intents.add(clean.capitalize())
        
        # Add the unique intents found in this message to the total counter
        for intent in msg_intents:
            intent_counts[intent] += 1

    return [{"word": w, "count": c} for w, c in intent_counts.most_common(top_n)]


@router.get("/chat-logs", response_model=None)
async def list_chat_logs(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    date_from: Optional[str] = None,   # ISO 8601 e.g. 2025-01-01
    date_to: Optional[str] = None,
    rag_found: Optional[bool] = None,
    status: Optional[str] = None,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Paginated list of public chat conversations for this admin's widget."""
    from app.config import IST, UTC
    from datetime import datetime as dt

    query = db.query(models.ChatLog).filter_by(user_id=admin.id)

    if search:
        query = query.filter(models.ChatLog.user_message.ilike(f"%{search}%"))
    if rag_found is not None:
        query = query.filter_by(rag_found=rag_found)
    if status is not None and status.strip():
        query = query.filter(models.ChatLog.status == status.strip().upper())
    if date_from:
        start_ist = dt.strptime(date_from, "%Y-%m-%d").replace(tzinfo=IST)
        start_utc = start_ist.astimezone(UTC).replace(tzinfo=None)
        query = query.filter(models.ChatLog.created_at >= start_utc)
    if date_to:
        end_ist = dt.strptime(date_to, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=IST)
        end_utc = end_ist.astimezone(UTC).replace(tzinfo=None)
        query = query.filter(models.ChatLog.created_at <= end_utc)

    total = query.count()
    items = (
        query.order_by(models.ChatLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    import math
    data = ChatLogListResponse(
        items=[ChatLogResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 1,
    )
    return success_response(data=data.model_dump(), message=MSG_FETCHED)


@router.get("/chat-logs/stats", response_model=None)
async def get_chat_log_stats(
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Analytics summary: totals, RAG hit rate, and top keywords from user messages."""
    from app.config import IST, UTC, now_ist

    today_start_ist = now_ist().replace(hour=0, minute=0, second=0, microsecond=0)
    today_start_utc = today_start_ist.astimezone(UTC)

    all_logs = db.query(models.ChatLog).filter_by(user_id=admin.id).all()
    today_logs = [
        l for l in all_logs
        if l.created_at and l.created_at.replace(tzinfo=UTC) >= today_start_utc
    ]

    total = len(all_logs)
    today_count = len(today_logs)
    rag_hits = sum(1 for l in all_logs if l.rag_found)
    rag_hit_rate = round((rag_hits / total * 100), 1) if total > 0 else 0.0

    all_messages = [l.user_message for l in all_logs]
    keywords = _extract_top_keywords(all_messages, top_n=10)

    stats = ChatLogStats(
        total_messages=total,
        today_messages=today_count,
        rag_hit_rate=rag_hit_rate,
        top_keywords=[TopKeyword(**k) for k in keywords],
    )
    return success_response(data=stats.model_dump(), message=MSG_FETCHED)


@router.delete("/chat-logs/{log_id}")
async def delete_chat_log(
    log_id: str,
    admin: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete a single chat log entry."""
    log = db.query(models.ChatLog).filter_by(id=log_id, user_id=admin.id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Chat log not found")
    db.delete(log)
    db.commit()
    logger.info(f"Admin {admin.username} deleted chat log {log_id}")
    return success_response(data=None, message=MSG_DELETED)
