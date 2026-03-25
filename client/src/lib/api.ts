import { getOptionsChain, getBacktestData, getSentiment, getAISuggestion, getRevenue } from "./mock-data";

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  previousClose: number;
  dayChange: number;
  dayChangePercent: number;
  marketCap: string;
  pe: number;
  forwardPe: number;
  beta: number;
  volume: number;
  avgVolume: string;
  dividend: string;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
  source?: string;
  revenueQuarterly: { period: string; rev: number; earnings: number }[];
  revenueYearly: { year: string; rev: number; earnings: number }[];
}

export interface PricePoint {
  time: string;
  price: number;
  volume: number;
}

export interface OptionLeg {
  symbol: string;
  type: "Call" | "Put";
  strike: number;
  bid: number;
  ask: number;
  last: number;
  bidSize: number;
  askSize: number;
}

export interface OptionChainData {
  baseSymbol: string;
  calls: OptionLeg[];
  puts: OptionLeg[];
  source: string;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchQuote(symbol: string): Promise<MarketQuote | null> {
  return fetchJson<MarketQuote>(`/api/market/quote/${encodeURIComponent(symbol)}`);
}

export async function fetchIntraday(symbol: string): Promise<PricePoint[]> {
  const data = await fetchJson<PricePoint[]>(`/api/market/intraday/${encodeURIComponent(symbol)}`);
  return data || [];
}

export async function fetchOptionExpirations(symbol: string): Promise<string[]> {
  const data = await fetchJson<{ expirations: string[]; source: string }>(`/api/market/options/expirations/${encodeURIComponent(symbol)}`);
  return data?.expirations || [];
}

export async function fetchOptionChain(symbol: string, expiration: string): Promise<OptionChainData> {
  const data = await fetchJson<OptionChainData>(`/api/market/options/chain/${encodeURIComponent(symbol)}?expiration=${encodeURIComponent(expiration)}`);
  return data || { baseSymbol: symbol, calls: [], puts: [], source: "error" };
}

export interface BacktestEvent {
  date: string;
  action: string;
  strike: number;
  premium: number;
  price: number;
  pnl: number;
  cumPnl: number;
  type: "sell-put" | "assigned" | "sell-call" | "called-away" | "expired";
}

export interface BacktestResult {
  events: BacktestEvent[];
  chartData: { date: string; pnl: number; price: number }[];
  totalPnl: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalTrades: number;
  maxDrawdown: number;
  source: string;
  priceRange: { start: number; end: number; high: number; low: number };
}

export async function fetchBacktest(
  symbol: string,
  years: number,
  premiumPct: number = 1.0,
  expiryWeeks: number = 3
): Promise<BacktestResult | null> {
  return fetchJson<BacktestResult>(
    `/api/market/backtest/${encodeURIComponent(symbol)}?years=${years}&premiumPct=${premiumPct}&expiryWeeks=${expiryWeeks}`
  );
}

export async function fetchPortfolio(): Promise<any> {
  return fetchJson(`/api/market/portfolio`);
}

export function getMockOptionsChain(symbol: string) {
  return getOptionsChain(symbol);
}

export function getMockBacktest(symbol: string, years: number) {
  return getBacktestData(symbol, years);
}

export function getMockSentiment(symbol: string) {
  return getSentiment(symbol);
}

export function getMockAI(symbol: string) {
  return getAISuggestion(symbol);
}

export function getMockRevenue(symbol: string) {
  return getRevenue(symbol);
}
