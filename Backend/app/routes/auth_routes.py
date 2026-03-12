from datetime import timedelta, timezone
from app.config import now_utc
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from app import schemas, models, auth
from app.database import get_db
from app.logger import get_logger
from app.models import UserRole
from app.response import (
    success_response,
    MSG_REGISTER_SUCCESS,
    MSG_LOGIN_SUCCESS,
    MSG_LOGOUT_SUCCESS,
    MSG_REFRESH_SUCCESS,
    MSG_FETCHED,
    MSG_PROFILE_UPDATED,
)

logger = get_logger(__name__)

router = APIRouter(tags=["Auth"])


@router.post("/register")
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    logger.info(f"Registration attempt for username: {user.username}")

    if db.query(models.User).filter(models.User.username == user.username).first():
        logger.warning(
            f"Registration failed - username already exists: {user.username}"
        )
        raise HTTPException(status_code=400, detail="Username already exists")

    try:
        trial_ends_at = now_utc() + timedelta(days=60)
        new_user = models.User(
            username=user.username,
            fullname=user.fullname,
            email=user.email,
            phone=user.phone,
            user_type=UserRole.admin,
            password=auth.hash_password(user.password),
            organization_name=user.organization_name,
            company_url=user.company_url,
            trial_ends_at=trial_ends_at,
        )
        db.add(new_user)
        db.commit()

        logger.info(
            f"User registered successfully: {user.username} (ID: {new_user.id})"
        )
        from app.logger import log_business_event

        log_business_event(
            "user_registration",
            str(new_user.id),
            {
                "username": user.username,
                "email": user.email,
                "user_type": new_user.user_type.value,
            },
        )

        return success_response(data=None, message=MSG_REGISTER_SUCCESS)
    except Exception as e:
        logger.error(f"Registration failed for {user.username}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Registration failed")


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    logger.info(f"Login attempt for email: {form_data.username}")

    user = (
        db.query(models.User)
        .filter(models.User.email == form_data.username)
        .filter(models.User.deleted_at.is_(None))
        .filter(models.User.is_active == True)
        .first()
    )
    if not user or not auth.verify_password(form_data.password, user.password):
        logger.warning(
            f"Login failed - invalid credentials for email: {form_data.username}"
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    try:
        access_token = auth.create_access_token({"sub": user.username}, db)
        refresh_token = auth.create_refresh_token({"sub": user.username}, db)

        logger.info(f"User logged in successfully: {user.username} (ID: {user.id})")
        from app.logger import log_business_event

        log_business_event(
            "user_login",
            str(user.id),
            {"username": user.username, "user_type": user.user_type.value if hasattr(user.user_type, "value") else user.user_type},
        )

        # Return user details along with tokens
        user_type_str = user.user_type.value if hasattr(user.user_type, "value") else user.user_type
        user_data = {
            "id": user.id,
            "username": user.username,
            "fullname": user.fullname,
            "email": user.email,
            "phone": user.phone,
            "user_type": user_type_str,
            "organization_name": user.organization_name,
            "company_url": user.company_url,
            "created_at": user.created_at.replace(tzinfo=timezone.utc).isoformat() if getattr(user, "created_at", None) else None,
            "updated_at": user.updated_at.replace(tzinfo=timezone.utc).isoformat() if getattr(user, "updated_at", None) else None,
            "is_active": getattr(user, "is_active", True),
            "trial_ends_at": user.trial_ends_at.replace(tzinfo=timezone.utc).isoformat() if getattr(user, "trial_ends_at", None) else None,
        }

        return success_response(
            data={
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": user_data,
            },
            message=MSG_LOGIN_SUCCESS,
        )
    except Exception as e:
        logger.error(f"Login failed for {form_data.username}: {e}")
        raise HTTPException(status_code=500, detail="Login failed")


@router.post("/refresh")
def refresh_token(body: schemas.TokenRefresh, db: Session = Depends(get_db)):
    payload = auth.decode_token(body.refresh_token)
    if not payload or auth.get_token_type(body.refresh_token) != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if auth.is_blacklisted(payload.get("jti"), db):
        raise HTTPException(status_code=401, detail="Token has been blacklisted")
    access_token = auth.create_access_token({"sub": payload["sub"]}, db)
    new_refresh_token = auth.create_refresh_token({"sub": payload["sub"]}, db)
    return success_response(
        data={"access_token": access_token, "refresh_token": new_refresh_token},
        message=MSG_REFRESH_SUCCESS,
    )


@router.post("/logout")
def logout(body: schemas.TokenLogout, db: Session = Depends(get_db)):
    payload = auth.decode_token(body.refresh_token)
    if not payload:
        raise HTTPException(status_code=400, detail="Invalid refresh token")
    auth.blacklist_token(body.refresh_token, db)
    return success_response(data=None, message=MSG_LOGOUT_SUCCESS)


@router.get("/profile")
def get_user_profile(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Get user profile"""
    user_type_str = current_user.user_type.value if hasattr(current_user.user_type, "value") else current_user.user_type
    profile = schemas.UserProfileResponse(
        id=current_user.id,
        username=current_user.username,
        fullname=current_user.fullname,
        email=current_user.email,
        phone=current_user.phone,
        user_type=user_type_str,
        organization_name=getattr(current_user, "organization_name", None),
        company_url=getattr(current_user, "company_url", None),
        created_at=getattr(current_user, "created_at", None),
        updated_at=getattr(current_user, "updated_at", None),
        is_active=getattr(current_user, "is_active", True),
        trial_ends_at=getattr(current_user, "trial_ends_at", None),
    )
    return success_response(data=profile.model_dump(), message=MSG_FETCHED)


@router.patch("/profile")
def update_user_profile(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Update user profile information"""
    logger.info(f"Profile update attempt for user: {current_user.username}")

    try:
        # Check if email is being updated and if it already exists
        if user_update.email and user_update.email != current_user.email:
            existing_user = (
                db.query(models.User)
                .filter(
                    models.User.email == user_update.email,
                    models.User.id != current_user.id,
                )
                .first()
            )
            if existing_user:
                logger.warning(
                    f"Profile update failed - email already exists: {user_update.email}"
                )
                raise HTTPException(status_code=400, detail="Email already exists")

        # Update fields if provided
        if user_update.fullname is not None:
            current_user.fullname = user_update.fullname
        if user_update.email is not None:
            current_user.email = user_update.email
        if user_update.phone is not None:
            current_user.phone = user_update.phone
        if user_update.password is not None:
            current_user.password = auth.hash_password(user_update.password)
        if user_update.organization_name is not None:
            current_user.organization_name = user_update.organization_name
        if user_update.company_url is not None:
            current_user.company_url = user_update.company_url
        if user_update.is_active is not None:
            current_user.is_active = user_update.is_active

        db.commit()

        logger.info(f"Profile updated successfully for user: {current_user.username}")
        from app.logger import log_business_event

        log_business_event(
            "profile_update",
            str(current_user.id),
            {
                "username": current_user.username,
                "updated_fields": [
                    k for k, v in user_update.model_dump().items() if v is not None
                ],
            },
        )

        return success_response(data=None, message=MSG_PROFILE_UPDATED)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update failed for {current_user.username}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Profile update failed")
