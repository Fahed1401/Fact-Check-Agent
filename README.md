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
```

### 2. Set Up a Virtual Environment (Recommended)
Create and activate an isolated Python environment to avoid version conflicts:
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Required Dependencies
Install the precise package architecture required by the application via `pip`:
```bash
pip install -r requirements.txt
```

### 4. Launch the Streamlit Server
Boot up the local web UI application node:
```bash
streamlit run app.py
```
Once started, the terminal will provide a local URL (typically http://localhost:8501) where you can access the interface.

## 💡 Step-by-Step Usage Guidance

Follow this workflow to audit any document using the Fact-Checker interface:

### Step 1: Obtain a Free API Access Token
1. Go to the [Groq Cloud Console](https://console.groq.com/).
2. Create a free account or log in with Google.
3. Navigate to the **API Keys** section on the left sidebar menu.
4. Click **Create API Key**, name it `Fact-Checker-Agent`, and copy the generated key string (starts with `gsk_`).

### Step 2: Configure the UI Environment
1. Open the live app link or your local deployment page.
2. Locate the secure input box labeled **"Enter Groq API Key to proceed"**.
3. Paste your copied token. The UI automatically handles string formatting and masks the characters safely (`••••••••`) to protect data privacy.

### Step 3: Upload and Analyze Target Documents
1. Drag and drop or click to upload any commercial report, business proposal, or marketing brief in **PDF** format.
2. The agent will automatically trigger the underlying ML microservices, **extracting** text fragments into absolute, context-filled sentences, and **querying** live engines globally across the internet loop.

### Step 4: Evaluate Verification Results
1. View the **Verification Results** dashboard directly beneath the file uploader.
2. Click on any claim's dropdown container to expand the detailed analytical card.
3. Review the color-coded feedback flag (Green for Verified, Yellow for Inaccurate, Red for False) alongside the exact real-time web rationale captured by the agent.

---

## ⚠️ Notes for Evaluators

* **Runtime API Architecture:** For compliance with secure development best practices, the application requires the evaluator's Groq key at runtime. This architectural choice prevents public repository key-exposure/revocation and guarantees individual API rate-limit isolation during simultaneous multi-user grading.
* **Robust Wrapper-Bypass:** The underlying code uses a custom error-handling layer built on the raw `ddgs` protocol to bypass known environment initialization errors inside Dockerized Streamlit instances.
