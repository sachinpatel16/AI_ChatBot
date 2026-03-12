import uuid
import enum
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    Boolean,
    Integer,
    Float,
    Text,
    JSON,
    Enum,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from app.config import now_utc
from app.database import Base


class UserRole(enum.Enum):
    admin = "admin"
    super_admin = "super_admin"

class ChatStatus(enum.Enum):
    ANSWERED = "ANSWERED"
    UNANSWERED = "UNANSWERED"
    ERROR = "ERROR"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, index=True)
    fullname = Column(String)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    user_type = Column(Enum(UserRole), default=UserRole.admin, nullable=False)
    password = Column(String)
    organization_name = Column(String, nullable=True)
    company_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)
    deleted_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    trial_ends_at = Column(DateTime, nullable=True)
    documents = relationship("Document", back_populates="owner")


class OutstandingToken(Base):
    __tablename__ = "outstanding_tokens"
    jti = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    token_type = Column(String)
    created_at = Column(DateTime, default=now_utc)
    user = relationship("User")


class BlacklistToken(Base):
    __tablename__ = "blacklist_tokens"
    jti = Column(String, primary_key=True, index=True)
    blacklisted_at = Column(DateTime, default=now_utc)


class Document(Base):
    """Admin-managed documents used for RAG-based public chatbot."""

    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String)
    path = Column(String)
    user_id = Column(String, ForeignKey("users.id"))  # admin who uploaded
    owner = relationship("User", back_populates="documents")

    # RAG pipeline fields
    is_processed = Column(Boolean, default=False)  # True once embedded into ChromaDB
    is_active = Column(Boolean, default=False)  # True = included in public chat RAG
    vector_namespace = Column(String, nullable=True)  # ChromaDB collection name
    status = Column(String, default="pending")  # "pending", "processing", "completed", "failed"
    error_message = Column(Text, nullable=True)  # Stores failure reason if any

    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)


class MasterSetting(Base):
    """Key-value store for API keys and other admin-managed settings."""

    __tablename__ = "master_settings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    name = Column(String, index=True, nullable=False)
    value = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)

    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='uix_user_setting_name'),
    )


DEFAULT_RAG_SYSTEM_PROMPT = (
    "You are a professional company chatbot.\n\n"
    "Rules:\n"
    "- Answer briefly (maximum 4-5 lines).\n"
    "- Keep responses clear and simple.\n"
    "- Do not give detailed explanations.\n"
    "- Do not format in large sections.\n"
    "- Give direct answers only.\n\n"
    "Use this context to answer:\n{rag_context}"
)

DEFAULT_GENERAL_SYSTEM_PROMPT = (
    "You are a helpful and friendly assistant. "
    "Answer the user's question clearly and concisely."
)

DEFAULT_RAG_NOT_FOUND_MESSAGE = (
    "I'm sorry, I couldn't find relevant information about that in our documents. "
    "Please try rephrasing your question, or contact our support team for assistance."
)


class WidgetConfig(Base):
    """Single-active-row configuration for the embeddable chat widget."""

    __tablename__ = "widget_configs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    widget_token = Column(String, default=lambda: str(uuid.uuid4()), unique=True, index=True)
    bot_name = Column(String, default="Customer Support", nullable=False)
    welcome_message = Column(String, default="Hi! How can we help?", nullable=False)
    primary_color = Column(String, default="#7c3aed", nullable=False)
    button_position = Column(String, default="bottom-right", nullable=False)
    quick_replies = Column(
        JSON, default=lambda: ["I have a question", "Tell me more"], nullable=False
    )
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)


class AIConfig(Base):
    """Single-active-row configuration for the AI chatbot model and prompts."""

    __tablename__ = "ai_config"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    model_name = Column(String, default="claude-sonnet-4-5-20250929", nullable=False)
    model_provider = Column(
        String, default="anthropic", nullable=False
    )  # "openai" | "anthropic"
    max_tokens = Column(Integer, default=1000)
    temperature = Column(Float, default=0.7)
    rag_system_prompt = Column(Text, default=DEFAULT_RAG_SYSTEM_PROMPT)
    general_system_prompt = Column(Text, default=DEFAULT_GENERAL_SYSTEM_PROMPT)
    rag_not_found_message = Column(Text, default=DEFAULT_RAG_NOT_FOUND_MESSAGE)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now_utc)
    updated_at = Column(DateTime, default=now_utc, onupdate=now_utc)


class ChatLog(Base):
    """Logs every public chatbot conversation exchange for admin analytics."""

    __tablename__ = "chat_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), index=True)  # admin who owns the widget
    session_id = Column(String, index=True, nullable=True)         # optional browser session ID
    user_message = Column(Text, nullable=False)
    bot_response = Column(Text, nullable=False)
    rag_found = Column(Boolean, default=False)  # keeping for backward compatibility
    status = Column(Enum(ChatStatus), default=ChatStatus.ANSWERED, server_default="ANSWERED", nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=now_utc, index=True)
