# 🛡️ Truth Layer: Automated Fact-Check Agent

An AI-powered application designed to serve as a "Truth Layer" for marketing content.

## 🚀 Overview
Marketing materials often contain hallucinated, outdated, or fabricated statistics. This tool acts as an automated defense mechanism. It extracts claims from a provided PDF document and cross-references them against live web data to verify their accuracy.

## ✨ Features
* **Automated Extraction**: Parses uploaded PDFs and uses NLP to identify core statistical, financial, and temporal claims.
* **Live Web Verification**: Bypasses traditional fragile wrappers to directly query the native DuckDuckGo API, retrieving real-time evidence from the web.
* **Intelligent Reporting**: Classifies claims into `[Verified]`, `[Inaccurate]`, or `[False]` alongside contextual justifications and the actual ground-truth facts.
* **High-Speed Inference**: Powered by Llama 3.3 70B via the Groq API for near-instantaneous reasoning and fact-checking.

## 🛠️ Tech Stack
* **Frontend UI**: Streamlit
* **LLM Orchestration**: LangChain (Core & Groq Integrations)
* **Live Search**: DuckDuckGo Search API (Native Implementation)
* **Document Parsing**: PyPDF2
* **Model**: Llama 3.3 70B (via Groq)

## 💻 How to Run Locally

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
   cd your-repo-name
