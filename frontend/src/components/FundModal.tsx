import React, { useEffect, useState } from "react";
import { FundDetail, RangeMetrics } from "../types/fund";
import { NavChart } from "./NavChart";
import { MetricsCards } from "./MetricsCards";
import { formatAum, formatCurrency, formatDate, formatPercent, formatManagerName } from "../utils/formatters";
import { X, Calendar, DollarSign, PieChart, Shield, ArrowRightLeft, Network, Banknote } from "lucide-react";

interface FundModalProps {
  symbol: string | null;
  onClose: () => void;
  onOpenSwitchGraph?: (symbol: string) => void;
  onSelectFund?: (symbol: string) => void;
}

export const FundModal: React.FC<FundModalProps> = ({ symbol, onClose, onOpenSwitchGraph, onSelectFund }) => {
  const [fundDetail, setFundDetail] = useState<FundDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rangeMetrics, setRangeMetrics] = useState<RangeMetrics | null>(null);

  useEffect(() => {
    if (!symbol) {
      setFundDetail(null);
      setRangeMetrics(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/funds/${symbol}.json?t=${Date.now()}`, { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Fund data not found`);
        return res.json();
      })
      .then((data: FundDetail) => {
        setFundDetail(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [symbol]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!symbol) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Header Bar */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {fundDetail?.name || symbol}
              </h2>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
                {symbol}
              </span>
              {fundDetail?.sharia && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-lime-950 text-lime-300 border border-lime-800">
                  Syariah
                </span>
              )}
              {fundDetail?.is_dividend && (
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/90 text-emerald-300 border border-emerald-800 flex items-center gap-1"
                  title="Reksa dana dividen: return dan grafik disesuaikan dengan dividen tunai (total return)"
                >
                  <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Dividen (Adjusted)</span>
                </span>
              )}
              {fundDetail?.type && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-950 text-blue-300 border border-blue-800">
                  {fundDetail.type}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Manajer Investasi:{" "}
              <span className="text-slate-200 font-medium">
                {formatManagerName(fundDetail?.investment_manager)}
              </span>{" "}
              &bull; Bank Kustodian:{" "}
              <span className="text-slate-200 font-medium">
                {fundDetail?.custodian_bank || "-"}
              </span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Memuat riwayat NAV lengkap...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 text-xs">
              Gagal memuat data: {error}
            </div>
          )}

          {fundDetail && (
            <>
              {/* Dynamic Range Metrics Cards */}
              <MetricsCards metrics={rangeMetrics} />

              {/* TradingView Canvas Chart */}
              <NavChart
                series={fundDetail.series}
                symbol={fundDetail.symbol}
                isDividend={fundDetail.is_dividend}
                onRangeChange={setRangeMetrics}
              />

              {/* Fund Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-slate-800/40 border border-slate-800/80 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                    <span>Total AUM</span>
                  </div>
                  <div className="text-sm font-semibold text-white mt-1">
                    {formatAum(fundDetail.aum)}
                  </div>
                </div>

                <div className="bg-slate-800/40 border border-slate-800/80 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <PieChart className="w-3.5 h-3.5 text-slate-500" />
                    <span>Expense Ratio</span>
                  </div>
                  <div className="text-sm font-semibold text-white mt-1">
                    {fundDetail.expense_ratio ? `${(fundDetail.expense_ratio * 100).toFixed(2)}%` : "-"}
                  </div>
                </div>

                <div className="bg-slate-800/40 border border-slate-800/80 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Peluncuran</span>
                  </div>
                  <div className="text-sm font-semibold text-white mt-1">
                    {formatDate(fundDetail.released_date)}
                  </div>
                </div>

                <div className="bg-slate-800/40 border border-slate-800/80 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                    <span>Min. Beli</span>
                  </div>
                  <div className="text-sm font-semibold text-white mt-1">
                    {formatCurrency(fundDetail.min_buy)}
                  </div>
                </div>
              </div>

              {/* Static Bibit Official Presets Summary Table */}
              <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                  Kinerja Periode Baku (Standar Bibit)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                  {[
                    { label: "1 Bulan", val: fundDetail.metrics["1m"]?.return },
                    { label: "3 Bulan", val: fundDetail.metrics["3m"]?.return },
                    { label: "YTD", val: fundDetail.metrics["ytd"]?.return },
                    { label: "1 Tahun", val: fundDetail.metrics["1y"]?.return },
                    { label: "3 Tahun (CAGR)", val: fundDetail.metrics["3y"]?.cagr },
                    { label: "5 Tahun (CAGR)", val: fundDetail.metrics["5y"]?.cagr },
                  ].map((preset, idx) => (
                    <div key={idx} className="bg-slate-800/60 rounded-lg p-2">
                      <div className="text-[11px] text-slate-400">{preset.label}</div>
                      <div
                        className={`text-sm font-bold mt-0.5 ${
                          (preset.val ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {formatPercent(preset.val)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daftar Produk Switching */}
              <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Daftar Produk Switching
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {onOpenSwitchGraph && (
                      <button
                        onClick={() => onOpenSwitchGraph(fundDetail.symbol)}
                        className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-800 px-2 py-0.5 rounded-lg"
                        title="Lihat peta graf interaktif untuk reksa dana ini"
                      >
                        <Network className="w-3 h-3" />
                        <span>Lihat di Graf</span>
                      </button>
                    )}
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {fundDetail.switch_destinations?.length || 0} Produk
                    </span>
                  </div>
                </div>

                {fundDetail.switch_destinations && fundDetail.switch_destinations.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {fundDetail.switch_destinations.map((dest) => (
                      <div
                        key={dest.symbol}
                        onClick={() => onSelectFund?.(dest.symbol)}
                        className={`flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-800 transition-colors ${
                          onSelectFund ? "hover:border-cyan-500 cursor-pointer" : "hover:border-slate-700"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-medium text-white truncate">
                            {dest.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {dest.symbol}
                          </div>
                        </div>
                        <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-700/60 text-slate-300">
                          {dest.type}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-1">
                    Produk ini tidak memiliki daftar switching ke produk lain.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
