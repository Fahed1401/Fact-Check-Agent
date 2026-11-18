"""Tests require no network access or Groq credentials."""
import asyncio
import io
from unittest.mock import AsyncMock

import pytest
from pypdf import PdfWriter
from backend import engine
from backend.schemas import Evidence


def test_rejects_non_pdf():
    with pytest.raises(engine.AnalysisError, match="not a valid PDF"):
        engine.extract_pdf(b"not a pdf")


def test_scanned_pdf_reports_ocr_required():
    pdf = PdfWriter()
    pdf.add_blank_page(width=200, height=300)
    buffer = io.BytesIO()
    pdf.write(buffer)
    with pytest.raises(engine.AnalysisError, match="require OCR"):
        engine.extract_pdf(buffer.getvalue())


def test_empty_text_rejected():
    with pytest.raises(engine.AnalysisError, match="at least 60"):
        engine.trim_text("tiny")


def test_long_text_truncated():
    text, truncated = engine.trim_text("The planet Earth orbits the Sun. " * 1500)
    assert truncated is True
    assert len(text) == engine.MAX_ANALYZED_CHARS


def test_parse_json_rejects_non_object():
    with pytest.raises(engine.AnalysisError):
        engine.parse_json_reply('["bad"]')


def test_sanitize_claims_filters_duplicates():
    payload = {"claims": ["  Jupiter is the largest planet.  ", "jupiter is the largest planet.", 3, "ok", "Venus is hotter than Mercury."]}
    assert engine.sanitize_claims(payload, 10) == ["Jupiter is the largest planet.", "Venus is hotter than Mercury."]


@pytest.mark.asyncio
async def test_no_web_data_is_unverified(monkeypatch):
    monkeypatch.setattr(engine, "search_web", AsyncMock(return_value=([], "Search failed")))
    claim, warning = await engine.verify_one("The Earth has one Moon.", "test-key", asyncio.Semaphore(2))
    assert claim.verdict == "unverified"
    assert warning == "Search failed"
    assert not claim.evidence


@pytest.mark.asyncio
async def test_unreferenced_llm_verdict_downgraded(monkeypatch):
    sample = Evidence(title="NASA", url="https://science.nasa.gov/", snippet="Earth has one Moon")
    monkeypatch.setattr(engine, "search_web", AsyncMock(return_value=([sample], None)))
    monkeypatch.setattr(engine, "groq_json", AsyncMock(return_value={
        "verdict": "verified", "explanation": "A supporting claim", "correction": None,
        "supporting_source_indexes": [],
    }))
    claim, _ = await engine.verify_one("Earth has one moon", "fake-key", asyncio.Semaphore(2))
    assert claim.verdict == "unverified"


@pytest.mark.asyncio
async def test_end_to_end_pipeline_using_mocks(monkeypatch):
    responses = [
        {"claims": ["The planet Venus is extremely hot.", "Pluto is a dwarf planet."]},
        {"verdict": "verified", "explanation": "Source supports it", "correction": None, "supporting_source_indexes": [1]},
        {"verdict": "unverified", "explanation": "Insufficient source", "correction": None, "supporting_source_indexes": []},
    ]
    async def mock_groq(*_args):
        return responses.pop(0)
    sample = Evidence(title="NASA", url="https://science.nasa.gov", snippet="Planetary data")
    monkeypatch.setattr(engine, "groq_json", mock_groq)
    monkeypatch.setattr(engine, "search_web", AsyncMock(return_value=([sample], None)))
    report = await engine.analyze_document("The planet Venus is extremely hot and Pluto is a dwarf planet. " * 2, api_key="fake-key")
    assert len(report.claims) == 2
    assert report.claims[0].verdict == "verified"
    assert report.claims[1].verdict == "unverified"
    assert report.document.characters_analyzed > 60
