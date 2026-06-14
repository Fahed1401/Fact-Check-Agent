import streamlit as st
import PyPDF2
from datetime import datetime
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from duckduckgo_search import DDGS
import os

# Initializing Streamlit UI
st.set_page_config(page_title="Truth Layer: Automated Fact-Checker", layout="wide")
st.title("🛡️ Truth Layer: Fact-Check Agent")
st.markdown("Upload a marketing PDF. This tool extracts claims and cross-references them against the live web.")

# API Key input for evaluator
api_key = st.text_input(
    "Enter your Groq API Key:", 
    type="password", 
    help="Don't have one? Get a free key instantly at https://console.groq.com/keys"
)

def extract_text_from_pdf(pdf_file):
    reader = PyPDF2.PdfReader(pdf_file)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def extract_claims(text, llm):
    prompt = PromptTemplate(
        input_variables=["text"],
        template="""
        You are a precision data extraction tool. Analyze the following text and extract verifiable factual claims.
        
        CRITICAL EXTRACTION RULES:
        1. UNIVERSAL CONTEXT: Every claim must be a fully self-contained, standalone sentence. 
        2. NO PRONOUNS: Explicitly state the subject/entity for every claim based on the context of the text. (e.g., Instead of "It generated $5M", write "Acme Corp generated $5M").
        3. VERIFIABILITY FILTER: ONLY extract claims that can be fact-checked on the global internet (e.g., historical dates, company statistics, macroeconomic data, scientific facts). 
        4. IGNORE FLUFF: Do NOT extract internal administrative instructions, application steps, file size limits, or procedural rules.
        5. Output strictly one claim per line. No bullet points, no introductory text like "Here are the claims:".
        
        Text to analyze:
        {text}
        """
    )
    chain = prompt | llm
    response = chain.invoke({"text": text})
    return response.content

# --- CUSTOM BULLETPROOF SEARCH FUNCTION TO BYPASS THE LANGCHAIN ERROR ---
def live_web_search(query):
    try:
        with DDGS() as ddgs:
            # Fetch top 3 results directly from DDG
            results = list(ddgs.text(query, max_results=3))
            if not results:
                return "No evidence found on the web."
            # Combine the summary snippets from the search
            snippets = [res.get("body", "") for res in results]
            return " ".join(snippets)
    except Exception as e:
        return f"Could not fetch live data."

def verify_claim(claim, llm):
    # 1. Actually fetches live data from DuckDuckGo
    search_results = live_web_search(claim) 
    current_date = datetime.now().strftime("%B %d, %Y")
    
    prompt = PromptTemplate(
        input_variables=["claim", "search_results", "current_date"],
        template="""
        You are a strict, robotic fact-checking algorithm. Today's actual date is {current_date}.
        
        Your ONLY job is to compare the Claim against the Live Web Search Data.
        
        CRITICAL RULES:
        1. You must base your decision ENTIRELY on the Live Web Search Data provided below.
        2. DO NOT rely on your internal training data.
        3. DO NOT use phrases like "As an AI", "my knowledge cutoff", or "my training data".
        
        Claim: {claim}
        Live Web Search Data: {search_results}
        
        Classify as exactly one of the following:
        - [Verified]: The claim matches the live web data.
        - [Inaccurate]: The claim is partially true but outdated based on the live web data.
        - [False]: No evidence found in the live web data, or it contradicts the data.
        
        Provide the classification and a concise 1-sentence justification based strictly on the search data.
        """
    )
    chain = prompt | llm
    response = chain.invoke({"claim": claim, "search_results": search_results, "current_date": current_date})
    return response.content

uploaded_file = st.file_uploader("Upload Marketing PDF", type="pdf")

if uploaded_file and api_key:
    os.environ["GROQ_API_KEY"] = api_key
    llm = ChatGroq(temperature=0, model_name="llama-3.3-70b-versatile")

    with st.spinner("Extracting text and identifying claims..."):
        pdf_text = extract_text_from_pdf(uploaded_file)
        raw_claims = extract_claims(pdf_text[:4000], llm) 
        
        claims_list = [c for c in raw_claims.split('\n') if c.strip() and len(c) > 10]

    st.subheader("Verification Results")
    for claim in claims_list:
        with st.expander(f"Claim: {claim}"):
            with st.spinner("Verifying against live web..."):
                result = verify_claim(claim, llm)
                if "[Verified]" in result:
                    st.success(result)
                elif "[Inaccurate]" in result:
                    st.warning(result)
                else:
                    st.error(result)
