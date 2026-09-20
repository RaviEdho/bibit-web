import React, { useEffect, useState } from "react";
import { SummaryResponse } from "./types/fund";
import { FundGrid } from "./components/FundGrid";
import { FundModal } from "./components/FundModal";
import { SwitchingGraphModal } from "./components/SwitchingGraphModal";
import { formatDate } from "./utils/formatters";
import { TrendingUp, Database, Clock, Sparkles } from "lucide-react";

export const App: React.FC = () => {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState<boolean>(false);
  const [graphInitialSymbol, setGraphInitialSymbol] = useState<string | null>(null);

  useEffect(() => {
    // Cache-bust query to guarantee mobile browsers immediately get fresh summary.json
    fetch(`/api/summary.json?t=${Date.now()}`, { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load summary data`);
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
  }, []);

  const totalAum = data?.funds.reduce((acc, f) => acc + (f.aum || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex-shrink-0 flex items-center justify-center shadow-lg shadow-brand-900/30">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm sm:text-lg text-white tracking-tight truncate">
                  Bibit Reksadana
                </h1>
                <span className="hidden md:inline-block text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-brand-950 text-brand-400 border border-brand-800/60 flex-shrink-0">
                  Daily NAV
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block truncate">
                Analisis Kinerja, CAGR, Max Drawdown & Sharpe Ratio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {data && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5 text-slate-500 hidden sm:inline" />
                <span className="hidden sm:inline text-slate-400">Update:</span>
                <span className="text-slate-300 font-medium font-mono text-[11px] sm:text-xs bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60 shadow-sm">
                  {formatDate(data.last_updated.split("T")[0])}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Banner Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Reksadana Aktif</span>
                <Sparkles className="w-4 h-4 text-brand-400" />
              </div>
              <div className="text-xl font-bold text-white mt-1">
                {data.total_funds} Produk
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Semua kategori Bibit</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Total Titik Data NAV</span>
                <Database className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl font-bold text-white mt-1">
                {data.total_nav_points.toLocaleString("id-ID")}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Sejak Jan 2000 &ndash; Sekarang</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Total Kelolaan (AUM)</div>
              <div className="text-xl font-bold text-white mt-1">
                IDR {(totalAum / 1_000_000_000_000).toFixed(1)} Triliun
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Dari 177 produk terdaftar</div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Metrik Risiko Interaktif</div>
              <div className="text-xl font-bold text-brand-400 mt-1">Real-time</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Drag grafik untuk kalkulasi</div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="py-28 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Memuat data reksadana...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-6 bg-rose-950/30 border border-rose-800 rounded-2xl text-center space-y-2">
            <p className="text-rose-300 text-sm font-semibold">Gagal memuat katalog data</p>
            <p className="text-slate-400 text-xs">{error}</p>
          </div>
        )}

        {/* Directory Table */}
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
      />

      {/* Fund Modal Drawer */}
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
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>
          Data bersumber dari publik Bibit.id &bull; Analisis dan grafik disediakan untuk riset independen.
        </p>
      </footer>
    </div>
  );
};

export default App;
