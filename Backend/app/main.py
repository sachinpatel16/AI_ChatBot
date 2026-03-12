from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from app.routes import auth_routes, chat_rout, admin_rout, widget_rout, super_admin_rout, logs_routes
from app.database import Base, engine
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.logger import get_logger
from app.middleware import LoggingMiddleware, ErrorHandlingMiddleware
from app.response import MSG_INTERNAL_ERROR

logger = get_logger(__name__)


def _error_envelope(message: str, data=None):
    return {"success": False, "message": message, "data": data}


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application started.")
    yield
    logger.info("Application stopped.")


Base.metadata.create_all(bind=engine)

app = FastAPI(lifespan=lifespan, title="RAG Chatbot API")


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Format HTTPException as standard envelope: { success: false, message, data }."""
    detail = exc.detail
    if isinstance(detail, str):
        message = detail
        data = None
    elif isinstance(detail, (list, dict)):
        message = "Validation error" if isinstance(detail, list) else "Error"
        data = detail
    else:
        message = str(detail)
        data = None
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_envelope(message=message, data=data),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Catch-all: return 500 in standard envelope and log the real error."""
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content=_error_envelope(message=MSG_INTERNAL_ERROR, data=None),
    )


# Add middleware
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(LoggingMiddleware)

# Include routers
app.include_router(auth_routes.router)
app.include_router(chat_rout.router)
app.include_router(admin_rout.router)
app.include_router(widget_rout.router)
app.include_router(super_admin_rout.router)
app.include_router(logs_routes.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
