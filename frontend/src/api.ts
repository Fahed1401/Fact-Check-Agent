import type { AnalysisReport } from './types';

const API = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

async function unwrap(response: Response): Promise<AnalysisReport> {
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    let detail = `Request failed (${response.status}).`;
    if (body && typeof body === 'object' && 'detail' in body) {
      const value = (body as { detail: unknown }).detail;
      if (typeof value === 'string') detail = value;
      if (Array.isArray(value)) detail = value.map((item: { msg?: string }) => item.msg ?? 'Invalid input').join('. ');
    }
    throw new Error(detail);
  }
  return response.json() as Promise<AnalysisReport>;
}

export async function analyzePDF(file: File, maxClaims: number, signal: AbortSignal): Promise<AnalysisReport> {
  const form = new FormData();
  form.append('file', file);
  form.append('max_claims', String(maxClaims));
  return unwrap(await fetch(`${API}/api/analyze/pdf`, { method: 'POST', body: form, signal }));
}

export async function analyzeText(text: string, maxClaims: number, signal: AbortSignal): Promise<AnalysisReport> {
  return unwrap(await fetch(`${API}/api/analyze/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, max_claims: maxClaims, name: 'Pasted content' }),
    signal,
  }));
}

export async function checkHealth(): Promise<boolean> {
  const response = await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(7000) });
  if (!response.ok) return false;
  const data: { configured?: boolean } = await response.json();
  return Boolean(data.configured);
}
