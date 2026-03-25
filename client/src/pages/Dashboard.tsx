import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Settings2, 
  Search, 
  BellRing,
  Twitter,
  MessageSquare,
  ShieldAlert,
  Smartphone,
  Tablet,
  Monitor,
  Download,
  CheckCircle2,
  LineChart as LineChartIcon,
  BarChart3,
  Globe,
  Wallet,
  ArrowRightLeft,
  Calculator,
  History,
  BrainCircuit,
  Sparkles,
  Info,
  Plus,
  Eye,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from "recharts";
import { fetchQuote, fetchIntraday, fetchOptionExpirations, fetchOptionChain, fetchBacktest, type MarketQuote, type PricePoint, type OptionLeg, type BacktestResult, type BacktestEvent, getMockOptionsChain, getMockBacktest, getMockSentiment, getMockAI, getMockRevenue } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Dashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [ticker, setTicker] = useState("AAPL");
  const [tickerInput, setTickerInput] = useState("AAPL");
  const [newTicker, setNewTicker] = useState("");
  const [ivThreshold, setIvThreshold] = useState([40]);
  const [volumeThreshold, setVolumeThreshold] = useState([10000]);
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [targetCommission, setTargetCommission] = useState([1]);
  const [expiryWeeks, setExpiryWeeks] = useState([3]);
  const [margin, setMargin] = useState("50000");
  const [loan, setLoan] = useState("10000");
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [showLog, setShowLog] = useState(true);
  const [backtestYears, setBacktestYears] = useState(1);

  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [priceData, setPriceData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"live" | "mock">("mock");
  const [expirations, setExpirations] = useState<string[]>([]);
  const [selectedExpiration, setSelectedExpiration] = useState<string>("");
  const [liveChain, setLiveChain] = useState<{ calls: OptionLeg[]; puts: OptionLeg[] } | null>(null);
  const [chainSource, setChainSource] = useState<"live" | "mock">("mock");
  const [chainLoading, setChainLoading] = useState(false);
  const [chainTab, setChainTab] = useState<"call-sell" | "call-buy" | "put-sell" | "put-buy">("call-sell");

  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [backtestSource, setBacktestSource] = useState<"live" | "mock">("mock");

  const mockChain = useMemo(() => getMockOptionsChain(ticker), [ticker]);
  const mockBacktestData = useMemo(() => getMockBacktest(ticker, backtestYears), [ticker, backtestYears]);
  const sentiment = useMemo(() => getMockSentiment(ticker), [ticker]);
  const aiSuggestion = useMemo(() => getMockAI(ticker), [ticker]);
  const mockRevenue = useMemo(() => getMockRevenue(ticker), [ticker]);

  const backtestData = backtestResult ? backtestResult.chartData : mockBacktestData;

  const loadMarketData = useCallback(async (symbol: string) => {
    setLoading(true);
    try {
      const [q, prices, exps] = await Promise.all([
        fetchQuote(symbol),
        fetchIntraday(symbol),
        fetchOptionExpirations(symbol),
      ]);
      if (q && q.price > 0) {
        setQuote(q);
        setPriceData(prices.length > 0 ? prices : []);
        setDataSource(q.source === "public.com" ? "live" : "live");
      } else {
        setQuote(null);
        setPriceData([]);
        setDataSource("mock");
      }
      if (exps.length > 0) {
        setExpirations(exps);
        setSelectedExpiration(exps[0]);
      } else {
        setExpirations([]);
        setSelectedExpiration("");
      }
    } catch {
      setQuote(null);
      setPriceData([]);
      setDataSource("mock");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!selectedExpiration || !ticker) return;
    setChainLoading(true);
    fetchOptionChain(ticker, selectedExpiration).then((data) => {
      if (data.source === "public.com" && (data.calls.length > 0 || data.puts.length > 0)) {
        setLiveChain({ calls: data.calls, puts: data.puts });
        setChainSource("live");
      } else {
        setLiveChain(null);
        setChainSource("mock");
      }
      setChainLoading(false);
    }).catch(() => {
      setLiveChain(null);
      setChainSource("mock");
      setChainLoading(false);
    });
  }, [ticker, selectedExpiration]);

  useEffect(() => {
    loadMarketData(ticker);
    const interval = setInterval(() => loadMarketData(ticker), 30000);
    return () => clearInterval(interval);
  }, [ticker, loadMarketData]);

  const currentPrice = quote?.price ?? 0;
  const dayChange = quote?.dayChangePercent?.toFixed(2) ?? "0.00";
  const profileName = quote?.name ?? ticker;
  const pe = quote?.pe ?? 0;
  const fwdPe = quote?.forwardPe ?? 0;
  const beta = quote?.beta ?? 0;
  const iv30 = 32.4;
  const mktCap = quote?.marketCap ?? "N/A";
  const avgVol = quote?.avgVolume ?? "N/A";
  const dividend = quote?.dividend ?? "N/A";

  const revenueQ = (quote?.revenueQuarterly && quote.revenueQuarterly.length > 0) ? quote.revenueQuarterly : mockRevenue.quarterly;
  const revenueY = (quote?.revenueYearly && quote.revenueYearly.length > 0) ? quote.revenueYearly : mockRevenue.annual;

  const totalPnl = backtestResult ? backtestResult.totalPnl : (backtestData.length > 0 ? backtestData[backtestData.length - 1].pnl : 0);
  const backtestWinRate = backtestResult ? backtestResult.winRate : parseFloat(aiSuggestion.winRate);
  const nearestStrike = Math.round(currentPrice / 5) * 5 || 150;

  const handleLoadTicker = () => {
    const sym = tickerInput.trim().toUpperCase();
    if (sym) {
      setTicker(sym);
      toast({ title: `Loading ${sym}...`, description: "Fetching live market data." });
    }
  };

  const handleAddToWatchlist = () => {
    if (newTicker.trim()) {
      setLocation(`/ticker/${newTicker.trim().toUpperCase()}`);
    }
  };

  const handleRunSimulator = async () => {
    setIsBacktesting(true);
    try {
      const result = await fetchBacktest(ticker, backtestYears, targetCommission[0], expiryWeeks[0]);
      if (result && result.events.length > 0) {
        setBacktestResult(result);
        setBacktestSource("live");
        toast({
          title: "Backtest Complete (Real Historical Data)",
          description: `${ticker} Wheel Strategy over ${backtestYears}Y: ${result.totalTrades} trades, ${result.winRate}% win rate, P&L: $${result.totalPnl.toLocaleString()} | Price range: $${result.priceRange.low.toFixed(0)}-$${result.priceRange.high.toFixed(0)}`,
        });
      } else {
        setBacktestResult(null);
        setBacktestSource("mock");
        toast({
          title: "Backtest (Mock Data)",
          description: `Could not fetch enough historical data for ${ticker}. Showing simulated results.`,
        });
      }
    } catch {
      setBacktestResult(null);
      setBacktestSource("mock");
      toast({
        title: "Backtest Error",
        description: "Failed to run backtest. Showing mock data.",
        variant: "destructive",
      });
    }
    setIsBacktesting(false);
  };

  const handleSimulateAlert = () => {
    toast({
      title: "ALERT TRIGGERED",
      description: `${ticker} IV spike detected! Suggestion: Cash Secured Puts at $${nearestStrike - 5} strike.`,
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30 text-primary shadow-[0_0_15px_rgba(0,255,128,0.2)]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                OptionsEdge
              </h1>
              <p className="text-xs text-muted-foreground font-mono">v2.4.1 // Live Market Data</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex gap-2 flex-1 md:flex-initial">
              <div className="relative flex-1 md:w-36">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  value={tickerInput}
                  onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoadTicker()}
                  className="pl-9 bg-card/50 border-border/50 font-mono focus-visible:ring-primary uppercase"
                  placeholder="SYMBOL..."
                  data-testid="input-ticker-search"
                />
              </div>
              <Button 
                variant="default"
                size="sm"
                className="shrink-0 bg-primary text-primary-foreground font-bold"
                onClick={handleLoadTicker}
                disabled={loading}
                data-testid="button-load-ticker"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load"}
              </Button>
            </div>
            <div className="relative flex gap-2 flex-1 md:flex-initial">
              <div className="relative flex-1 md:w-36">
                <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddToWatchlist()}
                  className="pl-9 bg-card/50 border-border/50 font-mono focus-visible:ring-primary uppercase"
                  placeholder="ADD..."
                  data-testid="input-watchlist-add"
                />
              </div>
              <Button 
                variant="outline"
                size="sm"
                className="shrink-0 border-border/50 hover:bg-primary/10"
                onClick={handleAddToWatchlist}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="outline" size="icon" className="shrink-0 border-border/50" onClick={handleSimulateAlert}>
              <BellRing className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <div className="flex items-center gap-2 px-2 flex-wrap">
          <Badge className="bg-primary/20 text-primary border-none font-mono text-sm">{ticker}</Badge>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <>
              <span className="text-lg font-mono font-bold">${currentPrice.toFixed(2)}</span>
              <span className={`text-xs font-mono ${parseFloat(dayChange) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {parseFloat(dayChange) >= 0 ? '+' : ''}{dayChange}%
              </span>
            </>
          )}
          <span className="text-xs text-muted-foreground ml-2">{profileName}</span>
          <Badge variant="outline" className={`ml-auto text-[9px] ${dataSource === 'live' ? 'border-primary/50 text-primary' : 'border-amber-500/50 text-amber-500'}`}>
            {dataSource === 'live' ? 'LIVE DATA' : 'MOCK DATA'}
          </Badge>
          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => loadMarketData(ticker)}>
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "PRICE", val: `$${currentPrice.toFixed(2)}`, change: `${parseFloat(dayChange) >= 0 ? '+' : ''}${dayChange}%`, up: parseFloat(dayChange) >= 0 },
            { label: "BETA (5Y)", val: beta > 0 ? beta.toFixed(2) : "N/A", change: beta > 1.2 ? "High Vol" : beta > 0 ? "Low Vol" : "", up: beta <= 1.2 },
            { label: "P/E RATIO", val: pe > 0 ? pe.toFixed(1) : "N/A", change: fwdPe > 0 ? `FWD: ${fwdPe.toFixed(1)}` : "", up: fwdPe < pe },
            { label: "FWD P/E", val: fwdPe > 0 ? fwdPe.toFixed(1) : "N/A", change: "Est. Earnings", up: true },
            { label: "MKT CAP", val: mktCap, change: avgVol !== "N/A" ? `Vol: ${avgVol}` : "", up: true },
          ].map((stat, i) => (
            <Card key={i} className="bg-card/40 border-border/40 backdrop-blur-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-mono mb-1">{stat.label}</p>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xl font-semibold font-mono tracking-tight">{stat.val}</h3>
                  <span className={`text-[10px] font-mono ${stat.up ? 'text-primary' : 'text-destructive'}`}>
                    {stat.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-card/40 border-border/40 backdrop-blur-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <LineChartIcon className="w-4 h-4 text-primary" />
                  PRICE ACTION — {ticker}
                </CardTitle>
              </div>
              <Badge variant="outline" className={`font-mono text-[10px] ${dataSource === 'live' ? 'border-primary/20 text-primary' : 'border-amber-500/20 text-amber-500'}`}>
                {dataSource === 'live' ? 'LIVE' : 'MOCK'}
              </Badge>
            </CardHeader>
            <CardContent className="h-[300px] w-full" style={{ minWidth: 0 }}>
              {priceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={priceData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <p className="font-mono text-sm">No intraday data — market may be closed</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/40 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#1DA1F2]" />
                REVENUE — {ticker}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="quarterly" className="w-full">
                <TabsList className="grid grid-cols-2 bg-background/50 mb-4">
                  <TabsTrigger value="quarterly" className="text-[10px]">QUARTERLY</TabsTrigger>
                  <TabsTrigger value="annual" className="text-[10px]">ANNUAL</TabsTrigger>
                </TabsList>
                <TabsContent value="quarterly" className="h-[220px]">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={revenueQ}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="rev" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue ($B)" />
                    </BarChart>
                  </ResponsiveContainer>
                </TabsContent>
                <TabsContent value="annual" className="h-[220px]">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={revenueY}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="rev" fill="#1DA1F2" radius={[4, 4, 0, 0]} name="Revenue ($B)" />
                    </BarChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-gradient-to-br from-primary/5 to-transparent border-primary/20 shadow-lg overflow-hidden">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2 text-primary uppercase tracking-wider">
                    <Calculator className="w-5 h-5" />
                    Strategy Simulator — {ticker}
                  </CardTitle>
                  <CardDescription>Wheel Strategy (Put Assignment &rarr; Covered Call)</CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary">BACKTESTING</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-mono uppercase">Target Premium (%)</Label>
                      <span className="font-mono text-primary bg-primary/10 px-2 rounded">{targetCommission}%</span>
                    </div>
                    <Slider value={targetCommission} onValueChange={setTargetCommission} max={10} step={0.5} />
                    
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-mono uppercase">Expiry (Weeks)</Label>
                      <span className="font-mono text-primary bg-primary/10 px-2 rounded">{expiryWeeks}w</span>
                    </div>
                    <Slider value={expiryWeeks} onValueChange={setExpiryWeeks} max={52} step={1} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] text-muted-foreground uppercase">Margin Capital</Label>
                      <div className="relative">
                        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <Input value={margin} onChange={(e) => setMargin(e.target.value)} className="pl-8 h-8 text-xs font-mono bg-background/40" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] text-muted-foreground uppercase">Loan Amount</Label>
                      <div className="relative">
                        <ArrowRightLeft className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <Input value={loan} onChange={(e) => setLoan(e.target.value)} className="pl-8 h-8 text-xs font-mono bg-background/40" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 space-y-3">
                    <Label className="text-[10px] text-muted-foreground uppercase">Backtest Period</Label>
                    <Tabs value={`${backtestYears}y`} onValueChange={(v) => setBacktestYears(parseInt(v))} className="w-full">
                      <TabsList className="grid grid-cols-3 bg-background/50 h-8">
                        <TabsTrigger value="1y" className="text-[10px]">1 YEAR</TabsTrigger>
                        <TabsTrigger value="2y" className="text-[10px]">2 YEAR</TabsTrigger>
                        <TabsTrigger value="3y" className="text-[10px]">3 YEAR</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <Button 
                      className="w-full bg-primary text-primary-foreground font-bold" 
                      onClick={handleRunSimulator}
                      disabled={isBacktesting}
                      data-testid="button-run-simulator"
                    >
                      {isBacktesting ? 'RUNNING SIMULATION...' : 'EXECUTE STRATEGY RUN'}
                    </Button>
                  </div>
                </div>

                <div className="bg-background/40 rounded-xl border border-border/40 p-4 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[10px] font-mono text-muted-foreground uppercase flex items-center gap-2">
                      <History className="w-3 h-3" />
                      {ticker} — {backtestYears}Y Backtest
                      <Badge variant="outline" className={`text-[9px] ${backtestSource === 'live' ? 'border-primary/50 text-primary' : 'border-amber-500/50 text-amber-500'}`}>
                        {backtestSource === 'live' ? 'YAHOO HISTORICAL' : 'MOCK'}
                      </Badge>
                    </h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[9px] uppercase font-bold"
                      onClick={() => setShowLog(!showLog)}
                    >
                      {showLog ? 'Show Chart' : 'Show Events'}
                    </Button>
                  </div>
                  
                  {showLog ? (
                    <ScrollArea className="flex-1 min-h-[180px] bg-black/20 rounded-lg p-3 border border-white/5">
                      <div className="space-y-3 font-mono text-[10px]">
                        {backtestResult && backtestResult.events.length > 0 ? (
                          backtestResult.events.map((evt, idx) => (
                            <div key={idx} className={`flex items-start gap-2 ${
                              evt.type === 'sell-put' || evt.type === 'sell-call' ? 'text-primary' :
                              evt.type === 'assigned' ? 'text-destructive' :
                              evt.type === 'called-away' ? 'text-green-500' :
                              'text-amber-500'
                            }`}>
                              <span className="shrink-0 opacity-50">{evt.date}</span>
                              <span>{evt.action}</span>
                              <span className="ml-auto shrink-0 opacity-70">${evt.cumPnl.toLocaleString()}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-muted-foreground text-center py-8">
                            Click "EXECUTE STRATEGY RUN" to backtest with real historical prices
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex-1 min-h-[180px]">
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={backtestData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={9} interval={Math.max(1, Math.floor(backtestData.length / 6))} />
                          <YAxis hide />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                          <Area type="monotone" dataKey="pnl" stroke="#1DA1F2" fill="#1DA1F2" fillOpacity={0.1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/40">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Total P&L</p>
                      <p className={`text-lg font-mono font-bold ${totalPnl >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Win Rate</p>
                      <p className="text-lg font-mono font-bold">{backtestWinRate}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Trades</p>
                      <p className="text-lg font-mono font-bold">{backtestResult ? backtestResult.totalTrades : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Max DD</p>
                      <p className="text-lg font-mono font-bold text-destructive">{backtestResult ? `$${backtestResult.maxDrawdown.toLocaleString()}` : '—'}</p>
                    </div>
                  </div>
                  {backtestResult && (
                    <div className="mt-2 text-[9px] font-mono text-muted-foreground">
                      Price: ${backtestResult.priceRange.start.toFixed(2)} → ${backtestResult.priceRange.end.toFixed(2)} (High: ${backtestResult.priceRange.high.toFixed(2)}, Low: ${backtestResult.priceRange.low.toFixed(2)})
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.1)] relative overflow-hidden font-sans">
              <div className="absolute -top-4 -right-4 p-4 opacity-10 rotate-12">
                <BrainCircuit className="w-32 h-32" />
              </div>
              <CardHeader className="pb-2 relative z-10">
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2 text-indigo-400">
                    <Sparkles className="w-5 h-5" />
                    AI Neural Suggestion
                  </CardTitle>
                  <Badge variant="outline" className="text-[9px] border-indigo-500/30 text-indigo-400">GEN-4</Badge>
                </div>
                <CardDescription>Analysis for {ticker}</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10 space-y-4">
                <div className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-xl backdrop-blur-md">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-tight">Recommended: {aiSuggestion.strategy}</h4>
                  </div>
                  
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4 italic border-l-2 border-indigo-500/30 pl-3">
                    "{aiSuggestion.summary}"
                  </p>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-black/40 p-2 rounded border border-white/5 font-mono text-[9px]">
                      <p className="text-muted-foreground uppercase mb-1 flex items-center gap-1">Confidence <Info className="w-2 h-2"/></p>
                      <p className="text-indigo-400 font-bold">{aiSuggestion.confidence >= 75 ? 'HIGH' : aiSuggestion.confidence >= 50 ? 'MED' : 'LOW'} ({aiSuggestion.confidence}%)</p>
                    </div>
                    <div className="bg-black/40 p-2 rounded border border-white/5 font-mono text-[9px]">
                      <p className="text-muted-foreground uppercase mb-1">Expected Return</p>
                      <p className="text-primary font-bold">+{aiSuggestion.expectedReturn}% / Mo</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-indigo-500/20">
                    <h5 className="text-[10px] font-bold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                      <History className="w-3 h-3" />
                      Historical Reality Check
                    </h5>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/10">
                        <span className="text-[10px] font-semibold text-cyan-200">Win Rate ({backtestYears}Y):</span>
                        <span className="text-[10px] font-mono text-cyan-400 font-bold tracking-widest">{aiSuggestion.winRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1">
                  {['Greeks', 'Sentiment', 'Rev/PE'].map((point) => (
                    <div key={point} className="flex flex-col items-center gap-1 p-1 rounded bg-cyan-500/5 border border-cyan-500/10">
                      <CheckCircle2 className="w-2.5 h-2.5 text-cyan-400" />
                      <span className="text-[8px] font-mono text-cyan-300/70">{point}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1DA1F2]/10 to-transparent border-[#1DA1F2]/30 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-[#1DA1F2]">
                  <ShieldAlert className="w-4 h-4" />
                  WHEEL OPPORTUNITY — {ticker}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-background/60 p-3 rounded-lg border border-[#1DA1F2]/20">
                  <div className="flex justify-between items-center mb-2">
                    <Badge className="bg-primary/20 text-primary border-none text-[9px]">STEP 1: SELL PUT</Badge>
                    <span className="text-[10px] font-mono text-muted-foreground">{expiryWeeks}w Expiry</span>
                  </div>
                  <p className="text-xs font-semibold mb-1">Sell ${nearestStrike - 5} Put ({targetCommission}% Prem)</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Current price: ${currentPrice.toFixed(2)}. {targetCommission}% premium at ${nearestStrike - 5} strike.
                  </p>
                </div>
                <div className="bg-background/40 p-3 rounded-lg border border-white/5 opacity-50">
                  <div className="flex justify-between items-center mb-2">
                    <Badge variant="outline" className="text-[9px]">STEP 2: COVERED CALL</Badge>
                    <span className="text-[10px] font-mono text-muted-foreground">Wait for Assign</span>
                  </div>
                  <p className="text-xs font-semibold mb-1">Sell ${nearestStrike + 10} Call (0.8% Prem)</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/40 border-border/40 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings2 className="w-4 h-4 text-muted-foreground" />
                  Alert Thresholds — {ticker}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs text-muted-foreground">IV Spike Alert (%)</Label>
                    <span className="font-mono text-xs text-primary">{ivThreshold}%</span>
                  </div>
                  <Slider value={ivThreshold} onValueChange={setIvThreshold} max={100} step={1} className="py-2" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs text-muted-foreground">Unusual Volume</Label>
                    <span className="font-mono text-xs text-primary">{volumeThreshold.toLocaleString()}</span>
                  </div>
                  <Slider value={volumeThreshold} onValueChange={setVolumeThreshold} max={100000} step={1000} className="py-2" />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Telegram</Label>
                    <p className="text-[10px] text-muted-foreground">Bot alerts via Telegram</p>
                  </div>
                  <Switch checked={telegramEnabled} onCheckedChange={setTelegramEnabled} />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="space-y-0.5">
                    <Label className="text-sm">WhatsApp</Label>
                    <p className="text-[10px] text-muted-foreground">Alerts via WhatsApp</p>
                  </div>
                  <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-card/40 border-border/40 backdrop-blur-sm shadow-xl">
            <CardHeader className="pb-2">
              <div className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Options Chain — {ticker}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    {chainSource === "live" ? "Live from Public.com" : "Simulated data"}
                    <Badge variant="outline" className={`text-[9px] ${chainSource === 'live' ? 'border-primary/50 text-primary' : 'border-amber-500/50 text-amber-500'}`}>
                      {chainSource === 'live' ? 'PUBLIC.COM' : 'MOCK'}
                    </Badge>
                    {chainLoading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {expirations.length > 0 && (
                    <Select value={selectedExpiration} onValueChange={setSelectedExpiration}>
                      <SelectTrigger className="w-[140px] h-8 text-xs font-mono bg-background/50" data-testid="select-expiration">
                        <SelectValue placeholder="Expiration" />
                      </SelectTrigger>
                      <SelectContent>
                        {expirations.slice(0, 12).map((exp) => (
                          <SelectItem key={exp} value={exp} className="text-xs font-mono">{exp}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <Tabs value={chainTab} onValueChange={(v) => setChainTab(v as any)} className="mt-3">
                <TabsList className="grid w-full grid-cols-4 bg-background/50 h-8">
                  <TabsTrigger value="call-sell" className="text-[10px] data-[state=active]:text-primary" data-testid="tab-call-sell">Call Sell</TabsTrigger>
                  <TabsTrigger value="call-buy" className="text-[10px] data-[state=active]:text-primary" data-testid="tab-call-buy">Call Buy</TabsTrigger>
                  <TabsTrigger value="put-sell" className="text-[10px] data-[state=active]:text-destructive" data-testid="tab-put-sell">Put Sell</TabsTrigger>
                  <TabsTrigger value="put-buy" className="text-[10px] data-[state=active]:text-destructive" data-testid="tab-put-buy">Put Buy</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              {(() => {
                const isCall = chainTab.startsWith("call");
                const isSell = chainTab.endsWith("sell");
                const priceCol = isSell ? "BID (You Receive)" : "ASK (You Pay)";
                const accentClass = isCall ? "text-primary" : "text-destructive";
                const bgClass = isCall ? "bg-primary/10" : "bg-destructive/10";

                const filterATM = (items: { strike: number }[]) => {
                  const sorted = [...items].sort((a, b) => Math.abs(a.strike - currentPrice) - Math.abs(b.strike - currentPrice));
                  const nearest50 = sorted.slice(0, 50);
                  return nearest50.sort((a, b) => a.strike - b.strike);
                };

                if (liveChain && chainSource === "live") {
                  const rawData = isCall ? liveChain.calls : liveChain.puts;
                  const filtered = filterATM(rawData);
                  return (
                    <div className="rounded-md border border-border/40 overflow-hidden">
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader className="bg-background/50 sticky top-0 z-10">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="font-mono text-xs">STRIKE</TableHead>
                              <TableHead className="font-mono text-xs text-right">{priceCol}</TableHead>
                              <TableHead className="font-mono text-xs text-right">LAST</TableHead>
                              <TableHead className="font-mono text-xs text-right">SPREAD</TableHead>
                              <TableHead className="font-mono text-xs text-right">SIZE</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filtered.map((row, i) => {
                              const price = isSell ? row.bid : row.ask;
                              const size = isSell ? row.bidSize : row.askSize;
                              const isATM = Math.abs(row.strike - currentPrice) < currentPrice * 0.01;
                              const isNearATM = Math.abs(row.strike - currentPrice) < currentPrice * 0.03;
                              return (
                                <TableRow key={i} className={`font-mono text-sm border-border/40 hover:bg-white/5 transition-colors ${isATM ? 'bg-white/5' : ''}`} data-testid={`option-row-${row.strike}`}>
                                  <TableCell className={`font-bold ${isNearATM ? 'text-white' : 'text-muted-foreground'}`}>
                                    ${row.strike.toFixed(row.strike % 1 === 0 ? 0 : 1)}
                                    {isATM && <Badge variant="outline" className="ml-2 text-[10px] py-0 h-4 border-primary/50 text-primary">ATM</Badge>}
                                  </TableCell>
                                  <TableCell className={`text-right font-bold ${isSell ? 'text-primary' : 'text-destructive'}`}>
                                    ${price.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right text-muted-foreground">${row.last.toFixed(2)}</TableCell>
                                  <TableCell className="text-right text-muted-foreground">${(row.ask - row.bid).toFixed(2)}</TableCell>
                                  <TableCell className="text-right text-muted-foreground">{size}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                      <div className="px-3 py-2 border-t border-border/40 flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                        <span>{filtered.length} strikes shown (ATM +/- 25)</span>
                        <span>ATM: ${currentPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                }

                const mockFiltered = filterATM(
                  mockChain.filter(r => isCall ? r.type === 'Call' : r.type === 'Put')
                );
                return (
                  <div className="rounded-md border border-border/40 overflow-hidden">
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader className="bg-background/50 sticky top-0 z-10">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="font-mono text-xs">STRIKE</TableHead>
                            <TableHead className="font-mono text-xs text-right">{priceCol}</TableHead>
                            <TableHead className="font-mono text-xs text-right">IV%</TableHead>
                            <TableHead className="font-mono text-xs text-right">Δ</TableHead>
                            <TableHead className="font-mono text-xs text-right">Θ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mockFiltered.map((row, i) => {
                            const price = isSell ? row.bid : row.ask;
                            const isATM = row.strike === nearestStrike;
                            return (
                              <TableRow key={i} className={`font-mono text-sm border-border/40 hover:bg-white/5 transition-colors ${isATM ? 'bg-white/5' : ''}`}>
                                <TableCell className={`font-bold ${isATM ? 'text-white' : 'text-muted-foreground'}`}>
                                  {row.strike}
                                  {isATM && <Badge variant="outline" className="ml-2 text-[10px] py-0 h-4 border-primary/50 text-primary">ATM</Badge>}
                                </TableCell>
                                <TableCell className={`text-right font-bold ${isSell ? 'text-primary' : 'text-destructive'}`}>
                                  ${price.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right text-accent-foreground">{row.iv}%</TableCell>
                                <TableCell className="text-right text-muted-foreground">{row.delta.toFixed(2)}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{row.theta.toFixed(2)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                    <div className="px-3 py-2 border-t border-border/40 flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                      <span>{mockFiltered.length} strikes (mock data)</span>
                      <span>ATM: ${currentPrice.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/40 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                Social Sentiment — {ticker}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-4">
                  {sentiment.map((tweet) => (
                    <div key={tweet.id} className="flex gap-3 pb-4 border-b border-border/40 last:border-0 last:pb-0">
                      <Twitter className="w-4 h-4 text-[#1DA1F2] shrink-0 mt-1" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold">{tweet.user}</span>
                          <span className="text-[10px] text-muted-foreground">{tweet.time}</span>
                          <Badge variant="outline" className={`ml-auto text-[9px] py-0 h-4 border-transparent ${tweet.sentiment === 'bullish' ? 'bg-primary/10 text-primary' : tweet.sentiment === 'bearish' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                            {tweet.sentiment}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {tweet.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
