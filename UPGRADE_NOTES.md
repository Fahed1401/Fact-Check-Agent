# Upgrade instructions for the original repository

The original GitHub repository contains `app.py`, `requirements.txt`, `README.md` and `LICENSE`. This package is a **drop-in upgrade**, not an automatically pushed commit. It replaces the first three files, retains the original MIT attribution in LICENSE, and adds `backend/`, `frontend/`, tests, CI and config files.

## Safest method to update your local clone

1. Download the ZIP provided with this response and unzip it.
2. In Terminal, run:

```bash
git clone https://github.com/Fahed1401/Fact-Check-Agent.git
cd Fact-Check-Agent
git checkout -b feature/truthlayer-v2
```

3. Copy **the contents** of the extracted `Fact-Check-Agent-Upgrade` directory into the `Fact-Check-Agent` clone root, replacing conflicting files. (Do not nest the upgrade directory itself inside the repository.)
4. Review changes:

```bash
git status
git diff --stat
python3 -m compileall -q backend app.py
python3 -m pytest -q backend/tests
```

5. Install dependencies and test the website as explained in `README.md`.
6. After verifying locally, commit and publish:

```bash
git add .
git commit -m "feat: add TruthLayer React dashboard and verified API workflow"
git push -u origin feature/truthlayer-v2
```

7. On GitHub, open a Pull Request into `main`. Merge when CI passes. Update Streamlit secrets if you use the existing Streamlit deployment.

## Changes to original logic

- Removed global `os.environ['GROQ_API_KEY']` mutation based on user input.
- Replaced free-form claim lines with JSON extraction and bounded deduplication.
- Added `unverified` result so failed searches do not produce false accusations.
- Kept evidence titles, URLs and snippets instead of discarding everything except snippet bodies.
- Extracts up to 30,000 characters and warns when input was truncated.
- Added handling for empty/None page extraction, invalid PDF, encrypted PDF and image-only PDF.
- Avoids transparent exception swallowing; helpful API errors and warning markers are returned.
- Adds a fast, full-featured frontend without removing Streamlit hosting compatibility.

## Limitations of this review

The publicly readable source files were reviewed. The GitHub repository could not be cloned directly from this execution environment, so the new files were assembled as a replacement package. The backend has passing offline tests; no live Groq credentials, external search responses or hosted deployment were available to conduct live end-to-end verification. React/TypeScript source was syntax-transpiled, but `npm run build` still needs to be run after dependency installation.
