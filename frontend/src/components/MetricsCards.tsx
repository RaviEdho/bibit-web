import React from "react";
import { RangeMetrics } from "../types/fund";
import { formatDate, formatPercent } from "../utils/formatters";
import { TrendingUp, TrendingDown, ShieldAlert, Activity, Calendar } from "lucide-react";

interface MetricsCardsProps {
  metrics: RangeMetrics | null;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-slate-800/40 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  const isPositive = metrics.totalReturn >= 0;

  return (
    <div className="space-y-3">
      {/* Selected Range Sub-header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 font-medium text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-brand-500" />
          <span>Rentang Terpilih:</span>
          <span className="text-white font-semibold">
            {formatDate(metrics.startDate)} &ndash; {formatDate(metrics.endDate)}
          </span>
          <span className="text-slate-500 font-normal">
            ({metrics.days} hari kalender)
          </span>
        </div>
        <div className="text-slate-400">
          NAV Awal: <span className="text-white font-mono">{metrics.startNav}</span> &rarr;{" "}
          Akhir: <span className="text-white font-mono">{metrics.endNav}</span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Return */}
        <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Return</span>
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div
            className={`text-xl font-bold tracking-tight mt-1 ${
              isPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {formatPercent(metrics.totalReturn)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5">Return kumulatif</span>
        </div>

        {/* CAGR */}
        <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>CAGR (Tahunan)</span>
            <Activity className="w-4 h-4 text-brand-400" />
          </div>
          <div
            className={`text-xl font-bold tracking-tight mt-1 ${
              metrics.cagr >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {formatPercent(metrics.cagr)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5">Pertumbuhan majemuk/th</span>
        </div>

        {/* Max Drawdown */}
        {(() => {
          const isZero = Math.abs(metrics.maxDrawdown) < 0.05;
          return (
            <div
              className={`border rounded-xl p-3.5 flex flex-col justify-between transition-colors ${
                isZero
                  ? "bg-slate-800/40 border-slate-700/40 text-slate-500"
                  : "bg-rose-950/20 border-rose-900/40 text-rose-400"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className={isZero ? "text-slate-500" : "text-rose-300"}>Max Drawdown</span>
                <ShieldAlert className={`w-4 h-4 ${isZero ? "text-slate-600" : "text-rose-400"}`} />
              </div>
              <div
                className={`text-xl font-bold tracking-tight mt-1 font-mono ${
                  isZero ? "text-slate-500 opacity-60" : "text-rose-400 font-extrabold"
                }`}
              >
                {formatPercent(metrics.maxDrawdown, false)}
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5">Penurunan puncak-ke-lembah</span>
            </div>
          );
        })()}

        {/* Sharpe Ratio */}
        <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Sharpe Ratio</span>
            <div className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
              Rf 2.5%
            </div>
          </div>
          <div
            className={`text-xl font-bold tracking-tight mt-1 ${
              metrics.sharpeRatio >= 1
                ? "text-blue-400"
                : metrics.sharpeRatio >= 0
                ? "text-slate-200"
                : "text-rose-400"
            }`}
          >
            {metrics.sharpeRatio.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5">
            Volatilitas: {formatPercent(metrics.volatilityAnnualized, false)}
          </span>
        </div>
      </div>
    </div>
  );
};
