import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent } from 'react';
import {
  Activity, ArrowDownToLine, ArrowRight, ArrowUpRight,
  BadgeCheck, BookOpenCheck, Check, CheckCheck, ChevronDown, ChevronRight,
  CircleAlert, CircleCheck, ClipboardCheck, Code2, FileCheck2,
  FileClock, FileSearch, FileText, Filter as FilterIcon, Github, Globe2,
  Info, LayoutDashboard, Link2, ListFilter, LoaderCircle, LockKeyhole,
  Menu, Moon, Plus, Search, Shield, ShieldCheck, Sparkles, Sun,
  TextCursorInput, TriangleAlert, UploadCloud, X, XCircle,
} from 'lucide-react';
import { analyzePDF, analyzeText, checkHealth } from './api';
import { sampleReport } from './sample';
import type { AnalysisReport, ClaimResult, Filter, Verdict } from './types';

type Page = 'dashboard' | 'new' | 'methodology';
type Mode = 'pdf' | 'text';
type Theme = 'light' | 'dark';
const REPO = 'https://github.com/Fahed1401/Fact-Check-Agent';
const palette: Record<Verdict, { label: string; short: string; icon: typeof CircleCheck }> = {
  verified: { label: 'Verified', short: 'Supported', icon: CircleCheck },
  inaccurate: { label: 'Inaccurate', short: 'Needs update', icon: TriangleAlert },
  false: { label: 'False', short: 'Contradicted', icon: XCircle },
  unverified: { label: 'Unverified', short: 'Needs review', icon: CircleAlert },
};
const order: Verdict[] = ['verified', 'inaccurate', 'false', 'unverified'];

function downloadFile(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csvEscape(value: string | number | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}
function toCSV(report: AnalysisReport) {
  const rows = [['Claim', 'Verdict', 'Reasoning', 'Suggested correction', 'Source URLs'].join(',')];
  report.claims.forEach(claim => rows.push([
    claim.claim, claim.verdict, claim.explanation, claim.correction,
    claim.evidence.map(s => s.url).join(' | '),
  ].map(csvEscape).join(',')));
  return '\uFEFF' + rows.join('\r\n');
}
function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function VerdictPill({ verdict }: { verdict: Verdict }) {
  const Icon = palette[verdict].icon;
  return <span className={`verdict-pill status-${verdict}`}><Icon size={14} strokeWidth={2.3} />{palette[verdict].label}</span>;
}

function Logo() {
  return <div className="logo-lockup"><span className="logo-mark"><ShieldCheck size={21} strokeWidth={2.3} /></span><span className="logo-word">truth<span>layer</span><span className="logo-dot">.</span></span></div>;
}

function ClaimCard({ claim, index, demo }: { claim: ClaimResult; index: number; demo: boolean }) {
  const [open, setOpen] = useState(index === 0);
  const cited = claim.evidence.filter((_, i) => claim.supporting_source_indexes.includes(i + 1));
  return <article className={`claim-card ${open ? 'claim-open' : ''}`}>
    <button className="claim-trigger" type="button" onClick={() => setOpen(v => !v)} aria-expanded={open}>
      <span className="claim-index">{String(index + 1).padStart(2, '0')}</span>
      <span className="claim-head"><span className="claim-question">{claim.claim}</span><span className="claim-meta">{claim.evidence.length} sources retrieved · {palette[claim.verdict].short}</span></span>
      <VerdictPill verdict={claim.verdict} />
      <ChevronDown className={`chevron ${open ? 'rotated' : ''}`} size={18} />
    </button>
    {open && <div className="claim-detail">
      <div className="reason-box"><div className="detail-title"><Sparkles size={15}/> Evidence assessment</div><p>{claim.explanation}</p></div>
      {claim.correction && <div className="correction-box"><div className="detail-title"><ClipboardCheck size={15}/> Suggested correction</div><p>{claim.correction}</p></div>}
      <div className="sources-heading"><div><Link2 size={16} /> Web sources <span className="sources-count">{claim.evidence.length}</span></div>{cited.length > 0 && <span className="support-hint">{cited.length} cited in verdict</span>}</div>
      {claim.evidence.length ? <div className="sources-list">{claim.evidence.map((source, i) => {
        let host = 'External site';
        try { host = new URL(source.url).hostname.replace(/^www\./, ''); } catch { /* invalid external URL */ }
        return <a className="source-item" href={source.url} target="_blank" rel="noopener noreferrer" key={`${source.url}-${i}`}>
          <div className="source-icon"><Globe2 size={17}/></div>
          <div className="source-content"><div className="source-top"><span>{source.title}</span>{claim.supporting_source_indexes.includes(i + 1) && <span className="source-cited">Cited</span>}</div><p>{source.snippet || 'No summary available. Open source to review.'}</p><span className="source-host">{host}</span></div>
          <ArrowUpRight size={16} className="source-out" />
        </a>;
      })}</div> : <div className="empty-sources"><Info size={16}/>{demo ? 'Sample report: no live sources were queried.' : 'No web sources were available. Do not treat this verdict as independently established.'}</div>}
    </div>}
  </article>;
}

function Sidebar({ page, setPage, showMobile, setShowMobile, serverState }: {
  page: Page; setPage: (page: Page) => void; showMobile: boolean;
  setShowMobile: (v: boolean) => void; serverState: 'checking' | 'ready' | 'unconfigured' | 'offline';
}) {
  const pages = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new' as Page, label: 'New analysis', icon: Plus },
    { id: 'methodology' as Page, label: 'Methodology', icon: BookOpenCheck },
  ];
  return <>
    {showMobile && <button className="sidebar-overlay" aria-label="Close menu" onClick={() => setShowMobile(false)}/>}
    <aside className={`sidebar ${showMobile ? 'sidebar-visible' : ''}`}>
      <div className="sidebar-brand"><Logo /><button className="mobile-close icon-button" onClick={() => setShowMobile(false)} aria-label="Close menu"><X size={18}/></button></div>
      <div className="sidebar-inner">
        <p className="nav-caption">WORKSPACE</p>
        <nav className="nav-items" aria-label="Main navigation">
          {pages.map(item => <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => { setPage(item.id); setShowMobile(false); }}><item.icon size={18}/><span>{item.label}</span>{page === item.id && <span className="nav-active-indicator"/>}</button>)}
        </nav>
        <p className="nav-caption nav-resources">RESOURCES</p>
        <a className="nav-item" href={REPO} target="_blank" rel="noopener noreferrer"><Github size={18}/><span>GitHub repository</span><ArrowUpRight size={14} className="nav-arrow"/></a>
        <div className="sidebar-spacer"/>
        <div className="sidebar-tip"><div className="tip-icon"><Sparkles size={17}/></div><strong>Better claims. Better trust.</strong><p>Check the evidence behind every statement before it goes live.</p><button onClick={() => { setPage('new'); setShowMobile(false); }}>Start an audit <ArrowRight size={14}/></button></div>
        <div className="sidebar-footer"><span className={`status-dot dot-${serverState}`}/><div><strong>{serverState === 'ready' ? 'Engine connected' : serverState === 'checking' ? 'Checking engine' : serverState === 'unconfigured' ? 'API key required' : 'Engine unavailable'}</strong><small>Groq + web search</small></div><span className="engine-version">v2.0</span></div>
      </div>
    </aside>
  </>;
}

function UploadZone({ file, setFile, disabled }: { file: File | null; setFile: (f: File | null) => void; disabled: boolean }) {
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const choose = (selected?: File | null) => {
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith('.pdf') || selected.type && selected.type !== 'application/pdf') {
      window.alert('Please choose a PDF document.'); return;
    }
    if (selected.size > 4 * 1024 * 1024) { window.alert('Maximum file size is 4 MB.'); return; }
    setFile(selected);
  };
  const dropped = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); setDragging(false);
    if (!disabled) choose(event.dataTransfer.files[0]);
  };
  const changed = (event: ChangeEvent<HTMLInputElement>) => choose(event.target.files?.[0]);
  return <div className={`upload-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
    onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
    onDragLeave={e => { e.preventDefault(); setDragging(false); }} onDrop={dropped}>
    <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={changed} disabled={disabled}/>
    {file ? <><div className="file-tile"><FileText size={27}/></div><strong className="uploaded-name">{file.name}</strong><p>{(file.size / 1024).toFixed(0)} KB · PDF document</p><button className="text-action" type="button" disabled={disabled} onClick={() => { setFile(null); if (input.current) input.current.value = ''; }}>Remove file <X size={14}/></button></>
    : <><div className="upload-illustration"><UploadCloud size={26} strokeWidth={1.8}/></div><strong>Drop your document here, or <button className="inline-upload" type="button" disabled={disabled} onClick={() => input.current?.click()}>browse files</button></strong><p>Upload your marketing brief, business report or whitepaper</p><span className="upload-limit">PDF only <span>·</span> Max 4 MB <span>·</span> Up to 25 pages</span></>}
  </div>;
}

function NewAnalysis({ onComplete, serverState }: { onComplete: (r: AnalysisReport) => void; serverState: 'checking' | 'ready' | 'unconfigured' | 'offline' }) {
  const [mode, setMode] = useState<Mode>('pdf');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [maxClaims, setMaxClaims] = useState(10);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [busy]);
  useEffect(() => () => { controller.current?.abort(); }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (mode === 'pdf' && !file) { setError('Choose a PDF to begin.'); return; }
    if (mode === 'text' && text.trim().length < 60) { setError('Enter at least 60 characters of text.'); return; }
    controller.current = new AbortController(); setBusy(true); setSeconds(0);
    try {
      const report = mode === 'pdf' ? await analyzePDF(file!, maxClaims, controller.current.signal) : await analyzeText(text, maxClaims, controller.current.signal);
      onComplete(report);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') setError(err.message === 'Failed to fetch' ? 'Could not connect to the API. Check that the backend is running and CORS_ORIGINS is configured.' : err.message);
    } finally { setBusy(false); controller.current = null; }
  };
  return <div className="new-grid">
    <div className="analysis-panel panel">
      <div className="panel-header"><div><div className="eyebrow">01 / SUBMIT CONTENT</div><h2>Start a new analysis</h2><p>Let AI extract individual claims and assess the available evidence.</p></div><span className="panel-header-icon"><FileSearch size={21}/></span></div>
      <form onSubmit={submit}>
        <div className="mode-switch" role="tablist" aria-label="Input type">
          <button type="button" role="tab" aria-selected={mode === 'pdf'} className={mode === 'pdf' ? 'selected' : ''} onClick={() => setMode('pdf')} disabled={busy}><FileText size={17}/> Upload PDF</button>
          <button type="button" role="tab" aria-selected={mode === 'text'} className={mode === 'text' ? 'selected' : ''} onClick={() => setMode('text')} disabled={busy}><TextCursorInput size={17}/> Paste text</button>
        </div>
        {mode === 'pdf' ? <UploadZone file={file} setFile={setFile} disabled={busy} /> : <div className="text-input-wrapper"><textarea rows={9} aria-label="Content to fact-check" value={text} disabled={busy} onChange={e => setText(e.target.value)} placeholder="Paste the content you want to fact-check. For example: 'Our report claims that global renewable energy capacity increased by 50% last year...'" maxLength={50000}/><div className="input-counter">{text.length.toLocaleString()} / 50,000 characters</div></div>}
        <div className="analysis-options"><div><label htmlFor="max-claims">Maximum claims to review</label><p>More claims can take longer to process.</p></div><div className="select-container"><select id="max-claims" value={maxClaims} disabled={busy} onChange={e => setMaxClaims(Number(e.target.value))}><option value={5}>5 claims</option><option value={10}>10 claims</option><option value={15}>15 claims</option></select><ChevronDown size={15}/></div></div>
        {error && <div className="form-error" role="alert"><CircleAlert size={18}/>{error}</div>}
        {busy && <div className="working-status" role="status"><LoaderCircle size={18} className="spin"/><span>Extracting claims and reviewing search evidence… <strong>{seconds}s elapsed</strong></span></div>}
        <button type="submit" className="primary-btn analyze-button" disabled={busy || serverState === 'checking'}>{busy ? <><LoaderCircle size={18} className="spin"/> Analyzing document…</> : <><Sparkles size={18}/> Analyze claims <ArrowRight size={18}/></>}</button>
        {busy && <button type="button" className="cancel-btn" onClick={() => controller.current?.abort()}>Cancel request</button>}
        <div className="privacy-note"><LockKeyhole size={14}/><span>Uploads are processed in memory, not saved to a database. Do not upload confidential documents to a public demo.</span></div>
      </form>
    </div>
    <aside className="new-aside"><div className="steps-panel panel"><span className="eyebrow">HOW IT WORKS</span><h3>From claim to clarity.</h3><p className="aside-intro">A transparent, source-aware verification workflow in three steps.</p>
      <div className="step"><span className="step-circle"><FileSearch size={20}/></span><div><strong>01. Extract</strong><p>Identify standalone, verifiable claims in your document.</p></div></div>
      <div className="step"><span className="step-circle"><Globe2 size={20}/></span><div><strong>02. Research</strong><p>Retrieve current web results and their source URLs.</p></div></div>
      <div className="step"><span className="step-circle"><BadgeCheck size={20}/></span><div><strong>03. Evaluate</strong><p>Classify evidence and suggest corrections where appropriate.</p></div></div>
      <div className="aside-callout"><Info size={17}/><p>AI fact-checks are decision support, not a substitute for primary-source verification.</p></div>
    </div>
    <div className="mini-panel"><div className="mini-panel-symbol"><Shield size={20}/></div><div><strong>Evidence-first by design</strong><p>No evidence? We mark the claim <b>Unverified</b>, never automatically False.</p></div></div></aside>
  </div>;
}

function AuditResults({ report, demo, onNew }: { report: AnalysisReport; demo: boolean; onNew: () => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('original');
  const counts = useMemo(() => Object.fromEntries(order.map(v => [v, report.claims.filter(c => c.verdict === v).length])) as Record<Verdict, number>, [report]);
  const total = report.claims.length;
  const sources = report.claims.reduce((acc, c) => acc + c.evidence.length, 0);
  const filtered = useMemo(() => {
    const data = report.claims.filter(c => (filter === 'all' || c.verdict === filter) && (c.claim + c.explanation).toLowerCase().includes(search.toLowerCase()));
    return sort === 'status' ? [...data].sort((a, b) => order.indexOf(a.verdict) - order.indexOf(b.verdict)) : data;
  }, [report, filter, search, sort]);
  return <div className="results-wrapper">
    {demo && <div className="demo-banner"><Info size={18}/><span><b>Sample report.</b> This illustrative dashboard does not represent a live analysis or verified citations.</span><button onClick={onNew}>Run your own <ArrowRight size={14}/></button></div>}
    {report.warnings.map((warning, i) => <div key={i} className="warning-banner"><CircleAlert size={17}/>{warning}</div>)}
    <div className="report-heading"><div className="report-heading-left"><span className="report-document-icon"><FileText size={23}/></span><div><div className="eyebrow">AUDIT REPORT</div><h2>{report.document.name}</h2><p><FileClock size={14}/> {formatDate(report.created_at)} <span>·</span> {total} claims analyzed {report.document.pages ? `· ${report.document.pages} pages` : ''}</p></div></div><div className="report-actions"><button className="outline-button" onClick={() => downloadFile('truthlayer-report.json', JSON.stringify(report, null, 2), 'application/json')}><ArrowDownToLine size={16}/> JSON</button><button className="primary-btn compact" onClick={() => downloadFile('truthlayer-report.csv', toCSV(report), 'text/csv;charset=utf-8')}><ArrowDownToLine size={16}/> Export CSV</button></div></div>
    <div className="metrics-grid"><div className="metric-card metric-total"><div className="metric-top"><span>Total claims</span><FileCheck2 size={19}/></div><div className="metric-num">{total}</div><span className="metric-sub">Claims evaluated</span></div>{order.map(v => { const Icon = palette[v].icon; return <div className={`metric-card metric-${v}`} key={v}><div className="metric-top"><span>{palette[v].label}</span><Icon size={19}/></div><div className="metric-num">{counts[v]}</div><span className="metric-sub">{total ? Math.round(counts[v] / total * 100) : 0}% of claims</span></div>; })}</div>
    <div className="report-insights"><div className="insights-card panel"><div className="insights-top"><div><span className="eyebrow">VERDICT BREAKDOWN</span><h3>Verification overview</h3></div><span className="insight-total">{total} total</span></div><div className="stacked-bar" role="img" aria-label="Distribution of claim verdicts">{order.map(v => counts[v] > 0 ? <span key={v} className={`bar-${v}`} style={{width: `${counts[v] / total * 100}%`}} title={`${palette[v].label}: ${counts[v]}`}/> : null)}</div><div className="legend-grid">{order.map(v => <span key={v}><i className={`legend-dot legend-${v}`}/>{palette[v].label}<strong>{counts[v]}</strong></span>)}</div></div><div className="insights-card sources-insight panel"><div className="insight-source-icon"><Globe2 size={22}/></div><span className="eyebrow">EVIDENCE COVERAGE</span><div className="insight-stat">{sources} <span>sources</span></div><p>Web results retrieved across this audit. Review primary sources before publishing.</p></div></div>
    <div className="claims-section"><div className="claims-header"><div><div className="eyebrow">DETAILED FINDINGS</div><h3>Claim-by-claim analysis <span>{filtered.length}</span></h3></div><button className="new-analysis-link" onClick={onNew}><Plus size={17}/> New analysis</button></div>
      <div className="claim-toolbar"><div className="filter-pills"><button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>All <span>{total}</span></button>{order.map(v => <button key={v} className={filter === v ? 'selected' : ''} onClick={() => setFilter(v)}>{palette[v].label} <span>{counts[v]}</span></button>)}</div><div className="search-sort"><label className="search-input"><Search size={16}/><input aria-label="Search claims" placeholder="Search claims..." value={search} onChange={e => setSearch(e.target.value)}/></label><div className="sort-select"><ListFilter size={16}/><select aria-label="Sort claims" value={sort} onChange={e => setSort(e.target.value)}><option value="original">Original order</option><option value="status">By status</option></select></div></div></div>
      <div className="claim-list">{filtered.length ? filtered.map((claim) => <ClaimCard key={claim.id} claim={claim} index={report.claims.indexOf(claim)} demo={demo}/>) : <div className="no-results"><FilterIcon size={24}/><strong>No matching claims</strong><p>Adjust your filters or search terms.</p><button onClick={() => { setSearch(''); setFilter('all'); }}>Clear filters</button></div>}</div>
    </div>
  </div>;
}

function Methodology({ onStart }: { onStart: () => void }) {
  return <div className="method-page"><div className="method-hero"><span className="eyebrow">OUR APPROACH</span><h2>Good fact-checking starts with good evidence.</h2><p>TruthLayer assists with claim extraction and preliminary evidence assessment. Every verdict is an interpretation of retrieved web snippets—not a definitive certification of truth.</p><button className="primary-btn" onClick={onStart}>Start an analysis <ArrowRight size={17}/></button></div>
    <div className="method-grid"><article className="panel method-card"><div className="method-icon"><FileSearch size={24}/></div><span>01 / Extraction</span><h3>Find verifiable claims</h3><p>A language model converts document text into standalone propositions, filtering out subjective statements and instructions.</p></article><article className="panel method-card"><div className="method-icon"><Globe2 size={24}/></div><span>02 / Retrieval</span><h3>Search for supporting evidence</h3><p>DuckDuckGo search returns result titles, URLs and snippets. A failed search is treated as missing evidence, not falsity.</p></article><article className="panel method-card"><div className="method-icon"><CheckCheck size={24}/></div><span>03 / Assessment</span><h3>Explain the outcome</h3><p>The model chooses among four statuses with a short rationale and a suggested correction when supportable.</p></article></div>
    <div className="method-principles panel"><h3>How to interpret verdicts</h3><div className="principle-grid">{order.map(v => <div key={v}><VerdictPill verdict={v}/><p>{v === 'verified' ? 'Retrieved material directly supports the claim. Verify source credibility independently.' : v === 'inaccurate' ? 'The claim has partial support but contains an incorrect or outdated detail.' : v === 'false' ? 'Retrieved evidence persuasively contradicts the claim.' : 'The available evidence is too weak, missing, ambiguous or conflicting.'}</p></div>)}</div><div className="principles-warning"><TriangleAlert size={18}/> Search-result snippets can be outdated, incomplete, or misleading. Important claims require manual verification against authoritative sources.</div></div>
  </div>;
}

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [demo, setDemo] = useState(false);
  const [serverState, setServerState] = useState<'checking' | 'ready' | 'unconfigured' | 'offline'>('checking');
  const [showMobile, setShowMobile] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => window.localStorage.getItem('truthlayer-theme') === 'dark' ? 'dark' : 'light');
  useEffect(() => { document.documentElement.dataset.theme = theme; window.localStorage.setItem('truthlayer-theme', theme); }, [theme]);
  useEffect(() => { checkHealth().then(isReady => setServerState(isReady ? 'ready' : 'unconfigured')).catch(() => setServerState('offline')); }, []);
  const start = () => { setPage('new'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const finished = (next: AnalysisReport) => { setReport(next); setDemo(false); setPage('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const showSample = () => { setReport(sampleReport); setDemo(true); setPage('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  return <div className="app-shell">
    <Sidebar page={page} setPage={setPage} showMobile={showMobile} setShowMobile={setShowMobile} serverState={serverState}/>
    <main className="main-area"><header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" aria-label="Open menu" onClick={() => setShowMobile(true)}><Menu size={22}/></button><span className="breadcrumb-base">Workspace</span><ChevronRight size={15} className="breadcrumb-separator"/><span className="breadcrumb-current">{page === 'dashboard' ? 'Overview' : page === 'new' ? 'New analysis' : 'Methodology'}</span></div><div className="topbar-right"><span className="topbar-badge"><span/>AI FACT-CHECK WORKSPACE</span><span className="topbar-divider"/><button className="icon-button theme-button" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} aria-label="Toggle color theme">{theme === 'light' ? <Moon size={19}/> : <Sun size={19}/>}</button><a href={REPO} className="github-top icon-button" target="_blank" rel="noopener noreferrer" aria-label="View source on GitHub"><Github size={19}/></a></div></header>
      <div className="page-content">
        {page === 'dashboard' && !report && <>
          <section className="welcome"><div><div className="welcome-kicker"><Sparkles size={15}/> THE AI-POWERED VERIFICATION WORKSPACE</div><h1>Make every claim <span>count.</span></h1><p>Go from uncertain statements to evidence-backed decisions. Audit documents, surface inaccuracies, and build trust in what you publish.</p><div className="hero-actions"><button className="primary-btn hero-main" onClick={start}>Start fact-checking <ArrowRight size={18}/></button><button className="secondary-btn" onClick={showSample}><FileSearch size={17}/> Explore sample report</button></div><div className="hero-quick"><span><Check size={15}/> Source-aware results</span><span><Check size={15}/> PDF & text analysis</span><span><Check size={15}/> Exportable reports</span></div></div><div className="hero-visual" aria-hidden="true"><div className="visual-header"><span><span className="visual-led"/> LIVE AUDIT PREVIEW</span><span>● ● ●</span></div><div className="visual-file"><span><FileText size={19}/></span><div><b>Campaign_Brief_2026.pdf</b><small>Claims analysis</small></div><span className="visual-progress">Complete <Check size={13}/></span></div><div className="visual-divider"/><div className="visual-claim"><span className="visual-claim-label">CLAIM 01</span><p>“Venus is the hottest planet in the Solar System.”</p><span className="visual-verdict status-verified"><CircleCheck size={14}/> Verified</span></div><div className="visual-claim"><span className="visual-claim-label">CLAIM 02</span><p>“Pluto was reclassified as a dwarf planet in 2005.”</p><span className="visual-verdict status-inaccurate"><TriangleAlert size={14}/> Inaccurate</span></div><div className="visual-stamp"><ShieldCheck size={16}/> Evidence over assumptions</div></div></section>
          <div className="section-label"><div><span className="eyebrow">BUILT FOR CLARITY</span><h2>Everything you need to verify with confidence.</h2></div></div>
          <div className="features-grid"><div className="feature-card panel"><span className="feature-icon feature-purple"><FileSearch size={24}/></span><h3>Intelligent claim extraction</h3><p>Find factual statements in PDFs and long-form copy without manually isolating each claim.</p><span>01 <ArrowRight size={16}/></span></div><div className="feature-card panel"><span className="feature-icon feature-blue"><Globe2 size={24}/></span><h3>Live evidence discovery</h3><p>Search the open web and examine the actual URLs behind every assessment.</p><span>02 <ArrowRight size={16}/></span></div><div className="feature-card panel"><span className="feature-icon feature-green"><ClipboardCheck size={24}/></span><h3>Actionable audit reports</h3><p>Get contextual verdicts, recommended corrections, and shareable CSV or JSON exports.</p><span>03 <ArrowRight size={16}/></span></div></div>
          <div className="bottom-cta"><div><span className="cta-icon"><Activity size={21}/></span><div><strong>Ready to put your content to the test?</strong><p>Run an evidence-backed analysis of your next document.</p></div></div><button className="secondary-btn" onClick={start}>Create an audit <ArrowRight size={16}/></button></div>
        </>}
        {page === 'dashboard' && report && <AuditResults key={report.id} report={report} demo={demo} onNew={start}/>}
        {page === 'new' && <><div className="page-intro"><div className="eyebrow">FACT-CHECK WORKSPACE</div><h1>New analysis<span className="title-dot">.</span></h1><p>Upload a PDF or paste your text. The agent identifies factual claims and evaluates retrieved sources.</p></div><NewAnalysis onComplete={finished} serverState={serverState}/></>}
        {page === 'methodology' && <Methodology onStart={start}/>}
      </div><footer className="page-footer"><span>© TruthLayer · An evidence-first AI portfolio project</span><span>Built with React, FastAPI, Groq & DuckDuckGo <Code2 size={15}/></span></footer></main>
  </div>;
}
