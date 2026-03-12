from contextvars import ContextVar

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from sqlalchemy.orm import Session
from langchain_core.messages import HumanMessage
from langchain.agents.middleware import dynamic_prompt, ModelRequest
from langchain.agents import create_agent

from app.config import get_chat_model_dynamic
from app import utils
from app.logger import get_logger
from app import models
from app.response import success_response, MSG_MESSAGE_SENT
from app.dependencies import verify_widget_access

from app.database import SessionLocal

logger = get_logger(__name__)

router = APIRouter(prefix="/chat", tags=["Public ChatBot"])

# ── ContextVar carries per-request RAG state into the middleware ──────────────
# Tuple: (rag_context: str | None, has_active_docs: bool,
#          rag_prompt: str | None, general_prompt: str | None,
#          user_query: str | None)
_current_rag_ctx: ContextVar[tuple] = ContextVar(
    "_current_rag_ctx", default=(None, False, None, None, None)
)


def _make_agent(llm):
    """Build a LangChain agent with the dynamic-prompt middleware."""

    @dynamic_prompt
    def prompt_with_context(request: ModelRequest) -> str:
        rag_context, has_active_docs, rag_prompt, general_prompt, user_query = (
            _current_rag_ctx.get()
        )
        return utils.build_rag_system_message(
            rag_context,
            has_active_docs,
            rag_prompt=rag_prompt,
            general_prompt=general_prompt,
            user_query=user_query,
        )

    return create_agent(llm, tools=[], middleware=[prompt_with_context])


# ── Shared chat pipeline (used by both /chat/public and admin /chat/test) ─────


async def run_chat_pipeline(query: str, db: Session, user_id: str | None = None) -> dict:
    """
    Stateless RAG chat pipeline. Fetches active AIConfig from DB on every call
    so changes take effect immediately without a server restart.
    No session or conversation history — every request is independent.
    """

    # ── Load AI config from DB ─────────────────────────────────────────────
    ai_config = db.query(models.AIConfig).filter_by(user_id=user_id, is_active=True).first() if user_id else None

    rag_not_found_msg = (
        ai_config.rag_not_found_message
        if ai_config
        else (
            "I'm sorry, I couldn't find relevant information about that in our documents. "
            "Please try rephrasing your question, or contact our support team for assistance."
        )
    )
    rag_prompt = ai_config.rag_system_prompt if ai_config else None
    general_prompt = ai_config.general_system_prompt if ai_config else None

    # ── Retrieve active documents ──────────────────────────────────────────
    doc_query = db.query(models.Document).filter_by(is_active=True, is_processed=True)
    if user_id:
        doc_query = doc_query.filter_by(user_id=user_id)

    active_docs = doc_query.all()
    namespaces = [doc.vector_namespace for doc in active_docs if doc.vector_namespace]
    doc_names = [doc.filename for doc in active_docs]

    # ── RAG retrieval ──────────────────────────────────────────────────────
    rag_context = None
    if namespaces:
        logger.info(f"Querying {len(namespaces)} active namespace(s)")
        rag_context = utils.query_rag(query, namespaces, db=db, user_id=user_id)

    # No RAG context — return configured not-found message
    if rag_context is None:
        logger.info("RAG found no relevant content — returning configured not-found message")
        return {
            "response": rag_not_found_msg,
            "rag_found": False,
            "documents_searched": doc_names,
            "status": "UNANSWERED",
        }

    # ── Build dynamic LLM + agent ──────────────────────────────────────────
    llm = get_chat_model_dynamic(db, user_id=user_id)
    agent = _make_agent(llm)

    # ── Set per-request RAG context for the middleware ─────────────────────
    _current_rag_ctx.set((rag_context, bool(namespaces), rag_prompt, general_prompt, query))

    # ── Single-turn: only the current user message, no history ────────────
    messages = [HumanMessage(content=query)]

    # ── Invoke agent ───────────────────────────────────────────────────────
    result = agent.invoke({"messages": messages})
    ai_reply = result["messages"][-1].content

    return {
        "response": ai_reply,
        "rag_found": bool(rag_context),
        "documents_searched": doc_names,
        "status": "ANSWERED",
    }


# ── Background log saver — fire-and-forget, NEVER blocks the response ─────────


def _save_chat_log(
    user_id: str,
    session_id: str | None,
    user_message: str,
    bot_response: str,
    rag_found: bool,
    status: str,
    error_message: str | None = None,
):
    """
    Persists a chat exchange to the chat_logs table.

    This runs as a FastAPI BackgroundTask — it is called AFTER the HTTP response
    has already been sent to the user, so it adds ZERO latency to the chat endpoint.
    Any failure here is silently logged; it never surfaces to the user.
    """
    try:
        db = SessionLocal()
        try:
            log = models.ChatLog(
                user_id=user_id,
                session_id=session_id,
                user_message=user_message,
                bot_response=bot_response,
                rag_found=rag_found,
                status=status,
                error_message=error_message,
            )
            db.add(log)
            db.commit()
            logger.info(f"Chat log saved for user_id={user_id}")
        finally:
            db.close()
    except Exception as e:
        # Never let a logging failure surface to the user
        logger.error(f"Failed to save chat log (non-critical): {e}")


# ── Public Chat Endpoint ───────────────────────────────────────────────────────


@router.post("/public")
async def public_chat(
    query: str,
    background_tasks: BackgroundTasks,
    session_id: str | None = None,
    config: models.WidgetConfig = Depends(verify_widget_access),
):
    """
    Public RAG chatbot — requires widget token.
    Queries all admin-activated documents and returns an answer immediately.
    Chat log is saved in the background AFTER the response is returned (zero latency).
    """
    logger.info(f"Public chat query: '{query}' for widget_token: {config.widget_token}")
    try:
        db = SessionLocal()
        try:
            result = await run_chat_pipeline(query=query, db=db, user_id=config.user_id)
        finally:
            db.close()

        # ── Schedule background save — response already built, user won't wait ──
        background_tasks.add_task(
            _save_chat_log,
            user_id=config.user_id,
            session_id=session_id,
            user_message=query,
            bot_response=result["response"],
            rag_found=result["rag_found"],
            status=result["status"],
            error_message=None,
        )

        logger.info("Public chat answered successfully")
        return success_response(data=result, message=MSG_MESSAGE_SENT)

    except Exception as e:
        logger.error(f"Error in public chat: {e}")
        fallback_msg = "We are experiencing high volume right now. Please try again later."
        
        background_tasks.add_task(
            _save_chat_log,
            user_id=config.user_id,
            session_id=session_id,
            user_message=query,
            bot_response=fallback_msg,
            rag_found=False,
            status="ERROR",
            error_message=str(e),
        )
        
        # Even on internal error, return 200 OK to the widget so the UI doesn't break,
        # but the response will be the graceful fallback instead.
        return success_response(
            data={"response": fallback_msg, "rag_found": False, "documents_searched": [], "status": "ERROR"},
            message="Fallback response due to internal error"
        )
