function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const STOCK_PROFILES: Record<string, { name: string; basePrice: number; pe: number; fwdPe: number; beta: number; iv30: number; marketCap: string; avgVol: string; dividend: string }> = {
  AAPL: { name: "Apple Inc.", basePrice: 148.25, pe: 28.4, fwdPe: 26.8, beta: 1.28, iv30: 32.4, marketCap: "$3.2T", avgVol: "62.1M", dividend: "0.65%" },
  TSLA: { name: "Tesla Inc.", basePrice: 242.50, pe: 65.2, fwdPe: 48.1, beta: 2.05, iv30: 58.7, marketCap: "$770B", avgVol: "112M", dividend: "0.00%" },
  NVDA: { name: "NVIDIA Corp.", basePrice: 875.30, pe: 62.1, fwdPe: 38.5, beta: 1.72, iv30: 45.2, marketCap: "$2.1T", avgVol: "42M", dividend: "0.04%" },
  MSFT: { name: "Microsoft Corp.", basePrice: 415.60, pe: 35.8, fwdPe: 31.2, beta: 0.92, iv30: 24.1, marketCap: "$3.1T", avgVol: "22M", dividend: "0.72%" },
  AMD: { name: "Advanced Micro Devices", basePrice: 162.40, pe: 45.3, fwdPe: 28.9, beta: 1.65, iv30: 48.3, marketCap: "$260B", avgVol: "55M", dividend: "0.00%" },
  AMZN: { name: "Amazon.com Inc.", basePrice: 178.90, pe: 58.7, fwdPe: 42.3, beta: 1.18, iv30: 31.5, marketCap: "$1.8T", avgVol: "48M", dividend: "0.00%" },
  META: { name: "Meta Platforms Inc.", basePrice: 502.15, pe: 26.9, fwdPe: 22.1, beta: 1.35, iv30: 38.2, marketCap: "$1.3T", avgVol: "18M", dividend: "0.38%" },
  GOOGL: { name: "Alphabet Inc.", basePrice: 155.80, pe: 24.5, fwdPe: 21.8, beta: 1.08, iv30: 27.6, marketCap: "$1.9T", avgVol: "25M", dividend: "0.00%" },
  SPY: { name: "SPDR S&P 500 ETF", basePrice: 515.40, pe: 22.1, fwdPe: 20.5, beta: 1.00, iv30: 16.8, marketCap: "$520B", avgVol: "85M", dividend: "1.32%" },
  QQQ: { name: "Invesco QQQ Trust", basePrice: 445.20, pe: 30.2, fwdPe: 25.8, beta: 1.12, iv30: 22.4, marketCap: "$250B", avgVol: "52M", dividend: "0.56%" },
};

function getProfile(symbol: string) {
  if (STOCK_PROFILES[symbol]) return STOCK_PROFILES[symbol];
  const rng = seededRandom(symbol);
  return {
    name: `${symbol} Corp.`,
    basePrice: Math.round((50 + rng() * 500) * 100) / 100,
    pe: Math.round((15 + rng() * 50) * 10) / 10,
    fwdPe: Math.round((12 + rng() * 40) * 10) / 10,
    beta: Math.round((0.5 + rng() * 2) * 100) / 100,
    iv30: Math.round((15 + rng() * 50) * 10) / 10,
    marketCap: `$${Math.round(10 + rng() * 500)}B`,
    avgVol: `${Math.round(5 + rng() * 100)}M`,
    dividend: `${(rng() * 3).toFixed(2)}%`,
  };
}

export function getStockData(symbol: string) {
  const profile = getProfile(symbol);
  const rng = seededRandom(symbol + "_price");

  const priceData = [];
  const times = ['09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];
  let price = profile.basePrice;
  for (const time of times) {
    price += (rng() - 0.48) * (profile.basePrice * 0.005);
    priceData.push({
      time,
      price: Math.round(price * 100) / 100,
      iv: Math.round((profile.iv30 + (rng() - 0.5) * 5) * 10) / 10,
    });
  }

  const currentPrice = priceData[priceData.length - 1].price;
  const dayChange = ((currentPrice - profile.basePrice) / profile.basePrice * 100).toFixed(2);

  return { profile, priceData, currentPrice, dayChange };
}

export function getOptionsChain(symbol: string) {
  const { currentPrice, profile } = getStockData(symbol);
  const rng = seededRandom(symbol + "_chain");
  const strikes = [-3, -2, -1, 0, 1, 2, 3].map(offset =>
    Math.round((currentPrice + offset * (currentPrice * 0.02)) / 5) * 5
  );

  const chain: any[] = [];
  for (const strike of strikes) {
    const moneyness = (currentPrice - strike) / currentPrice;
    const callDelta = Math.max(0.05, Math.min(0.95, 0.5 + moneyness * 5));
    const iv = profile.iv30 + (rng() - 0.5) * 10;
    const vol = Math.round(5000 + rng() * 50000);

    chain.push({
      strike,
      type: 'Call',
      bid: Math.round(Math.max(0.05, (currentPrice - strike) * callDelta + rng() * 3) * 100) / 100,
      ask: Math.round(Math.max(0.10, (currentPrice - strike) * callDelta + rng() * 3 + 0.15) * 100) / 100,
      vol,
      iv: Math.round(iv * 10) / 10,
      delta: Math.round(callDelta * 100) / 100,
      gamma: Math.round((0.02 + rng() * 0.06) * 100) / 100,
      theta: -Math.round((0.05 + rng() * 0.15) * 100) / 100,
      vega: Math.round((0.08 + rng() * 0.15) * 100) / 100,
    });

    chain.push({
      strike,
      type: 'Put',
      bid: Math.round(Math.max(0.05, (strike - currentPrice) * (1 - callDelta) + rng() * 3) * 100) / 100,
      ask: Math.round(Math.max(0.10, (strike - currentPrice) * (1 - callDelta) + rng() * 3 + 0.15) * 100) / 100,
      vol: Math.round(3000 + rng() * 30000),
      iv: Math.round((iv + 2) * 10) / 10,
      delta: -Math.round((1 - callDelta) * 100) / 100,
      gamma: Math.round((0.02 + rng() * 0.06) * 100) / 100,
      theta: -Math.round((0.04 + rng() * 0.12) * 100) / 100,
      vega: Math.round((0.06 + rng() * 0.12) * 100) / 100,
    });
  }
  return chain;
}

export function getRevenue(symbol: string) {
  const rng = seededRandom(symbol + "_rev");
  const scale = 10 + rng() * 200;
  const quarterly = [
    { period: 'Q1 25', rev: Math.round(scale * (0.7 + rng() * 0.6) * 10) / 10 },
    { period: 'Q2 25', rev: Math.round(scale * (0.7 + rng() * 0.6) * 10) / 10 },
    { period: 'Q3 25', rev: Math.round(scale * (0.7 + rng() * 0.6) * 10) / 10 },
    { period: 'Q4 25', rev: Math.round(scale * (0.7 + rng() * 0.6) * 10) / 10 },
  ];
  const annual = [
    { year: '2022', rev: Math.round(scale * (3 + rng() * 1.5) * 10) / 10 },
    { year: '2023', rev: Math.round(scale * (3.2 + rng() * 1.5) * 10) / 10 },
    { year: '2024', rev: Math.round(scale * (3.5 + rng() * 1.5) * 10) / 10 },
    { year: '2025', rev: Math.round(scale * (3.8 + rng() * 1.5) * 10) / 10 },
  ];
  return { quarterly, annual };
}

export function getBacktestData(symbol: string, years: number) {
  const rng = seededRandom(symbol + "_bt" + years);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const data: any[] = [];
  let cumPnl = 0;
  const totalMonths = years * 12;
  for (let i = 0; i < totalMonths; i++) {
    const monthPnl = Math.round((-2000 + rng() * 8000));
    cumPnl += monthPnl;
    const yr = 2023 + Math.floor(i / 12);
    data.push({ date: `${months[i % 12]} ${yr.toString().slice(-2)}`, pnl: cumPnl, monthPnl });
  }
  return data;
}

export function getSentiment(symbol: string) {
  const rng = seededRandom(symbol + "_sent");
  const sentiments: ('bullish' | 'bearish' | 'neutral')[] = ['bullish', 'bearish', 'neutral'];
  const users = ['@MarketMaker', '@TechAnalyst', '@OptionsFlow', '@WallStTrader', '@DegenCapital', '@TheStreet'];
  const templates = [
    `$${symbol} seeing massive call sweepers at ATM strike for next week.`,
    `New fundamental data suggests overvaluation. IV spiking on $${symbol}.`,
    `Unusual options activity detected on $${symbol}. 50k puts sold at bid.`,
    `$${symbol} institutional dark pool activity surging 340% above average.`,
    `Earnings whisper number for $${symbol} is 12% above consensus. Bullish setup.`,
    `$${symbol} showing a classic bear flag on the 4H chart. Watching closely.`,
  ];
  return templates.map((text, i) => ({
    id: i + 1,
    user: users[i % users.length],
    text,
    sentiment: sentiments[Math.floor(rng() * 3) % 3],
    time: `${Math.floor(1 + rng() * 60)}m ago`,
  }));
}

export function getAISuggestion(symbol: string) {
  const { profile, currentPrice } = getStockData(symbol);
  const rng = seededRandom(symbol + "_ai");
  const strategies = ['Bull Put Spread', 'Iron Condor', 'Covered Call', 'Cash Secured Put', 'Long Straddle'];
  const strategy = strategies[Math.floor(rng() * strategies.length)];
  const confidence = Math.round(60 + rng() * 30);
  const expectedReturn = (5 + rng() * 15).toFixed(1);
  const winRate = (65 + rng() * 25).toFixed(1);
  const setups = Math.round(8 + rng() * 20);
  const probability = (60 + rng() * 30).toFixed(1);
  const targetStrike = Math.round(currentPrice * (0.95 + rng() * 0.03) / 5) * 5;
  const mentions = (1 + rng() * 8).toFixed(1);

  return {
    strategy,
    confidence,
    expectedReturn,
    winRate,
    setups,
    probability,
    targetStrike,
    mentions,
    summary: `Based on ${profile.iv30 > 35 ? 'high' : 'moderate'} IV (${profile.iv30}%), a ${profile.beta > 1.2 ? 'positive' : 'neutral'} Beta correlation (${profile.beta}), and ${rng() > 0.5 ? 'bullish' : 'mixed'} Twitter sentiment ($${symbol} mentioned ${mentions}k times), the model predicts a ${probability}% probability of the price holding above $${targetStrike}.00 through expiry.`,
  };
}
