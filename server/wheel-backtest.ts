import { getHistoricalPrices } from "./market-data";

export interface WheelEvent {
  date: string;
  action: string;
  strike: number;
  premium: number;
  price: number;
  pnl: number;
  cumPnl: number;
  type: "sell-put" | "assigned" | "sell-call" | "called-away" | "expired";
}

export interface WheelBacktestResult {
  events: WheelEvent[];
  chartData: { date: string; pnl: number; price: number }[];
  totalPnl: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  totalTrades: number;
  maxDrawdown: number;
  source: "yahoo-historical";
  priceRange: { start: number; end: number; high: number; low: number };
}

export async function runWheelBacktest(
  symbol: string,
  years: number,
  targetPremiumPct: number = 1.0,
  expiryWeeks: number = 3
): Promise<WheelBacktestResult> {
  const range = years === 1 ? "1y" : years === 2 ? "2y" : "3y";
  const historicalPrices = await getHistoricalPrices(symbol, range);

  if (historicalPrices.length < 10) {
    return {
      events: [],
      chartData: [],
      totalPnl: 0,
      winCount: 0,
      lossCount: 0,
      winRate: 0,
      totalTrades: 0,
      maxDrawdown: 0,
      source: "yahoo-historical",
      priceRange: { start: 0, end: 0, high: 0, low: 0 },
    };
  }

  const expiryDays = expiryWeeks * 7;
  const strikePctOTM = 0.03;
  const events: WheelEvent[] = [];
  let cumPnl = 0;
  let maxPnl = 0;
  let maxDrawdown = 0;
  let winCount = 0;
  let lossCount = 0;
  let holdingShares = false;
  let assignedPrice = 0;
  let i = 0;

  const chartData: { date: string; pnl: number; price: number }[] = [];

  while (i < historicalPrices.length) {
    const currentPrice = historicalPrices[i].close;
    const currentDate = historicalPrices[i].date;

    if (!holdingShares) {
      const putStrike = Math.round(currentPrice * (1 - strikePctOTM));
      const premium = Math.round(currentPrice * (targetPremiumPct / 100) * 100) / 100;

      cumPnl += premium * 100;
      events.push({
        date: currentDate,
        action: `SELL PUT $${putStrike} (${expiryWeeks}W) — COLLECTED $${(premium * 100).toFixed(0)}`,
        strike: putStrike,
        premium: premium * 100,
        price: currentPrice,
        pnl: premium * 100,
        cumPnl,
        type: "sell-put",
      });

      const expiryIdx = Math.min(i + Math.round(expiryDays / 7 * 5), historicalPrices.length - 1);
      const expiryPrice = historicalPrices[expiryIdx].close;
      const expiryDate = historicalPrices[expiryIdx].date;

      if (expiryPrice < putStrike) {
        holdingShares = true;
        assignedPrice = putStrike;
        const assignmentLoss = (expiryPrice - putStrike) * 100;
        cumPnl += assignmentLoss;
        events.push({
          date: expiryDate,
          action: `ASSIGNED AT $${putStrike} (PRICE: $${expiryPrice.toFixed(2)})`,
          strike: putStrike,
          premium: 0,
          price: expiryPrice,
          pnl: assignmentLoss,
          cumPnl,
          type: "assigned",
        });
        lossCount++;
        i = expiryIdx + 1;
      } else {
        events.push({
          date: expiryDate,
          action: `EXPIRED OTM — KEPT $${(premium * 100).toFixed(0)} PREMIUM`,
          strike: putStrike,
          premium: 0,
          price: expiryPrice,
          pnl: 0,
          cumPnl,
          type: "expired",
        });
        winCount++;
        i = expiryIdx + 1;
      }
    } else {
      const callStrike = Math.round(assignedPrice * (1 + strikePctOTM));
      const premium = Math.round(currentPrice * (targetPremiumPct * 0.8 / 100) * 100) / 100;

      cumPnl += premium * 100;
      events.push({
        date: currentDate,
        action: `SELL CALL $${callStrike} (${expiryWeeks}W) — COLLECTED $${(premium * 100).toFixed(0)}`,
        strike: callStrike,
        premium: premium * 100,
        price: currentPrice,
        pnl: premium * 100,
        cumPnl,
        type: "sell-call",
      });

      const expiryIdx = Math.min(i + Math.round(expiryDays / 7 * 5), historicalPrices.length - 1);
      const expiryPrice = historicalPrices[expiryIdx].close;
      const expiryDate = historicalPrices[expiryIdx].date;

      if (expiryPrice > callStrike) {
        const callProfit = (callStrike - assignedPrice) * 100;
        cumPnl += callProfit;
        holdingShares = false;
        events.push({
          date: expiryDate,
          action: `CALLED AWAY AT $${callStrike} (SHARE P&L: $${callProfit.toFixed(0)})`,
          strike: callStrike,
          premium: 0,
          price: expiryPrice,
          pnl: callProfit,
          cumPnl,
          type: "called-away",
        });
        winCount++;
        i = expiryIdx + 1;
      } else {
        events.push({
          date: expiryDate,
          action: `EXPIRED OTM — KEPT PREMIUM + SHARES (PRICE: $${expiryPrice.toFixed(2)})`,
          strike: callStrike,
          premium: 0,
          price: expiryPrice,
          pnl: 0,
          cumPnl,
          type: "expired",
        });
        if (expiryPrice >= assignedPrice * 0.95) {
          winCount++;
        } else {
          lossCount++;
        }
        i = expiryIdx + 1;
      }
    }

    maxPnl = Math.max(maxPnl, cumPnl);
    maxDrawdown = Math.min(maxDrawdown, cumPnl - maxPnl);

    chartData.push({
      date: historicalPrices[Math.min(i - 1, historicalPrices.length - 1)].date,
      pnl: Math.round(cumPnl),
      price: historicalPrices[Math.min(i - 1, historicalPrices.length - 1)].close,
    });
  }

  const allCloses = historicalPrices.map(p => p.close);
  const totalTrades = winCount + lossCount;

  return {
    events,
    chartData,
    totalPnl: Math.round(cumPnl),
    winCount,
    lossCount,
    winRate: totalTrades > 0 ? Math.round((winCount / totalTrades) * 100) : 0,
    totalTrades,
    maxDrawdown: Math.round(maxDrawdown),
    source: "yahoo-historical",
    priceRange: {
      start: allCloses[0],
      end: allCloses[allCloses.length - 1],
      high: Math.max(...allCloses),
      low: Math.min(...allCloses),
    },
  };
}
