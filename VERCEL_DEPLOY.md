# TruthLayer: Vercel one-project deployment

## Project settings
- GitHub repo: `Fahed1401/Fact-Check-Agent`
- Git production branch: `main`
- Vercel Root Directory: `./` (repository root)
- `vercel.json` declares both `web` and `api` services
- `web`: Vite / React in `frontend/`, build `npm run build`, output `dist`
- `api`: FastAPI in `backend/`, entrypoint `main:app`, Python 3.12
- Routes: `/api/*` to API; every other URL to frontend

## Secret configuration
In Vercel project Settings > Environment Variables:
- `GROQ_API_KEY` — the real Groq API key (Production, and Preview only if desired)
- `GROQ_MODEL` — optional, e.g. `llama-3.3-70b-versatile`
- **Do not set** `VITE_API_URL` for this same-origin deployment
- **Do not commit** `.env` or API keys

## Smoke tests
- `GET https://<project>.vercel.app/api/health` → status ok, configured true
- `GET https://<project>.vercel.app/api/docs` → Swagger UI
- `GET https://<project>.vercel.app/` → TruthLayer React UI
- Submit text containing at least 60 characters, requesting 3–5 claims
- Upload text-based PDF smaller than 4 MB
- Check Runtime Logs if the engine reports offline, Groq rejects the key, or searches return no evidence

## Local check
Backend: `python -m uvicorn backend.main:app --reload`
Frontend: `cd frontend && npm install && npm run dev`
Tests: `python -m pytest -q backend/tests`
Build: `cd frontend && npm run build`

## Important
Python 3.11+ is required by the code; Vercel uses Python 3.12. Vercel Services is in beta. Function request payload is limited to 4.5 MB, hence the 4 MB PDF cap. Its basic in-process rate limiter is not distributed and does not protect the public API reliably. Add bot protection, edge rate limits and spend monitoring before sharing widely.
