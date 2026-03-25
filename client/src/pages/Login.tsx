import { useEffect } from "react";
import { useLocation } from "wouter";
import { 
  ShieldCheck, 
  ArrowRight, 
  Chrome,
  Zap,
  TrendingUp,
  BrainCircuit
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-indigo-500/20 border border-primary/30 shadow-[0_0_30px_rgba(0,255,128,0.15)] animate-pulse">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground font-mono text-sm">Initializing neural node...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
      
      <div className="w-full max-w-[400px] space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-indigo-500/20 border border-primary/30 mb-4 shadow-[0_0_30px_rgba(0,255,128,0.15)]">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white">OPTIONS<span className="text-primary">EDGE</span></h1>
          <p className="text-muted-foreground text-sm font-mono uppercase tracking-widest">Neural Terminal v2.4</p>
        </div>

        <Card className="bg-card/40 border-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          <CardHeader className="space-y-1 text-center pt-8">
            <CardTitle className="text-2xl font-bold tracking-tight">Secure Access</CardTitle>
            <CardDescription className="text-xs font-mono">ENCRYPTED NODE AUTHENTICATION</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Button 
              variant="outline" 
              className="w-full h-12 border-white/10 hover:bg-white/5 hover:text-white transition-all duration-300 flex items-center justify-center gap-3 group"
              onClick={handleLogin}
              data-testid="button-login-google"
            >
              <Chrome className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Continue with Google</span>
            </Button>

            <Button 
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-[0_0_20px_rgba(0,255,128,0.2)] group"
              onClick={handleLogin}
              data-testid="button-login-session"
            >
              Initialize Session
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-8 border-t border-white/5 mt-4 pt-6">
            <div className="flex items-center gap-6 justify-center">
              <div className="flex flex-col items-center gap-1 opacity-50">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-[8px] font-mono">REAL-TIME</span>
              </div>
              <div className="flex flex-col items-center gap-1 opacity-50">
                <BrainCircuit className="w-4 h-4 text-indigo-400" />
                <span className="text-[8px] font-mono">AI-SYNAPSE</span>
              </div>
              <div className="flex flex-col items-center gap-1 opacity-50">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span className="text-[8px] font-mono">MULTI-SIG</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center font-mono">
              By connecting, you agree to the <span className="text-white hover:underline cursor-pointer">Neural Protocols</span>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
