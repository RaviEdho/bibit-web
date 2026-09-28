import React from "react";
import { RangeMetrics } from "../types/fund";
import { formatDate, formatPercent } from "../utils/formatters";
import { TrendingUp, TrendingDown, ShieldAlert, Activity, Calendar, Sparkles } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";

interface MetricsCardsProps {
  metrics: RangeMetrics | null;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics }) => {
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 bg-card/60 border-border/80">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-7 w-28 mb-1.5" />
            <Skeleton className="h-3 w-32" />
          </Card>
        ))}
      </div>
    );
  }

  const isPositive = metrics.totalReturn >= 0;
  const isZeroDrawdown = Math.abs(metrics.maxDrawdown) < 0.05;

  return (
    <div className="space-y-3">
      {/* Selected Range Sub-header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 font-medium">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>Rentang Terpilih:</span>
          <span className="text-foreground font-semibold">
            {formatDate(metrics.startDate)} &ndash; {formatDate(metrics.endDate)}
          </span>
          <span className="text-muted-foreground/80 font-normal">
            ({metrics.days} hari kalender)
          </span>
        </div>
        <div className="text-muted-foreground">
          NAV Awal: <span className="text-foreground font-mono font-medium">{metrics.startNav}</span> &rarr;{" "}
          Akhir: <span className="text-foreground font-mono font-medium">{metrics.endNav}</span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Return */}
        <Card className="bg-card/75 border-border/80 hover:border-border transition-colors">
          <CardContent className="p-3.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total Return</span>
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-400" />
              )}
            </div>
            <div
              className={`text-xl font-bold tracking-tight font-mono mt-1 ${
                isPositive ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {formatPercent(metrics.totalReturn)}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5">Return kumulatif</span>
          </CardContent>
        </Card>

        {/* CAGR */}
        <Card className="bg-card/75 border-border/80 hover:border-border transition-colors">
          <CardContent className="p-3.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>CAGR (Tahunan)</span>
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <div
              className={`text-xl font-bold tracking-tight font-mono mt-1 ${
                metrics.cagr >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {formatPercent(metrics.cagr)}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5">Pertumbuhan majemuk/th</span>
          </CardContent>
        </Card>

        {/* Max Drawdown */}
        <Card
          className={`transition-colors ${
            isZeroDrawdown
              ? "bg-card/50 border-border/60"
              : "bg-rose-950/20 border-rose-900/40"
          }`}
        >
          <CardContent className="p-3.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-xs">
              <span className={isZeroDrawdown ? "text-muted-foreground" : "text-rose-300"}>Max Drawdown</span>
              <ShieldAlert className={`w-4 h-4 ${isZeroDrawdown ? "text-muted-foreground/60" : "text-rose-400"}`} />
            </div>
            <div
              className={`text-xl font-bold tracking-tight mt-1 font-mono ${
                isZeroDrawdown ? "text-muted-foreground/60 font-semibold" : "text-rose-400 font-extrabold"
              }`}
            >
              {formatPercent(metrics.maxDrawdown, false)}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5">Penurunan puncak-ke-lembah</span>
          </CardContent>
        </Card>

        {/* Skor Kualitas */}
        <Card className="bg-card/75 border-border/80 hover:border-border transition-colors">
          <CardContent className="p-3.5 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Skor Kualitas</span>
              </span>
              <Badge variant="cyan" className="text-[10px] px-1.5 py-0 font-mono font-normal">
                Sortino ÷ Ulcer
              </Badge>
            </div>
            <div
              className={`text-xl font-bold tracking-tight font-mono mt-1 ${
                metrics.qualityScore >= 15
                  ? "text-emerald-400"
                  : metrics.qualityScore >= 0
                  ? "text-cyan-300"
                  : "text-rose-400"
              }`}
            >
              {metrics.qualityScore.toFixed(2)}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5" title="Sortino Ratio dan Ulcer Index">
              Sortino: <strong className="text-foreground font-mono">{metrics.sortinoRatio.toFixed(2)}</strong> &bull; Ulcer: <strong className="text-foreground font-mono">{metrics.ulcerIndex.toFixed(2)}%</strong>
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
