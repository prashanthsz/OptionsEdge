import { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { 
  ArrowLeft,
  BrainCircuit,
  LineChart as LineChartIcon,
  TrendingUp,
  TrendingDown,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchQuote, fetchIntraday, type MarketQuote, type PricePoint } from "@/lib/api";

export default function TickerDetail() {
  const [, params] = useRoute("/ticker/:symbol");
  const [, setLocation] = useLocation();
  const symbol = (params?.symbol || "AAPL").toUpperCase();

  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"live" | "mock">("mock");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [q, prices] = await Promise.all([
        fetchQuote(symbol),
        fetchIntraday(symbol),
      ]);
      if (q && q.price > 0) {
        setQuote(q);
        setPriceData(prices.length > 0 ? prices : []);
        setDataSource("live");
      } else {
        setQuote(null);
        setPriceData([]);
        setDataSource("mock");
      }
    } catch {
      setQuote(null);
      setPriceData([]);
      setDataSource("mock");
    }
    setLoading(false);
  }, [symbol]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentPrice = quote?.price ?? 0;
  const dayChange = quote?.dayChangePercent?.toFixed(2) ?? "0.00";
  const isUp = parseFloat(dayChange) >= 0;
  const profileName = quote?.name ?? symbol;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")} className="hover:bg-primary/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tighter text-white">{symbol}</h1>
                <Badge className="bg-primary/20 text-primary border-none">WATCHING</Badge>
                <Badge variant="outline" className={`text-[9px] ${dataSource === 'live' ? 'border-primary/50 text-primary' : 'border-amber-500/50 text-amber-500'}`}>
                  {dataSource === 'live' ? 'LIVE' : 'MOCK'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono">{profileName}</p>
            </div>
            <div className="ml-4">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : (
                <>
                  <span className="text-2xl font-mono font-bold">${currentPrice.toFixed(2)}</span>
                  <span className={`ml-2 text-sm font-mono ${isUp ? 'text-primary' : 'text-destructive'}`}>
                    {isUp ? <TrendingUp className="w-4 h-4 inline" /> : <TrendingDown className="w-4 h-4 inline" />}
                    {' '}{isUp ? '+' : ''}{dayChange}%
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={loadData}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="outline" className="border-border/50 text-xs">Set Alert</Button>
            <Button className="bg-primary text-primary-foreground">Trade Options</Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Market Cap", val: quote?.marketCap ?? "N/A" },
            { label: "Avg Volume", val: quote?.avgVolume ?? "N/A" },
            { label: "P/E Ratio", val: quote?.pe ? quote.pe.toFixed(1) : "N/A" },
            { label: "Dividend", val: quote?.dividend ?? "N/A" },
          ].map((stat, i) => (
            <Card key={i} className="bg-card/40 border-border/40">
              <CardContent className="p-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-mono">{stat.label}</p>
                <p className="text-xl font-bold text-white">{stat.val}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-card/40 border-border/40 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <LineChartIcon className="w-4 h-4 text-primary" />
                PRICE PERFORMANCE — {symbol}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[400px]" style={{ minWidth: 0 }}>
              {priceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={380}>
                  <AreaChart data={priceData}>
                    <defs>
                      <linearGradient id="colorPriceDetail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                    <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))" fill="url(#colorPriceDetail)" fillOpacity={1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <p className="font-mono text-sm">No intraday data — market may be closed</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-indigo-500/10 border-indigo-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-indigo-400">
                  <BrainCircuit className="w-4 h-4" />
                  AI SUMMARY — {symbol}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {symbol} is currently trading at ${currentPrice.toFixed(2)}
                  {quote?.pe ? ` with a P/E of ${quote.pe.toFixed(1)}` : ''}
                  {quote?.beta ? ` and Beta of ${quote.beta.toFixed(2)}` : ''}.
                  {quote?.beta && quote.beta > 1.2 ? ' High beta suggests elevated volatility — ideal for premium selling strategies.' : ' Consider covered call approaches for steady income.'}
                  {' '}Market cap: {quote?.marketCap ?? 'N/A'}.
                  {quote?.fiftyTwoWeekHigh ? ` 52W range: $${quote.fiftyTwoWeekLow?.toFixed(2)} — $${quote.fiftyTwoWeekHigh.toFixed(2)}.` : ''}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/40 border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono">FUNDAMENTALS</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">P/E Ratio</span>
                  <span className="text-white font-bold">{quote?.pe ? quote.pe.toFixed(1) : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Forward P/E</span>
                  <span className="text-white font-bold">{quote?.forwardPe ? quote.forwardPe.toFixed(1) : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Beta (5Y)</span>
                  <span className="text-white">{quote?.beta ? quote.beta.toFixed(2) : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Dividend Yield</span>
                  <span className="text-white">{quote?.dividend ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">52W High</span>
                  <span className="text-primary">${quote?.fiftyTwoWeekHigh?.toFixed(2) ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">52W Low</span>
                  <span className="text-destructive">${quote?.fiftyTwoWeekLow?.toFixed(2) ?? 'N/A'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
