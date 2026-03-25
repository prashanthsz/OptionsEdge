const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

interface QuoteData {
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
  dayHigh: number;
  dayLow: number;
  revenueQuarterly: any[];
  revenueYearly: any[];
}

interface PricePoint {
  time: string;
  price: number;
  volume: number;
}

interface HistoricalPoint {
  date: string;
  close: number;
  volume: number;
}

const cache = new Map<string, { data: any; expiry: number }>();

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  return null;
}

function setCache(key: string, data: any, ttlMs: number) {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

function formatMarketCap(val: number): string {
  if (!val || val <= 0) return "N/A";
  if (val >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  return `$${val.toLocaleString()}`;
}

function formatVolume(val: number): string {
  if (!val) return "N/A";
  if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
  return val.toString();
}

async function fetchYahooChart(symbol: string, range: string, interval: string): Promise<any | null> {
  try {
    const url = `${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OptionsEdge/1.0)" }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.chart?.result?.[0] ?? null;
  } catch (err) {
    console.error(`[market-data] fetchYahooChart error for ${symbol}:`, err);
    return null;
  }
}

export async function getQuote(symbol: string): Promise<QuoteData | null> {
  const cacheKey = `quote_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const result = await fetchYahooChart(symbol, "5d", "1d");
  if (!result) return null;

  const meta = result.meta;
  const price = meta.regularMarketPrice ?? 0;
  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const dayChange = price - previousClose;
  const dayChangePercent = previousClose ? (dayChange / previousClose) * 100 : 0;

  const data: QuoteData = {
    symbol: meta.symbol || symbol.toUpperCase(),
    name: meta.longName || meta.shortName || symbol.toUpperCase(),
    price,
    previousClose,
    dayChange,
    dayChangePercent,
    marketCap: formatMarketCap(meta.marketCap || 0),
    pe: 0,
    forwardPe: 0,
    beta: 0,
    volume: meta.regularMarketVolume || 0,
    avgVolume: formatVolume(meta.regularMarketVolume || 0),
    dividend: "N/A",
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
    dayHigh: meta.regularMarketDayHigh || 0,
    dayLow: meta.regularMarketDayLow || 0,
    revenueQuarterly: [],
    revenueYearly: [],
  };

  setCache(cacheKey, data, 30000);
  return data;
}

export async function getIntradayPrices(symbol: string): Promise<PricePoint[]> {
  const cacheKey = `intraday_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const result = await fetchYahooChart(symbol, "1d", "5m");
  if (!result) return [];

  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const volumes = result.indicators?.quote?.[0]?.volume || [];

  const points: PricePoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] == null) continue;
    const d = new Date(timestamps[i] * 1000);
    const h = d.getHours();
    const m = d.getMinutes();
    points.push({
      time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
      price: Math.round(closes[i] * 100) / 100,
      volume: volumes[i] || 0,
    });
  }

  setCache(cacheKey, points, 60000);
  return points;
}

export async function getHistoricalPrices(symbol: string, range: string = "1y"): Promise<HistoricalPoint[]> {
  const cacheKey = `historical_${symbol}_${range}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const interval = ["1d", "5d"].includes(range) ? "1d" : "1wk";
  const result = await fetchYahooChart(symbol, range, interval);
  if (!result) return [];

  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const volumes = result.indicators?.quote?.[0]?.volume || [];

  const points: HistoricalPoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] == null) continue;
    const d = new Date(timestamps[i] * 1000);
    points.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
      close: Math.round(closes[i] * 100) / 100,
      volume: volumes[i] || 0,
    });
  }

  setCache(cacheKey, points, 300000);
  return points;
}
