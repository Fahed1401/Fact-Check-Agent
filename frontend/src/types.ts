export type Verdict = 'verified' | 'inaccurate' | 'false' | 'unverified';

export interface Evidence {
  title: string;
  url: string;
  snippet: string;
}

export interface ClaimResult {
  id: string;
  claim: string;
  verdict: Verdict;
  explanation: string;
  correction: string | null;
  evidence: Evidence[];
  supporting_source_indexes: number[];
}

export interface AnalysisReport {
  id: string;
  created_at: string;
  document: {
    name: string;
    pages: number | null;
    characters_analyzed: number;
    truncated: boolean;
  };
  claims: ClaimResult[];
  warnings: string[];
}

export type Filter = Verdict | 'all';
