import os
import hashlib
from typing import Optional

import chromadb
from langchain_chroma import Chroma
from langchain_community.document_loaders import (
    PyMuPDFLoader,
    CSVLoader,
    TextLoader,
    Docx2txtLoader,
    UnstructuredMarkdownLoader,
    UnstructuredRTFLoader,
    JSONLoader,
    BSHTMLLoader,
)
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import CHROMA_DIR, get_embeddings, get_embeddings_dynamic
from app.logger import get_logger

logger = get_logger(__name__)


# ─────────────────────────────────────────────
# ChromaDB — Local Vector Store
# ─────────────────────────────────────────────


def _load_document(filepath: str) -> list:
    """Select and run the appropriate loader based on file extension."""
    ext = os.path.splitext(filepath)[1].lower()
    
    if ext == ".pdf":
        return PyMuPDFLoader(filepath, extract_tables="markdown").load()
    elif ext == ".csv":
        return CSVLoader(file_path=filepath).load()
    elif ext == ".txt":
        return TextLoader(filepath, encoding="utf-8").load()
    elif ext in {".doc", ".docx"}:
        return Docx2txtLoader(filepath).load()
    elif ext == ".md":
        return UnstructuredMarkdownLoader(filepath).load()
    elif ext == ".rtf":
        return UnstructuredRTFLoader(filepath).load()
    elif ext == ".json":
        # Requires jq, so falling back to TextLoader if structural parsing isn't strictly needed
        try:
            return JSONLoader(file_path=filepath, jq_schema=".", text_content=False).load()
        except:
            return TextLoader(filepath, encoding="utf-8").load()
    elif ext == ".html":
        return BSHTMLLoader(filepath).load()
    else:
        raise ValueError(
            f"Unsupported file type: '{ext}'. Allowed: .pdf, .txt, .csv, .doc, .docx, .md, .rtf, .json, .html"
        )


def get_chroma_client() -> chromadb.PersistentClient:
    """Returns an initialized ChromaDB PersistentClient."""
    return chromadb.PersistentClient(path=CHROMA_DIR)


def get_doc_collection_name(doc_id: str) -> str:
    """
    Generate a short, safe ChromaDB collection name for a document.
    Format: doc-{doc_hash8}
    """
    doc_hash = hashlib.md5(str(doc_id).encode()).hexdigest()[:8]
    return f"doc-{doc_hash}"


def _collection_has_vectors(
    client: chromadb.PersistentClient, collection_name: str
) -> bool:
    """Safely check if a collection already has vectors in ChromaDB."""
    try:
        collection = client.get_collection(name=collection_name)
        return collection.count() > 0
    except ValueError:
        return False
    except Exception as e:
        logger.warning(f"Could not check collection stats for '{collection_name}': {e}")
        return False


def process_document(filepath: str, doc_id: str, db=None, user_id=None) -> str:
    """
    Embed a document into ChromaDB under its own collection using LangChain.
    Called when admin clicks 'Process'.

    Returns:
        namespace (str): The ChromaDB collection name where the doc was stored.
    """
    collection_name = get_doc_collection_name(doc_id)
    logger.info(f"Processing document doc={doc_id} → collection={collection_name}")

    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Document file not found at path: {filepath}")

    client = get_chroma_client()

    # Skip re-embedding if already done
    if _collection_has_vectors(client, collection_name):
        logger.info(
            f"Collection {collection_name} already has vectors — skipping re-embedding"
        )
        return collection_name

    # ── Load document (PDF or CSV) ─────────────────
    logger.info(f"Loading document from: {filepath}")
    try:
        documents = _load_document(filepath)
    except Exception as e:
        logger.error(f"Failed to load document '{filepath}': {e}")
        raise ValueError(f"Could not read document file: {e}")

    if not documents:
        raise ValueError("Document appears to be empty or unreadable")

    # ── Split into chunks ──────────────────────────
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1200,
        chunk_overlap=150,
        length_function=len,
        add_start_index=True
    )
    # text_splitter = RecursiveCharacterTextSplitter(
    #     chunk_size=1000,
    #     chunk_overlap=200,
    #     length_function=len,
    #     add_start_index=True,
    # )
    chunks = text_splitter.split_documents(documents)
    logger.info(f"Split into {len(chunks)} chunk(s) for collection: {collection_name}")

    # ── Embed and store in ChromaDB ────────────────
    try:
        embeddings = get_embeddings_dynamic(db, user_id=user_id) if db is not None else get_embeddings()
        Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
            collection_name=collection_name,
            persist_directory=CHROMA_DIR,
        )
    except Exception as e:
        logger.error(
            f"Failed to embed document into ChromaDB collection '{collection_name}': {e}"
        )
        raise

    logger.info(f"✅ Successfully embedded document into collection: {collection_name}")
    return collection_name


# Hybride Search

# def query_rag(
#     question: str,
#     namespaces: list,
#     top_k: int = 5,
#     score_threshold: float = 0.65,
#     db=None,
#     user_id=None,
# ) -> Optional[str]:
#     """
#     Query across all active admin document collections using LangChain.
#     Returns a combined context string from retrieved chunks, or None if nothing
#     relevant is found. Chunks with a relevance score below score_threshold are
#     discarded so off-topic questions trigger the configured not-found message.
#     """
#     if not namespaces:
#         logger.info("No active namespaces/collections to query")
#         return None

#     embeddings = get_embeddings_dynamic(db, user_id=user_id) if db is not None else get_embeddings()
#     client = get_chroma_client()
#     all_contexts = []

#     for namespace in namespaces:
#         try:
#             # Check collection exists and has data
#             if not _collection_has_vectors(client, namespace):
#                 logger.warning(f"Collection '{namespace}' is empty or missing, skipping")
#                 continue

#             logger.info(f"Querying collection: {namespace}")
#             vector_store = Chroma(
#                 collection_name=namespace,
#                 embedding_function=embeddings,
#                 persist_directory=CHROMA_DIR,
#             )
#             retriever = vector_store.as_retriever(
#                 search_type="mmr",
#                 search_kwargs={"k": 5,  "lambda_mult": 0.5}
#             )
#             docs = retriever.invoke(question)
#             # results = vector_store.similarity_search_with_relevance_scores(question, k=top_k)
#             # # Filter chunks below the configured relevance threshold (0.65)
#             # docs = [doc for doc, score in results if score >= score_threshold]
            
#             if docs:
#                 context = "\n\n".join(doc.page_content for doc in docs)
#                 logger.info(
#                     # f"Got {len(docs)} chunk(s) above threshold ({score_threshold}) "
#                     f"from collection '{namespace}': {context[:100]}..."
#                 )
#                 all_contexts.append(context)
#             else:
#                 logger.info(
#                     # f"No chunks met score threshold ({score_threshold}) "
#                     f"in collection: {namespace}"
#                 )

#         except Exception as e:
#             logger.error(f"Error querying collection '{namespace}': {e}")

#     if not all_contexts:
#         return None

#     if len(all_contexts) == 1:
#         return all_contexts[0]

#     combined = "\n\n---\n\n".join(all_contexts)
#     logger.info(f"Combined results from {len(all_contexts)} collection(s)")
#     return combined


# Semantic Serarch + hybrid
def query_rag(
    question: str,
    namespaces: list,
    top_k: int = 5,
    score_threshold: float = 0.65,
    db=None,
    user_id=None,
) -> Optional[str]:
    """
    Query across all active admin document collections using LangChain.
    Uses MMR (Maximal Marginal Relevance) for diverse results, then filters
    by relevance score threshold to discard off-topic chunks.
    Returns a combined context string from retrieved chunks, or None if nothing
    relevant is found.
    """
    if not namespaces:
        logger.info("No active namespaces/collections to query")
        return None

    embeddings = get_embeddings_dynamic(db, user_id=user_id) if db is not None else get_embeddings()
    client = get_chroma_client()
    all_contexts = []

    for namespace in namespaces:
        try:
            # Check collection exists and has data
            if not _collection_has_vectors(client, namespace):
                logger.warning(f"Collection '{namespace}' is empty or missing, skipping")
                continue

            logger.info(f"Querying collection: {namespace}")
            vector_store = Chroma(
                collection_name=namespace,
                embedding_function=embeddings,
                persist_directory=CHROMA_DIR,
            )

            fetch_k = top_k * 3

            # Step 1: Get relevance scores for a larger candidate pool
            scored_results = vector_store.similarity_search_with_relevance_scores(
                question, k=fetch_k
            )
            # Build a score lookup by page_content
            score_map = {doc.page_content: score for doc, score in scored_results}

            # Step 2: Use MMR on the same candidate pool for diverse results
            retriever = vector_store.as_retriever(
                search_type="mmr",
                search_kwargs={
                    "k": top_k,
                    "fetch_k": fetch_k,
                    "lambda_mult": 0.7,
                },
            )
            mmr_docs = retriever.invoke(question)

            # Step 3: Filter MMR results by relevance score threshold
            docs = [
                doc for doc in mmr_docs
                if score_map.get(doc.page_content, 0) >= score_threshold
            ]

            if docs:
                context = "\n\n".join(doc.page_content for doc in docs)
                logger.info(
                    f"Got {len(docs)} chunk(s) above threshold ({score_threshold}) "
                    f"from collection '{namespace}' (MMR filtered from {len(mmr_docs)} MMR docs, "
                    f"{len(scored_results)} candidates): {context[:100]}..."
                )
                all_contexts.append(context)
            else:
                logger.info(
                    f"No chunks met score threshold ({score_threshold}) "
                    f"after MMR in collection: {namespace} "
                    f"(MMR returned {len(mmr_docs)} docs, best score: "
                    f"{max(score_map.get(d.page_content, 0) for d in mmr_docs):.3f}"
                    f" if mmr_docs else 'n/a')"
                )

        except Exception as e:
            logger.error(f"Error querying collection '{namespace}': {e}")

    if not all_contexts:
        return None

    if len(all_contexts) == 1:
        return all_contexts[0]

    combined = "\n\n---\n\n".join(all_contexts)
    logger.info(f"Combined results from {len(all_contexts)} collection(s)")
    return combined

_DEFAULT_GENERAL_PROMPT = (
    "You are a helpful and friendly assistant. "
    "Answer the user's question clearly and concisely."
)

_DEFAULT_RAG_PROMPT = (
    "You are a professional company chatbot.\n\n"
    "Rules:\n"
    "- Answer briefly (maximum 4-5 lines).\n"
    "- Keep responses clear and simple.\n"
    "- Do not give detailed explanations.\n"
    "- Do not format in large sections.\n"
    "- Give direct answers only.\n\n"
    "User Question: {user_query}\n\n"
    "Use the following context to answer the user question above:\n{rag_context}"
)


def build_rag_system_message(
    rag_context: Optional[str],
    has_active_docs: bool,
    rag_prompt: Optional[str] = None,
    general_prompt: Optional[str] = None,
    user_query: Optional[str] = None,
) -> str:
    """
    Build the system message for the chat route.

    Args:
        rag_context: Retrieved document context (None when no docs active).
        has_active_docs: True when there are active RAG documents.
        rag_prompt: Custom RAG system prompt from DB (supports {rag_context} and
                    {user_query} placeholders). Falls back to _DEFAULT_RAG_PROMPT when None.
        general_prompt: Custom general assistant prompt from DB.
                        Falls back to _DEFAULT_GENERAL_PROMPT when None.
        user_query: The original user question to embed in the RAG prompt.
    """
    if not has_active_docs:
        return general_prompt or _DEFAULT_GENERAL_PROMPT

    # has_active_docs and rag_context is not None (caller ensures this)
    template = rag_prompt or _DEFAULT_RAG_PROMPT
    result = template.replace("{rag_context}", rag_context or "")
    result = result.replace("{user_query}", user_query or "")
    return result


def delete_document_collection(collection_name: str) -> None:
    """Safely delete a ChromaDB collection when a document is deleted."""
    try:
        if not collection_name:
            return
        client = get_chroma_client()
        client.delete_collection(name=collection_name)
        logger.info(f"Deleted ChromaDB collection: {collection_name}")
    except ValueError:
        logger.warning(f"Collection '{collection_name}' does not exist, ignoring delete")
    except Exception as e:
        logger.error(f"Error deleting collection '{collection_name}': {e}")
