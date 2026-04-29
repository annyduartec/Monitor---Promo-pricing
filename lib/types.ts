// ─── Monitor (Pricing Dashboard) ────────────────────────────────────────────

export interface PromoEntry {
  market: string;
  competitor: string;
  product: string;
  status: string;
  baseDelta: string;
  promoImpact: string;
  promoDelta: string;
  promoDesc: string;
  // Optional reference data for the Base ∆ tooltip (cols 8-11 in the sheet)
  airtmReference?: string;
  competitorReference?: string;
  sourceReference?: string;
  calculationNote?: string;
}

export interface MonitorData {
  lastUpdate: string;
  markets: Record<string, Record<string, PromoEntry[]>>;
  marketNames: string[];
  totalCompetitors: number;
  productComparisons: number;
  wins: number;
  trackable: number;
  activePromos: PromoEntry[];
}

// ─── Promo Raw (Insights Feed) ───────────────────────────────────────────────

export interface RawPromo {
  date: string | null; // ISO string, null if unknown
  market: string;
  competitor: string;
  product: string;
  promoType: string;
  description: string;
  active: boolean;
  endDate: string | null;
}

// ─── Insights / AI ──────────────────────────────────────────────────────────

export type InsightsPeriod = 0 | 7 | 15 | 30;

export interface WeeklySummary {
  executiveSummary: string;
  keyCompetitorMoves: string[];
  marketsUnderPressure: string[];
  targetUserHypothesis: string[];
  strategicIntentHypothesis: string[];
  implicationsForAirtm: string[];
  recommendedActions: string[];
  dataLimitations: string[];
}

export interface AIAnalysis {
  productFocus: string;
  intent: string;
  userProfile: string;
  strategy: string;
  weeklySummary?: WeeklySummary;
}

export interface InsightsAPIResponse {
  success: boolean;
  data?: AIAnalysis;
  error?: string;
}

// ─── API Response envelope ───────────────────────────────────────────────────

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── View ────────────────────────────────────────────────────────────────────

export type AppView = "monitor" | "insights";
