# TruthLayer · AI Fact-Check Workspace

[Original repository](https://github.com/Fahed1401/Fact-Check-Agent) · React + TypeScript + FastAPI + Groq + DDGS · Portfolio-ready upgrade

**TruthLayer** is an evidence-first fact-checking application for marketing documents, reports and editorial copy. Upload a PDF or paste text, extract checkable factual propositions, retrieve current web-search snippets with their source URLs, and review a structured audit with four verdicts, explanations and suggested corrections.

> **Important:** This is an AI-assisted *preliminary evidence review*. Search snippets are not definitive proof. Source links should be checked manually, and no result should be treated as a formal certification of truth. The sample report is illustrative, not a live analysis.

## What's new in v2

- Dedicated responsive **React + TypeScript** workspace with light/dark modes and mobile navigation
- Polished dashboard with **PDF upload**, drag/drop, **paste text**, status filtering, search and summary cards
- Expanded verdict taxonomy: **Verified / Inaccurate / False / Unverified**
- Clickable **web sources**, source indexes, proposed corrections and clear uncertainty labels
- **CSV and JSON** audit exports
- **FastAPI** service with structured Pydantic responses, input validation and documented endpoints
- Groq key stays on the **server**, not in the browser or a process-wide session variable
- 4 MB PDF limit for Vercel Functions, 25-page limit, 30,000-character analysis cap (with explicit warnings), maximum 15 claims
- Basic per-IP, per-process hourly rate limiting (12 analyses/hour)
- Optional **Streamlit compatibility entry point** (`app.py`) for the original hosting setup
- Offline **pytest** suite; CI workflow for backend tests and frontend build

## Architecture

```text
Browser (React/Vite/TypeScript)
       | POST /api/analyze/pdf or /api/analyze/text
       v
FastAPI (backend/main.py)
       |
       +-- pypdf extraction / input validation
       +-- Groq Chat Completions -> JSON claim list
       +-- ddgs metasearch -> source title, URL, snippet
       +-- Groq Chat Completions -> structured evidence assessment
       |
       v
Report JSON -> frontend dashboard -> CSV/JSON export
```

Only the uploaded content and relevant snippets are sent to Groq; the app does not save reports or uploads to a database. **Do not process regulated or confidential documents on an untrusted public deployment.** The model and search-provider privacy policies still apply.

## Setup: local macOS / Linux

Requires **Python 3.10+**, **Node.js 20+**, and a Groq API key from [Groq Console](https://console.groq.com/keys).

```bash
# Clone the real repository URL (the prior README used the wrong repo name)
git clone https://github.com/Fahed1401/Fact-Check-Agent.git
cd Fact-Check-Agent

# Add/replace the files in this upgrade package before continuing.
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

cp .env.example .env
# Edit .env with GROQ_API_KEY (NEVER commit this file)
set -a; source .env; set +a
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

In a **second terminal**:

```bash
cd Fact-Check-Agent/frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite development proxy sends `/api` to `127.0.0.1:8000`.

Backend health: **http://127.0.0.1:8000/api/health** · OpenAPI docs: **http://127.0.0.1:8000/api/docs**.

For **Windows**, create/activate with `py -m venv .venv` and `.venv\Scripts\activate`, then set environment variables in PowerShell (`$env:GROQ_API_KEY='...'`) instead of sourcing `.env`.

### Streamlit fallback / existing deployed link

To retain the existing [Streamlit interface](https://fact-check-agent-uni.streamlit.app):

```bash
pip install -r requirements.txt
streamlit run app.py
```

Either set `GROQ_API_KEY` in the Streamlit host's secret/environment settings or enter a key in the Streamlit sidebar for an individual request. The individual key is passed as a function argument, **not** written into global `os.environ`.

The Streamlit view is an optional compatibility UI; the **React site** is the recommended portfolio-facing frontend.

## Deploy both frontend and FastAPI on Vercel (one project)

**Vercel Services** in the root `vercel.json` routes `/api/*` to FastAPI and all other requests to Vite/React. The backend is **not** a static site, so deploy from the **repository root** (do **not** set Vercel Root Directory to `frontend`).

1. On your Mac, run backend tests (`python -m pytest -q backend/tests`) and frontend build (`cd frontend && npm install && npm run build && cd ..`).
2. Commit all application files and `vercel.json` on the current feature branch, then push the branch.
3. Merge the branch into `main` via GitHub Pull Request, or locally (`git switch main && git pull --ff-only origin main && git merge feature/truthlayer-v2 && git push origin main`).
4. In Vercel, **Add New > Project**, import **Fahed1401/Fact-Check-Agent**, select **Root Directory: `./`**. `vercel.json` configures the two services. **Do not override** the build/output settings at the project level.
5. In **Settings > Environment Variables**, add `GROQ_API_KEY` with the real secret and optionally `GROQ_MODEL=llama-3.3-70b-versatile`. Leave `VITE_API_URL` **unset** so the browser calls relative `/api` routes on the same domain. Cross-origin CORS is unnecessary for this deployment.
6. Deploy, then visit `https://YOUR-PROJECT.vercel.app/api/health`, which must return `configured:true`. Visit `/api/docs` for API reference and `/` for the React UI.
7. Test a 60+ character text fact check and a text-based PDF under 4 MB. Check **Vercel Runtime Logs** for failed AI/web-search requests.

**Platform caveats:** Vercel Functions currently have a 4.5 MB request/response payload cap, so this version enforces 4 MB PDFs. Function duration is plan-limited; large 15-claim audits may exceed it. For portfolio demos, prefer 3–5 claims. Production usage requires distributed rate limits, access control, usage monitoring and bot mitigation; the built-in rate limiter is per process and not sufficient to protect a publicly funded Groq key. Vercel Services is still in beta; if unavailable for your account or workspace, fall back to deploying `frontend/` on Vercel and `backend/` to Render/Railway as described in the previous release.

## Tests

```bash
# Backend, fully offline: no real API keys or internet needed
pip install -r backend/requirements.txt pytest pytest-asyncio
python -m pytest -q backend/tests

# Frontend
cd frontend
npm install
npm run build
```

## API contract

| Method | Route | Payload | Returns |
|---|---|---|---|
| GET | `/api/health` | none | Basic service and key readiness |
| POST | `/api/analyze/pdf` | multipart `file`, `max_claims` (1–15) | `AnalysisReport` |
| POST | `/api/analyze/text` | JSON `text`, `name`, `max_claims` | `AnalysisReport` |

A report contains `document`, `claims`, `warnings`, `created_at`, and a UUID. Each claim includes `verdict`, `explanation`, optional `correction`, up to five `evidence` sources and `supporting_source_indexes` (1-based). No separate source credibility score is generated.

## Known limitations

- **Scanned/image-only PDFs:** no OCR; those are rejected with a clear error.
- **Search provider availability:** DDGS uses third-party sources, which may fail or rate-limit; these result in `Unverified`, not `False`.
- **LLM interpretation:** a retrieved snippet can be incomplete or biased; the model can still misclassify. Manual review is required for high-impact claims.
- **Input limits:** maximum 25 PDF pages and 30,000 extracted text characters. Longer content is intentionally truncated with a warning instead of silently dropping text.
- **No persistent account data:** there is no authentication or report history; exports are generated in the browser. Theme preference is saved locally.
- **Live services:** network behavior and provider billing must be validated with your own credentials before representing the app as fully production-ready.

## Resume project description

**TruthLayer — AI-powered Evidence Verification Platform** | React, TypeScript, FastAPI, Python, Groq API, DDGS, pypdf

- Architected a full-stack, AI-assisted document verification workflow that extracts factual claims from PDFs and text, retrieves current source-linked web evidence, and returns structured four-class verdicts.
- Developed a responsive React/TypeScript dashboard with drag-and-drop uploads, status filters, source drill-downs, dark mode, and CSV/JSON report exports.
- Improved audit reliability through schema validation, explicit unverified/error states, backend-only API credentials, bounded uploads, and offline automated tests.

Do not claim unmeasured accuracy percentages, production traffic, or user counts.

## License

The original project is MIT licensed. Preserve the original repository's `LICENSE` when applying this upgrade.
