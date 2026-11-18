"""FastAPI endpoints for the React application."""
from __future__ import annotations
import asyncio
import os
import time
from collections import defaultdict, deque

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

if __package__:
    from .engine import AnalysisError, MAX_PDF_BYTES, analyze_document, extract_pdf, configured_groq_model
    from .schemas import AnalysisReport, TextRequest
else:
    from engine import AnalysisError, MAX_PDF_BYTES, analyze_document, extract_pdf, configured_groq_model
    from schemas import AnalysisReport, TextRequest

app = FastAPI(title="TruthLayer API", version="2.0.0", docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)
origins = [v.strip() for v in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if v.strip()]
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=False,
    allow_methods=["GET", "POST"], allow_headers=["Content-Type"],
)

# Lightweight, process-local abuse protection. Use gateway rate limiting in production.
_requests: dict[str, deque[float]] = defaultdict(deque)
_lock = asyncio.Lock()


async def check_limit(request: Request) -> None:
    address = request.client.host if request.client else "unknown"
    async with _lock:
        now = time.monotonic()
        hits = _requests[address]
        while hits and now - hits[0] > 3600:
            hits.popleft()
        if len(hits) >= 12:
            raise HTTPException(status_code=429, detail="Hourly analysis limit reached. Try again later.")
        hits.append(now)


@app.exception_handler(AnalysisError)
async def analysis_error_handler(_: Request, exc: AnalysisError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": str(exc)})


@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "configured": bool(os.getenv("GROQ_API_KEY")), "model": configured_groq_model(), "version": "2.2.0"}


@app.post("/api/analyze/text", response_model=AnalysisReport)
async def analyze_text(payload: TextRequest, request: Request):
    await check_limit(request)
    return await analyze_document(payload.text, name=payload.name, max_claims=payload.max_claims)


@app.post("/api/analyze/pdf", response_model=AnalysisReport)
async def analyze_pdf(request: Request, file: UploadFile = File(...), max_claims: int = Form(10)):
    await check_limit(request)
    if not 1 <= max_claims <= 15:
        raise HTTPException(status_code=422, detail="max_claims must be between 1 and 15.")
    filename = (file.filename or "Document.pdf").strip()[:120]
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Only PDF documents are accepted.")
    blob = await file.read(MAX_PDF_BYTES + 1)
    await file.close()
    if len(blob) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="PDF exceeds the 4 MB limit.")
    text, pages, truncated = await asyncio.to_thread(extract_pdf, blob)
    return await analyze_document(text, name=filename, pages=pages, truncated=truncated, max_claims=max_claims)
