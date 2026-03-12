from datetime import timedelta
from app.config import now_utc, UTC

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, auth
from app.models import UserRole
from app.logger import get_logger
from app.response import success_response, MSG_FETCHED, MSG_UPDATED
from app.schemas import AdminUserView, TrialUpdateRequest, PlanOverviewEntry

logger = get_logger(__name__)

router = APIRouter(prefix="/super-admin", tags=["Super Admin — Platform Management"])


# ─────────────────────────────────────────────
# Super Admin Auth Dependency
# ─────────────────────────────────────────────


def get_current_super_admin(
    current_user: models.User = Depends(auth.get_current_user),
) -> models.User:
    """Ensures the authenticated user has the super_admin role."""
    role_str = (
        current_user.user_type.value
        if hasattr(current_user.user_type, "value")
        else current_user.user_type
    )
    if role_str != "super_admin":
        raise HTTPException(
            status_code=403,
            detail="Access denied. Super admin role required.",
        )
    return current_user


# ─────────────────────────────────────────────
# User / Admin Management
# ─────────────────────────────────────────────


@router.get("/users")
def list_users(
    include_deleted: bool = False,
    super_admin: models.User = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
):
    """List all registered users. Excludes soft-deleted by default."""
    query = db.query(models.User)
    if not include_deleted:
        query = query.filter(models.User.deleted_at.is_(None))
    users = query.order_by(models.User.created_at.desc()).all()
    data = [
        AdminUserView(
            id=u.id,
            username=u.username,
            fullname=u.fullname,
            email=u.email,
            user_type=u.user_type.value if hasattr(u.user_type, "value") else u.user_type,
            organization_name=u.organization_name,
            company_url=u.company_url,
            is_active=u.is_active,
            created_at=u.created_at,
            trial_ends_at=u.trial_ends_at,
            deleted_at=u.deleted_at,
        ).model_dump()
        for u in users
    ]
    return success_response(data=data, message=MSG_FETCHED)


@router.get("/users/{user_id}")
def get_user(
    user_id: str,
    super_admin: models.User = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
):
    """Get detail of a single user by ID."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    view = AdminUserView(
        id=user.id,
        username=user.username,
        fullname=user.fullname,
        email=user.email,
        user_type=user.user_type.value if hasattr(user.user_type, "value") else user.user_type,
        organization_name=user.organization_name,
        company_url=user.company_url,
        is_active=user.is_active,
        created_at=user.created_at,
        trial_ends_at=user.trial_ends_at,
        deleted_at=user.deleted_at,
    )
    return success_response(data=view.model_dump(), message=MSG_FETCHED)


@router.patch("/users/{user_id}/activate")
def activate_user(
    user_id: str,
    super_admin: models.User = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
):
    """Activate a user account."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user.is_active = True
    db.commit()
    logger.info(f"Super admin {super_admin.username} activated user {user.username}")
    return success_response(data=None, message=f"User '{user.username}' activated.")


@router.patch("/users/{user_id}/deactivate")
def deactivate_user(
    user_id: str,
    super_admin: models.User = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
):
    """Deactivate a user account (blocks login)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == super_admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account.")
    user.is_active = False
    db.commit()
    logger.info(f"Super admin {super_admin.username} deactivated user {user.username}")
    return success_response(data=None, message=f"User '{user.username}' deactivated.")


@router.delete("/users/{user_id}")
def soft_delete_user(
    user_id: str,
    super_admin: models.User = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
):
    """Soft-delete a user (sets deleted_at; user cannot log in)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == super_admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")
    if user.deleted_at is not None:
        raise HTTPException(status_code=400, detail="User is already deleted.")
    user.deleted_at = now_utc()
    user.is_active = False
    db.commit()
    logger.info(f"Super admin {super_admin.username} soft-deleted user {user.username}")
    return success_response(data=None, message=f"User '{user.username}' deleted.")


@router.patch("/users/{user_id}/trial")
def update_user_trial(
    user_id: str,
    body: TrialUpdateRequest,
    super_admin: models.User = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
):
    """Set trial_ends_at to now + N days for a user."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if body.days <= 0:
        raise HTTPException(status_code=400, detail="Days must be a positive integer.")
    user.trial_ends_at = now_utc() + timedelta(days=body.days)
    db.commit()
    logger.info(
        f"Super admin {super_admin.username} set trial for {user.username} to {user.trial_ends_at}"
    )
    return success_response(
        data={"trial_ends_at": user.trial_ends_at.isoformat()},
        message=f"Trial for '{user.username}' extended.",
    )


# ─────────────────────────────────────────────
# Plan / Subscription Overview
# ─────────────────────────────────────────────


@router.get("/plans/overview")
def plans_overview(
    super_admin: models.User = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
):
    """Overview of all users annotated with their trial status."""
    users = db.query(models.User).filter(models.User.deleted_at.is_(None)).all()
    now = now_utc()
    result = []
    for u in users:
        if u.trial_ends_at is None:
            status = "no_trial"
        elif u.trial_ends_at.replace(tzinfo=UTC) > now:
            status = "active"
        else:
            status = "expired"
        result.append(
            PlanOverviewEntry(
                id=u.id,
                username=u.username,
                email=u.email,
                organization_name=u.organization_name,
                is_active=u.is_active,
                trial_ends_at=u.trial_ends_at,
                trial_status=status,
            ).model_dump()
        )
    return success_response(data=result, message=MSG_FETCHED)
