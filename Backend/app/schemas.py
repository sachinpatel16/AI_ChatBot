from pydantic import BaseModel, field_serializer
from typing import Optional, List
from datetime import datetime, timezone


# ── Helper ─────────────────────────────────────────────────────────────────────

def _utc_iso(dt: datetime | None) -> str | None:
    """Ensure the datetime is UTC-aware and return an ISO-8601 string with +00:00.
    Naive datetimes (stored by the DB) are treated as UTC.
    The FRONTEND is responsible for converting UTC → IST for display.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)  # treat naive DB value as UTC
    return dt.astimezone(timezone.utc).isoformat()


# ── Auth / User schemas ────────────────────────────────────────────────────────


class UserCreate(BaseModel):
    username: str
    fullname: Optional[str] = None
    email: str
    phone: Optional[str] = None
    password: str
    organization_name: Optional[str] = None
    company_url: Optional[str] = None


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: dict


class TokenRefresh(BaseModel):
    refresh_token: str


class TokenLogout(BaseModel):
    refresh_token: str


class UserProfileResponse(BaseModel):
    id: str
    username: str
    fullname: Optional[str] = None
    email: str
    phone: Optional[str] = None
    user_type: str
    organization_name: Optional[str] = None
    company_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    is_active: bool = True
    trial_ends_at: Optional[datetime] = None

    @field_serializer("created_at", "updated_at", "trial_ends_at")
    def serialize_dt(self, v: datetime | None) -> str | None:
        return _utc_iso(v)


class UserUpdate(BaseModel):
    fullname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    organization_name: Optional[str] = None
    company_url: Optional[str] = None
    is_active: Optional[bool] = None


# ── Chat document schemas ──────────────────────────────────────────────────────


class ChatDocumentUploadResponse(BaseModel):
    id: str
    filename: str
    is_active: bool
    is_processed: bool
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    @field_serializer("created_at")
    def serialize_dt(self, v: datetime | None) -> str | None:
        return _utc_iso(v)


class ChatDocumentResponse(BaseModel):
    id: str
    filename: str
    path: str
    is_active: bool
    is_processed: bool
    status: str
    error_message: Optional[str] = None
    vector_namespace: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @field_serializer("created_at", "updated_at")
    def serialize_dt(self, v: datetime | None) -> str | None:
        return _utc_iso(v)


class ChatDocumentActivateRequest(BaseModel):
    document_id: str


# ── Master Settings schemas ────────────────────────────────────────────────────


class MasterSettingCreate(BaseModel):
    name: str
    value: str
    is_active: bool = True


class MasterSettingUpdate(BaseModel):
    value: Optional[str] = None
    is_active: Optional[bool] = None


class MasterSettingResponse(BaseModel):
    id: str
    name: str
    value: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_serializer("created_at", "updated_at")
    def serialize_dt(self, v: datetime | None) -> str | None:
        return _utc_iso(v)


# ── AI Config schemas ──────────────────────────────────────────────────────────


class AIConfigUpdate(BaseModel):
    model_name: Optional[str] = None
    model_provider: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    rag_system_prompt: Optional[str] = None
    general_system_prompt: Optional[str] = None
    rag_not_found_message: Optional[str] = None


class AIConfigResponse(BaseModel):
    id: str
    model_name: str
    model_provider: str
    max_tokens: int
    temperature: float
    rag_system_prompt: str
    general_system_prompt: str
    rag_not_found_message: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_serializer("created_at", "updated_at")
    def serialize_dt(self, v: datetime | None) -> str | None:
        return _utc_iso(v)


# ── Widget Config schemas ──────────────────────────────────────────────────────


class WidgetConfigUpdate(BaseModel):
    bot_name: Optional[str] = None
    welcome_message: Optional[str] = None
    primary_color: Optional[str] = None
    button_position: Optional[str] = None
    quick_replies: Optional[List[str]] = None


class WidgetConfigResponse(BaseModel):
    id: str
    user_id: str
    widget_token: str
    bot_name: str
    welcome_message: str
    primary_color: str
    button_position: str
    quick_replies: List[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_serializer("created_at", "updated_at")
    def serialize_dt(self, v: datetime | None) -> str | None:
        return _utc_iso(v)


# ── Super Admin schemas ────────────────────────────────────────────────────────


class AdminUserView(BaseModel):
    id: str
    username: str
    fullname: Optional[str] = None
    email: str
    user_type: str
    organization_name: Optional[str] = None
    company_url: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    trial_ends_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @field_serializer("created_at", "trial_ends_at", "deleted_at")
    def serialize_dt(self, v: datetime | None) -> str | None:
        return _utc_iso(v)


class TrialUpdateRequest(BaseModel):
    days: int


class PlanOverviewEntry(BaseModel):
    id: str
    username: str
    email: str
    organization_name: Optional[str] = None
    is_active: bool
    trial_ends_at: Optional[datetime] = None
    trial_status: str  # "active", "expired", "no_trial"

    class Config:
        from_attributes = True

    @field_serializer("trial_ends_at")
    def serialize_dt(self, v: datetime | None) -> str | None:
        return _utc_iso(v)


# ── Chat Log schemas ───────────────────────────────────────────────────────────


class ChatLogResponse(BaseModel):
    id: str
    user_id: str
    session_id: Optional[str] = None
    user_message: str
    bot_response: str
    rag_found: bool
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

    @field_serializer("created_at")
    def serialize_dt(self, v: datetime | None) -> str | None:
        return _utc_iso(v)


class ChatLogListResponse(BaseModel):
    items: List[ChatLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class TopKeyword(BaseModel):
    word: str
    count: int


class ChatLogStats(BaseModel):
    total_messages: int
    today_messages: int
    rag_hit_rate: float          # percentage 0-100
    top_keywords: List[TopKeyword]
