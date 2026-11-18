"""Structured API contracts for the TruthLayer application."""
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

Verdict = Literal["verified", "inaccurate", "false", "unverified"]

class Evidence(BaseModel):
    title: str
    url: str
    snippet: str

class ClaimResult(BaseModel):
    id: str
    claim: str
    verdict: Verdict
    explanation: str
    correction: str | None = None
    evidence: list[Evidence] = Field(default_factory=list)
    supporting_source_indexes: list[int] = Field(default_factory=list)

class DocumentInfo(BaseModel):
    name: str
    pages: int | None = None
    characters_analyzed: int
    truncated: bool = False

class AnalysisReport(BaseModel):
    id: str
    created_at: datetime
    document: DocumentInfo
    claims: list[ClaimResult]
    warnings: list[str] = Field(default_factory=list)

class TextRequest(BaseModel):
    text: str = Field(min_length=60, max_length=50000)
    name: str = Field(default="Pasted content", min_length=1, max_length=120)
    max_claims: int = Field(default=10, ge=1, le=15)
