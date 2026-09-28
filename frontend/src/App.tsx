import React, { useEffect, useState } from "react";
import { SummaryResponse } from "./types/fund";
import { FundGrid } from "./components/FundGrid";
import { FundModal } from "./components/FundModal";
import { SwitchingGraphModal } from "./components/SwitchingGraphModal";
import { formatDate } from "./utils/formatters";
import { TrendingUp, Database, Clock, Sparkles, Layers, RefreshCw, Activity, ArrowRightLeft } from "lucide-react";
import { Card, CardContent } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Skeleton } from "./components/ui/skeleton";
import { Button } from "./components/ui/button";

export const App: React.FC = () => {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState<boolean>(false);
  const [graphInitialSymbol, setGraphInitialSymbol] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetch("/api/summary.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Gagal memuat data katalog`);
        return res.json();
      })
      .then((json: SummaryResponse) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalAum = data?.funds.reduce((acc, f) => acc + (f.aum || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
      {/* Top Navigation Bar */}
      <header className="border-b border-border/80 bg-background/80 backdrop-blur-md sticky top-0 z-30 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Logo & Product Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-950/40 border border-emerald-400/20">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-background animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-foreground tracking-tight truncate">
                  Bibit Reksadana
                </h1>
                <Badge variant="outline" className="hidden sm:inline-flex text-[10px] font-semibold text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                  Analytics
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block truncate">
                Historical NAV &bull; CAGR &bull; Ulcer Risk &bull; Switching Network
              </p>
            </div>
          </div>

          {/* Right Header: Update Status & Quick Actions */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {data && (
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 px-2.5 py-1 rounded-lg border border-border/60">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Update:</span>
                  <span className="text-foreground font-medium font-mono text-xs">
                    {formatDate(data.last_updated.split("T")[0])}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGraphInitialSymbol(null);
                    setIsGraphModalOpen(true);
                  }}
                  className="h-8 gap-1.5 px-3 text-xs border-cyan-800/80 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-950/70 hover:text-cyan-200"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Peta Switching</span>
                  <span className="sm:hidden">Switch</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Banner Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Active Funds */}
            <Card className="bg-card/80 border-border/80 hover:border-emerald-500/30 transition-all shadow-sm">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium">Reksadana Aktif</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                    {data.total_funds}
                    <span className="text-sm font-normal text-muted-foreground ml-1.5">Produk</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Pasar Uang, Obligasi, Saham</div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Total NAV Points */}
            <Card className="bg-card/80 border-border/80 hover:border-sky-500/30 transition-all shadow-sm">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium">Total Titik NAV</span>
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                    <Database className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                    {data.total_nav_points.toLocaleString("id-ID")}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Sejak Jan 2000 &ndash; Hari Ini</div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Total AUM */}
            <Card className="bg-card/80 border-border/80 hover:border-primary/30 transition-all shadow-sm">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium">Total Kelolaan (AUM)</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                    IDR {(totalAum / 1_000_000_000_000).toFixed(1)}
                    <span className="text-sm font-normal text-muted-foreground ml-1.5">Triliun</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Total dana kelolaan Bibit</div>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Interactive Risk Analytics */}
            <Card className="bg-card/80 border-border/80 hover:border-cyan-500/30 transition-all shadow-sm">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium">Kalkulator Interaktif</span>
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-2xl font-bold tracking-tight text-cyan-300">
                    Real-time
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Drag grafik & hitung CAGR langsung</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-4 bg-card/60 border-border/60">
                  <Skeleton className="h-4 w-24 mb-3" />
                  <Skeleton className="h-7 w-28 mb-1" />
                  <Skeleton className="h-3 w-36" />
                </Card>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-10 w-72 rounded-xl" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-36 rounded-xl" />
                <Skeleton className="h-10 w-24 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="p-5 bg-card/60 border-border/60 space-y-4">
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20 rounded" />
                    <Skeleton className="h-5 w-16 rounded" />
                  </div>
                  <Skeleton className="h-5 w-3/4 rounded" />
                  <Skeleton className="h-4 w-1/2 rounded" />
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-6 bg-destructive/10 border-destructive/40 text-center space-y-3">
            <p className="text-destructive font-semibold text-sm">Gagal memuat katalog data reksadana</p>
            <p className="text-muted-foreground text-xs">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5 mt-2">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </Button>
          </Card>
        )}

        {/* Directory Table / Cards */}
        {!loading && !error && data && (
          <FundGrid
            funds={data.funds}
            onSelectFund={setSelectedSymbol}
            onOpenSwitchGraph={(symbol) => {
              setGraphInitialSymbol(symbol || null);
              setIsGraphModalOpen(true);
            }}
          />
        )}
      </main>

      {/* Switching Network Graph Modal */}
      <SwitchingGraphModal
        isOpen={isGraphModalOpen}
        onClose={() => setIsGraphModalOpen(false)}
        onSelectFund={setSelectedSymbol}
        initialSymbol={graphInitialSymbol}
        funds={data?.funds}
      />

      {/* Fund Detail Drawer Modal */}
      <FundModal
        symbol={selectedSymbol}
        onClose={() => setSelectedSymbol(null)}
        onOpenSwitchGraph={(symbol) => {
          setSelectedSymbol(null);
          setGraphInitialSymbol(symbol);
          setIsGraphModalOpen(true);
        }}
        onSelectFund={setSelectedSymbol}
      />

      {/* Footer */}
      <footer className="border-t border-border/80 py-6 text-center text-xs text-muted-foreground">
        <p>
          Data bersumber dari publik Bibit.id &bull; Analisis dan grafik disediakan untuk riset independen.
        </p>
      </footer>
    </div>
  );
};

export default App;
