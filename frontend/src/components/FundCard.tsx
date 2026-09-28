import React, { useCallback } from "react";
import { FundSummary } from "../types/fund";
import { formatAum, formatPercent, formatManagerName } from "../utils/formatters";
import { TrendingUp, TrendingDown, ChevronRight, Zap, Banknote, ArrowRightLeft, Sparkles } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

export type ReturnTimeframe = "1d" | "1m" | "ytd" | "1y" | "3y" | "5y";

interface FundCardProps {
  fund: FundSummary;
  timeframe: ReturnTimeframe;
  onClick?: () => void;
  onSelect?: (symbol: string) => void;
  onOpenSwitchGraph?: (symbol: string) => void;
}

const FundCardComponent: React.FC<FundCardProps> = ({
  fund,
  timeframe,
  onClick,
  onSelect,
  onOpenSwitchGraph,
}) => {
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
  const qualityLabel = "Skor Kualitas";

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

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "Pasar Uang":
        return "success" as const;
      case "Obligasi":
        return "info" as const;
      case "Saham":
        return "purple" as const;
      default:
        return "secondary" as const;
    }
  };

  const handleCardClick = useCallback(() => {
    if (onSelect) {
      onSelect(fund.symbol);
    } else if (onClick) {
      onClick();
    }
  }, [onSelect, onClick, fund.symbol]);

  const handleSwitchClick = useCallback((e: React.MouseEvent) => {
    if (onOpenSwitchGraph) {
      e.stopPropagation();
      onOpenSwitchGraph(fund.symbol);
    }
  }, [onOpenSwitchGraph, fund.symbol]);

  return (
    <Card
      onClick={handleCardClick}
      className="render-optimized-card bg-card/90 hover:bg-accent/40 border-border/80 hover:border-primary/50 transition-all duration-200 cursor-pointer shadow-md hover:shadow-primary/5 active:scale-[0.99] flex flex-col justify-between group p-4 sm:p-5"
    >
      {/* Top Header: Badges */}
      <div>
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          <Badge variant={getTypeBadgeVariant(fund.type)} className="text-[10px] font-semibold py-0.5 px-2">
            {fund.type}
          </Badge>

          {fund.sharia && (
            <Badge variant="lime" className="text-[10px] font-semibold py-0.5 px-2">
              Syariah
            </Badge>
          )}

          {fund.is_instant_redemption && (
            fund.instant_type === 1 ? (
              <Badge variant="success" className="text-[10px] font-semibold py-0.5 px-1.5 gap-0.5" title="Pencairan Instan Biasa">
                <Zap className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />
                <span>Instan</span>
              </Badge>
            ) : (
              <Badge variant="purple" className="text-[10px] font-semibold py-0.5 px-1.5 gap-0.5" title="Pencairan Instan+">
                <Zap className="w-2.5 h-2.5 text-purple-400 fill-purple-400" />
                <span>Instan+</span>
              </Badge>
            )
          )}

          {fund.is_index_fund && (
            <Badge variant="warning" className="text-[10px] font-semibold py-0.5 px-1.5 gap-0.5" title="Index Fund">
              <TrendingUp className="w-2.5 h-2.5 text-amber-400" />
              <span>Index</span>
            </Badge>
          )}

          {fund.is_dividend && (
            <Badge variant="success" className="text-[10px] font-semibold py-0.5 px-1.5 gap-0.5" title="Reksa Dana Dividen">
              <Banknote className="w-2.5 h-2.5 text-emerald-400" />
              <span>Dividen</span>
            </Badge>
          )}

          {(fund.switch_destinations_count ?? 0) > 0 && (
            <button
              type="button"
              onClick={handleSwitchClick}
              className="inline-flex items-center gap-0.5 rounded-md border border-cyan-800/60 bg-cyan-950/80 hover:bg-cyan-900 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300 transition-colors"
              title={`Mendukung switching ke ${fund.switch_destinations_count} produk. Klik untuk buka di graf.`}
            >
              <ArrowRightLeft className="w-2.5 h-2.5 text-cyan-400" />
              <span>Switch</span>
            </button>
          )}

          {fund.notbuyable === 1 && (
            <Badge variant="destructive" className="text-[10px] font-semibold py-0.5 px-2">
              Tutup
            </Badge>
          )}

          <span className="ml-auto text-[11px] font-mono text-muted-foreground">
            {fund.symbol}
          </span>
        </div>

        {/* Fund Title & Manager */}
        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
          {fund.name}
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all inline-block ml-1 align-[-2px]" />
        </h3>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {formatManagerName(fund.manager)}
        </p>
      </div>

      {/* Main Metrics Section */}
      <div className="mt-3.5 space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Return Metric Box */}
          <div className="bg-secondary/40 border border-border/70 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
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

          {/* Quality Score Metric Box */}
          <div className="bg-secondary/40 border border-border/70 rounded-xl p-2.5 sm:p-3 flex flex-col justify-between">
            <div className="flex items-center gap-1 text-[11px] text-cyan-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate font-medium">{qualityLabel}</span>
            </div>
            <div className="text-lg sm:text-xl font-extrabold tracking-tight font-mono mt-1 text-cyan-300">
              {qualityScore !== null ? qualityScore.toFixed(2) : "-"}
            </div>
          </div>
        </div>

        {/* Secondary Stats Row */}
        <div className="flex items-center justify-between text-xs px-1 text-muted-foreground font-medium">
          <div title={mddLabel}>
            Drawdown:{" "}
            <span
              className={`font-mono font-semibold ${
                mddValue !== null && Math.abs(mddValue) >= 0.05
                  ? "text-rose-400"
                  : "text-muted-foreground"
              }`}
            >
              {mddValue !== null ? formatPercent(mddValue, false) : "-"}
            </span>
          </div>
          <div>
            AUM: <span className="text-foreground font-mono">{formatAum(fund.aum)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const FundCard = React.memo(FundCardComponent);
