from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.config import now_utc, UTC
from urllib.parse import urlparse
from app.database import get_db
from app import models
from app.logger import get_logger

logger = get_logger(__name__)


def verify_widget_access(
    request: Request,
    token: str,
    db: Session = Depends(get_db)
) -> models.WidgetConfig:
    """
    Validates the widget token, checks domain restriction, and checks for active subscription/trial.
    Returns the WidgetConfig if valid, raises HTTPException if not.
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Widget token is required",
        )

    # 1. Look up the WidgetConfig by the public token
    config = db.query(models.WidgetConfig).filter(
        models.WidgetConfig.widget_token == token,
        models.WidgetConfig.is_active == True
    ).first()

    if not config:
        logger.warning(f"Widget token not found or inactive: {token}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Widget not found or inactive"
        )

    # 2. Look up the Admin User who owns this widget
    user = db.query(models.User).filter(models.User.id == config.user_id).first()
    
    if not user or not user.is_active:
        logger.warning(f"Widget owned by inactive user: {config.user_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Account inactive"
        )

    # 3. Check Subscription / Free Trial Expiration
    if user.trial_ends_at and now_utc() > user.trial_ends_at.replace(tzinfo=UTC):
        logger.warning(f"Widget trial expired for user: {config.user_id}")
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED, 
            detail="Subscription or Free Trial has expired."
        )

    # 4. Check Domain Match
    # Extract domain from Origin or Referer header
    origin = request.headers.get("origin") or request.headers.get("referer")
    if origin and user.company_url:
        request_domain = urlparse(origin).netloc
        registered_domain = urlparse(user.company_url).netloc or user.company_url
        
        # Strip 'www.' for a safer comparison
        req_domain_clean = request_domain.replace("www.", "").lower()
        reg_domain_clean = registered_domain.replace("www.", "").lower()
        
        # Be slightly liberal to allow subdomains if needed, or exact match
        if req_domain_clean != reg_domain_clean and not req_domain_clean.endswith(f".{reg_domain_clean}"):
            logger.warning(f"Domain mismatch for {user.id}. Request: {req_domain_clean}, Registered: {reg_domain_clean}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized domain"
            )

    return config
