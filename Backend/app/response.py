"""
Standard API response envelope: { "success", "message", "data" }.
Use success_response() in route handlers; errors are formatted by the global exception handler.
"""
from typing import Any, Optional

from pydantic import BaseModel


class APIResponse(BaseModel):
    """Standard envelope for all API responses (success and error)."""
    success: bool
    message: str
    data: Optional[Any] = None


# Message constants for consistent responses
MSG_FETCHED = "Data fetched successfully"
MSG_CREATED = "Resource created successfully"
MSG_UPDATED = "Resource updated successfully"
MSG_DELETED = "Resource deleted successfully"
MSG_NOT_FOUND = "Resource not found"
MSG_LOGIN_SUCCESS = "Login successful"
MSG_LOGOUT_SUCCESS = "User logged out successfully"
MSG_REGISTER_SUCCESS = "User registered successfully"
MSG_REFRESH_SUCCESS = "Token refreshed successfully"
MSG_PROFILE_UPDATED = "Profile updated successfully"
MSG_MESSAGE_SENT = "Message sent successfully"
MSG_INTERNAL_ERROR = "Internal server error"


def success_response(
    data: Any = None,
    message: str = MSG_FETCHED,
) -> dict:
    """
    Build standard success envelope: { "success": true, "message": ..., "data": ... }.
    Returns a dict suitable for FastAPI JSON response.
    """
    return {
        "success": True,
        "message": message,
        "data": data,
    }
