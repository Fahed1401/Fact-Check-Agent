# 🛡️ Truth Layer: Automated Fact-Check Agent

An AI-powered application designed to serve as an automated "Truth Layer" for marketing assets, whitepapers, and business documents. This web application extracts granular factual claims from uploaded PDFs and dynamically cross-references them against live web data to flag hallucinations, outdated statistics, and inaccuracies in real time.

Built as part of the Product Management Trainee assessment for CogCulture.

## 🚀 Live Demo & Repository
* **Deployed App Link:** `https://fact-check-agent-uni.streamlit.app`
* **GitHub Repository:** `https://github.com/Fahed1401/Fact-Checker-Agent`

---

## ✨ Key Features

* **Universal Contextual Extraction:** Uses advanced prompt engineering to transform fragmented PDF text and bullet points into fully self-contained, searchable propositions while automatically resolving pronouns to their proper subjects.
* **Resilient Direct-to-Web Search:** Bypasses fragile third-party orchestration abstractions to interface directly with the native DuckDuckGo Search API (`ddgs`), entirely eliminating environment validation and Pydantic versioning errors.
* **Temporal Anchoring:** Dynamically injects the current system date into the evaluation context, resolving the "temporal blindspot" of frozen LLM training cutoffs and ensuring accurate tracking of real-time chronological data.
* **High-Performance Inference:** Powered by **Llama 3.3 70B** via the **Groq API**, leveraging specialized Language Processing Units (LPUs) to deliver lightning-fast compliance checking at zero operational cost.
* **Granular Status Auditing:** Automatically classifies claims into three distinct operational categories:
  * 🟢 **`[Verified]`**: The claim perfectly aligns with real-time live web evidence.
  * 🟡 **`[Inaccurate]`**: The claim contains elements of truth but relies on outdated metrics or figures.
  * 🔴 **`[False]`**: The claim is flatly contradicted by online sources or lacks any reliable evidence.

---

## 🛠️ Tech Stack

* **Frontend Interface:** Streamlit (v1.58.0)
* **LLM Orchestration:** LangChain Core & LangChain Groq (utilizing modern LangChain Expression Language / LCEL pipes)
* **Inference Engine:** Groq Cloud Console (`llama-3.3-70b-versatile`)
* **Live Search Utility:** Native `ddgs` Python client
* **Document Parsing Engine:** PyPDF2

---

## 💻 How to Run the Agent Locally

Follow these step-by-step instructions to set up the environment and run the application on your local machine:

### 1. Clone the Repository
Open your terminal or command prompt and clone the project directory:
```bash
git clone [https://github.com/Fahed1401/Fact-Checker-Agent.git](https://github.com/Fahed1401/Fact-Checker-Agent.git)
cd Fact-Checker-Agent
