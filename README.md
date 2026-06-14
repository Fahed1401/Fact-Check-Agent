# 🛡️ Truth Layer: Automated Fact-Check Agent

An AI-powered application designed to serve as a "Truth Layer" for marketing content. Built for the CogCulture Product Management Trainee Assessment.

## Features
* **Extraction**: Parses uploaded PDFs and uses NLP to identify core statistical, financial, and temporal claims.
* **Verification**: Cross-references identified claims dynamically against live web data using DuckDuckGo Search.
* **Reporting**: Classifies claims into `[Verified]`, `[Inaccurate]`, or `[False]` alongside contextual justifications.

## Tech Stack
* **Frontend**: Streamlit
* **LLM Orchestration**: LangChain, OpenAI GPT-3.5
* **Live Search**: DuckDuckGoSearchRun
* **Parsing**: PyPDF2

## How to Run Locally
1. Clone the repository.
2. Install dependencies: `pip install -r requirements.txt`
3. Run the app: `streamlit run app.py`
4. Enter your OpenAI API key in the UI to begin verification.
