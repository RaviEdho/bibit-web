import React from "react";
import { FundSummary } from "../types/fund";
import { formatAum, formatPercent, formatManagerName } from "../utils/formatters";
import { TrendingUp, TrendingDown, ChevronRight, Zap, Banknote, ArrowRightLeft, Sparkles } from "lucide-react";

export type ReturnTimeframe = "1d" | "1m" | "ytd" | "1y" | "3y" | "5y";

interface FundCardProps {
  fund: FundSummary;
  timeframe: ReturnTimeframe;
  onClick: () => void;
  onOpenSwitchGraph?: (symbol: string) => void;
}

export const FundCard: React.FC<FundCardProps> = ({ fund, timeframe, onClick, onOpenSwitchGraph }) => {
  // Determine return value and label based on timeframe
  let returnValue: number | null = null;
  let returnLabel = "Return 1 Th";

  switch (timeframe) {
    case "1d":
      returnValue = fund.return_1d;
      returnLabel = "Return 1 Hari";
      break;
    case "1m":
      returnValue = fund.return_1m;
      returnLabel = "Return 1 Bulan";
      break;
    case "ytd":
      returnValue = fund.return_ytd;
      returnLabel = "Return YTD";
      break;
    case "1y":
      returnValue = fund.return_1y ?? fund.cagr_1y;
      returnLabel = "Return 1 Th";
      break;
    case "3y":
      returnValue = fund.return_3y ?? null;
      returnLabel = "Return 3 Th";
      break;
    case "5y":
      returnValue = fund.return_5y ?? null;
      returnLabel = "Return 5 Th";
      break;
  }

  let mddValue: number | null = null;
  let mddLabel = "Drawdown 1 Th";

  switch (timeframe) {
    case "1d":
      mddValue = null;
      mddLabel = "Drawdown 1 Hari";
      break;
    case "1m":
      mddValue = fund.max_drawdown_1m ?? null;
      mddLabel = "Drawdown 1 Bulan";
      break;
    case "ytd":
      mddValue = fund.max_drawdown_ytd ?? null;
      mddLabel = "Drawdown YTD";
      break;
    case "1y":
      mddValue = fund.max_drawdown_1y;
      mddLabel = "Drawdown 1 Th";
      break;
    case "3y":
      mddValue = fund.max_drawdown_3y ?? null;
      mddLabel = "Drawdown 3 Th";
      break;
    case "5y":
      mddValue = fund.max_drawdown_5y ?? null;
      mddLabel = "Drawdown 5 Th";
      break;
  }

  let qualityScore: number | null = null;
  let qualityLabel = "Skor Kualitas";

  switch (timeframe) {
    case "1d":
      qualityScore = null;
      break;
    case "1m":
      qualityScore = fund.quality_score_1m ?? null;
      break;
    case "ytd":
      qualityScore = fund.quality_score_ytd ?? null;
      break;
    case "1y":
      qualityScore = fund.quality_score_1y ?? null;
      break;
    case "3y":
      qualityScore = fund.quality_score_3y ?? null;
      break;
    case "5y":
      qualityScore = fund.quality_score_5y ?? null;
      break;
  }
  const isPositive = (returnValue ?? 0) >= 0;

  // Type badge styling matching Bibit category palette
  const getTypeColor = (type: string) => {
    switch (type) {
      case "Pasar Uang":
        return "bg-emerald-950/70 text-emerald-300 border-emerald-700/60";
      case "Obligasi":
        return "bg-sky-950/70 text-sky-300 border-sky-700/60";
      case "Saham":
        return "bg-purple-950/70 text-purple-300 border-purple-700/60";
      case "Campuran":
      case "Reksadana Global":
      case "Lainnya":
        return "bg-teal-950/70 text-teal-300 border-teal-700/60";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800/90 hover:border-brand-500/40 rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-brand-950/20 active:scale-[0.99] flex flex-col justify-between group"
    >
      {/* Top Header: Badges */}
      <div>
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getTypeColor(
              fund.type
            )}`}
          >
            {fund.type}
          </span>
          {fund.sharia && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-lime-950/80 text-lime-300 border border-lime-700/60">
              Syariah
            </span>
          )}
          {fund.is_instant_redemption && (
            fund.instant_type === 1 ? (
              <span
                className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 flex items-center gap-0.5"
                title="Pencairan Instan Biasa (3x/bulan gratis)"
              >
                <Zap className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />
                <span>Instan</span>
              </span>
            ) : (
              <span
                className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/60 flex items-center gap-0.5"
                title="Pencairan Instan+ (Real-time s.d. Rp100 Jt/hari)"
              >
                <Zap className="w-2.5 h-2.5 text-purple-400 fill-purple-400" />
                <span>Instan+</span>
              </span>
            )
          )}
          {fund.is_index_fund && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/60 flex items-center gap-0.5" title="Index Fund">
              <TrendingUp className="w-2.5 h-2.5 text-amber-400" />
              <span>Index</span>
            </span>
          )}
          {fund.is_dividend && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 flex items-center gap-0.5" title="Reksa Dana Dividen">
              <Banknote className="w-2.5 h-2.5 text-emerald-400" />
              <span>Dividen</span>
            </span>
          )}
          {(fund.switch_destinations_count ?? 0) > 0 && (
            <button
              type="button"
              onClick={(e) => {
                if (onOpenSwitchGraph) {
                  e.stopPropagation();
                  onOpenSwitchGraph(fund.symbol);
                }
              }}
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 flex items-center gap-0.5 ${
                onOpenSwitchGraph ? "hover:bg-cyan-900 hover:border-cyan-600 cursor-pointer transition-colors" : ""
              }`}
              title={`Mendukung switching ke ${fund.switch_destinations_count} produk. Klik untuk buka di graf.`}
            >
              <ArrowRightLeft className="w-2.5 h-2.5 text-cyan-400" />
              <span>Switch</span>
            </button>
          )}
          {fund.notbuyable === 1 && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/60">
              Tutup
            </span>
          )}
          <span className="ml-auto text-[11px] font-mono text-slate-500">
            {fund.symbol}
          </span>
        </div>

        {/* Fund Title & Manager */}
        <h3 className="font-bold text-base text-white group-hover:text-brand-400 transition-colors leading-snug line-clamp-2">
          {fund.name}
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-brand-400 group-hover:translate-x-0.5 transition-all inline-block ml-1 align-[-2px]" />
        </h3>
        <p className="text-xs text-slate-400 mt-1 truncate">
          {formatManagerName(fund.manager)}
        </p>
      </div>

      {/* Main Metrics Section: Return & Quality Score Prominent Tiles */}
      <div className="mt-3.5 space-y-2.5">
        {/* Two Prominent Metric Boxes: Return & Quality Score */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Left: Prominent Return */}
          <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span className="truncate">{returnLabel}</span>
            </div>
            <div
              className={`text-lg sm:text-xl font-extrabold tracking-tight font-mono mt-1 ${
                isPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {formatPercent(returnValue)}
            </div>
          </div>

          {/* Right: Prominent Quality Score */}
          <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[11px] text-cyan-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate font-medium">{qualityLabel}</span>
            </div>
            <div className="text-lg sm:text-xl font-extrabold tracking-tight font-mono mt-1 text-cyan-300">
              {qualityScore !== null ? qualityScore.toFixed(2) : "-"}
            </div>
          </div>
        </div>

        {/* Secondary Stats Row: Drawdown (below returns) & AUM (on right) */}
        <div className="flex items-center justify-between text-xs px-1 text-slate-400 font-medium">
          <div title={mddLabel}>
            Drawdown:{" "}
            <span
              className={`font-mono font-semibold ${
                mddValue !== null && Math.abs(mddValue) >= 0.05
                  ? "text-rose-400"
                  : "text-slate-400"
              }`}
            >
              {mddValue !== null ? formatPercent(mddValue, false) : "-"}
            </span>
          </div>
          <div>
            AUM: <span className="text-white font-mono">{formatAum(fund.aum)}</span>
          </div>
        </div>
      </div>

    </div>
  );
};
