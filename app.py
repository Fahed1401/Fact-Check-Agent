import streamlit as st
import PyPDF2
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from duckduckgo_search import DDGS
import os

# Initializing Streamlit UI
st.set_page_config(page_title="Truth Layer: Automated Fact-Checker", layout="wide")
st.title("🛡️ Truth Layer: Fact-Check Agent")
st.markdown("Upload a marketing PDF. This tool extracts claims and cross-references them against the live web.")

# API Key input for evaluator
api_key = st.text_input("Enter Groq API Key to proceed (100% Free):", type="password")

def extract_text_from_pdf(pdf_file):
    reader = PyPDF2.PdfReader(pdf_file)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def extract_claims(text, llm):
    prompt = PromptTemplate(
        input_variables=["text"],
        template="Extract all factual claims, statistics, financial figures, and dates from the following text. List them clearly:\n\n{text}"
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
    # Call our custom search function instead of LangChain's tool
    search_results = live_web_search(claim)
    
    prompt = PromptTemplate(
        input_variables=["claim", "search_results"],
        template="""
        You are a strict fact-checker. 
        Claim: {claim}
        Live Web Search Data: {search_results}
        
        Compare the claim against the live web data. Classify as exactly one of the following:
        - [Verified]: The claim perfectly matches the data.
        - [Inaccurate]: The claim is partially true but outdated or slightly off.
        - [False]: No evidence found or contradicts the data.
        
        Provide the classification and a 1-sentence justification with the real fact.
        """
    )
    chain = prompt | llm
    response = chain.invoke({"claim": claim, "search_results": search_results})
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
