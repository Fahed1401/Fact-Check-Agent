"""Backwards-compatible Streamlit entry point for the original deployed app.

The portfolio React frontend lives in frontend/. This view uses the exact same
backend engine and never writes a visitor's Groq key into os.environ.
"""
import asyncio
import streamlit as st

from backend.engine import AnalysisError, analyze_document, extract_pdf

st.set_page_config(page_title="TruthLayer · Fact-check agent", page_icon="🛡️", layout="wide")
st.title("🛡️ TruthLayer")
st.caption("Evidence-first fact checking for PDFs and marketing copy")
st.info("This is the lightweight Streamlit interface. For the polished portfolio dashboard, run the React frontend in `frontend/`.")

with st.sidebar:
    st.subheader("Analysis settings")
    key = st.text_input("Groq API key (optional if server configured)", type="password", help="Your key is used for this request only, never stored in a process-wide environment variable.")
    max_claims = st.slider("Maximum claims", 1, 15, 10)
    st.caption("Search snippets are preliminary evidence. Always inspect cited sources.")

pdf_tab, text_tab = st.tabs(["Upload PDF", "Paste text"])
with pdf_tab:
    uploaded = st.file_uploader("Choose a PDF", type=["pdf"], max_upload_size=8)
with text_tab:
    pasted = st.text_area("Text to verify", height=220, placeholder="Paste a marketing claim, news excerpt or report...")

input_mode = st.radio("Analyze", ["PDF", "Text"], horizontal=True, label_visibility="collapsed")
if st.button("Run fact check", type="primary"):
    try:
        if input_mode == "PDF":
            if uploaded is None:
                st.warning("Upload a PDF first.")
                st.stop()
            text, pages, truncated = extract_pdf(uploaded.getvalue())
            doc_name = uploaded.name
        else:
            text, pages, truncated = pasted, None, False
            doc_name = "Pasted content"
        with st.spinner("Extracting claims and comparing web evidence…"):
            result = asyncio.run(analyze_document(
                text, name=doc_name, pages=pages, truncated=truncated,
                max_claims=max_claims, api_key=key or None,
            ))
        st.session_state["report"] = result
    except AnalysisError as exc:
        st.error(str(exc))
    except Exception:
        st.error("Unexpected error. Check server logs; do not share API keys in screenshots.")

if "report" in st.session_state:
    report = st.session_state["report"]
    st.subheader(f"Results · {report.document.name}")
    counts = {s: sum(c.verdict == s for c in report.claims) for s in ["verified", "inaccurate", "false", "unverified"]}
    cols = st.columns(4)
    for col, (status, count) in zip(cols, counts.items()):
        col.metric(status.title(), count)
    for warning in report.warnings:
        st.warning(warning)
    for claim in report.claims:
        with st.expander(f"{claim.verdict.upper()} · {claim.claim}"):
            st.write(claim.explanation)
            if claim.correction:
                st.info(f"Suggested correction: {claim.correction}")
            for n, source in enumerate(claim.evidence, 1):
                st.markdown(f"{n}. [{source.title}]({source.url}) — {source.snippet}")
    st.download_button("Download JSON report", report.model_dump_json(indent=2), "truthlayer-report.json", "application/json")
