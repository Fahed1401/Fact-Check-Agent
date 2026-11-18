"""Regression tests for Groq model configuration and actionable HTTP errors."""
import httpx
import pytest
from backend import engine, main
from fastapi.testclient import TestClient


def test_current_default_model(monkeypatch):
    monkeypatch.delenv("GROQ_MODEL", raising=False)
    assert engine.configured_groq_model() == "openai/gpt-oss-120b"


def test_env_overrides_model(monkeypatch):
    monkeypatch.setenv("GROQ_MODEL", ' "openai/gpt-oss-20b" ')
    assert engine.configured_groq_model() == "openai/gpt-oss-20b"


def test_health_reports_active_model_without_key(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "private-test-key")
    monkeypatch.setenv("GROQ_MODEL", "openai/gpt-oss-120b")
    response = TestClient(main.app).get("/api/health")
    assert response.status_code == 200
    assert response.json()["model"] == "openai/gpt-oss-120b"
    assert "private-test-key" not in response.text


def test_404_message_reports_model_and_code():
    msg = engine.groq_failure_message(404, "model_not_found", "llama-3.3-70b-versatile")
    assert "HTTP 404" in msg
    assert "llama-3.3-70b-versatile" in msg
    assert "model_not_found" in msg
    assert "GROQ_MODEL=openai/gpt-oss-120b" in msg


def test_403_message_points_to_permissions():
    assert "permissions" in engine.groq_failure_message(403, "model_permission_blocked_project", "openai/gpt-oss-120b")


def test_does_not_expose_provider_message():
    request = httpx.Request("POST", engine.GROQ_ENDPOINT)
    response = httpx.Response(404, json={"error":{"code":"model_not_found","message":"secret detail"}}, request=request)
    assert engine.groq_error_code(response) == "model_not_found"
    assert "secret detail" not in engine.groq_failure_message(404, engine.groq_error_code(response), "model-id")


@pytest.mark.asyncio
async def test_real_request_path_404_is_reported(monkeypatch):
    monkeypatch.setenv("GROQ_MODEL", "old-model-id")
    original = httpx.AsyncClient

    async def responder(request: httpx.Request):
        assert request.url.path == "/openai/v1/chat/completions"
        assert __import__("json").loads(request.content)["model"] == "old-model-id"
        return httpx.Response(404, json={"error":{"code":"model_not_found","message":"unknown"}}, request=request)

    transport = httpx.MockTransport(responder)
    monkeypatch.setattr(engine.httpx, "AsyncClient", lambda **kw: original(transport=transport, **kw))
    with pytest.raises(engine.AnalysisError) as exc:
        await engine.groq_json('Respond with JSON', 'hello', 'fake-key')
    assert exc.value.status_code == 502
    assert "old-model-id" in str(exc.value)
    assert "model_not_found" in str(exc.value)
