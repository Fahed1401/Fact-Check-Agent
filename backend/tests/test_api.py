from datetime import datetime, timezone
from fastapi.testclient import TestClient
from backend import main
from backend.schemas import AnalysisReport, DocumentInfo

client = TestClient(main.app)


def setup_function():
    main._requests.clear()


def test_health_check(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "fake-key")
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.json()['configured'] is True


def test_text_minimum_length_is_enforced():
    response = client.post('/api/analyze/text', json={"text": "too short"})
    assert response.status_code == 422


def test_invalid_pdf_rejected():
    response = client.post('/api/analyze/pdf', files={"file": ("test.pdf", b"invalid pdf", "application/pdf")})
    assert response.status_code == 415


def test_non_pdf_extension_rejected():
    response = client.post('/api/analyze/pdf', files={"file": ("test.txt", b"hello", "text/plain")})
    assert response.status_code == 415


def test_text_endpoint_with_mocked_engine(monkeypatch):
    async def fake_analyze(*args, **kwargs):
        return AnalysisReport(id="mock-report", created_at=datetime.now(timezone.utc), document=DocumentInfo(name=kwargs['name'], characters_analyzed=65), claims=[])
    monkeypatch.setattr(main, 'analyze_document', fake_analyze)
    response = client.post('/api/analyze/text', json={"text": "The Earth's atmosphere consists mostly of nitrogen and oxygen.", "max_claims": 5})
    assert response.status_code == 200
    assert response.json()['id'] == 'mock-report'
