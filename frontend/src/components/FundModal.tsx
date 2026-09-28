import React, { useEffect, useState } from "react";
import { FundDetail, RangeMetrics } from "../types/fund";
import { NavChart } from "./NavChart";
import { MetricsCards } from "./MetricsCards";
import { formatAum, formatCurrency, formatDate, formatPercent, formatManagerName } from "../utils/formatters";
import { Calendar, DollarSign, PieChart, Shield, ArrowRightLeft, Network, Banknote } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

interface FundModalProps {
  symbol: string | null;
  onClose: () => void;
  onOpenSwitchGraph?: (symbol: string) => void;
  onSelectFund?: (symbol: string) => void;
}

// In-memory cache for fund details during active session
const fundDetailCache = new Map<string, FundDetail>();

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

    setRangeMetrics(null);

    if (fundDetailCache.has(symbol)) {
      setFundDetail(fundDetailCache.get(symbol)!);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/funds/${symbol}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Fund data not found`);
        return res.json();
      })
      .then((data: FundDetail) => {
        fundDetailCache.set(symbol, data);
        setFundDetail(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [symbol]);

  const isOpen = Boolean(symbol);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl w-[95vw] h-[92vh] max-h-[92vh] p-0 flex flex-col gap-0 overflow-hidden bg-card border-border shadow-2xl">
        {/* Header Bar */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-card/95 text-left shrink-0">
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <DialogTitle className="text-base sm:text-xl font-bold tracking-tight text-foreground truncate">
              {fundDetail?.name || symbol}
            </DialogTitle>
            {symbol && (
              <Badge variant="outline" className="font-mono text-xs">
                {symbol}
              </Badge>
            )}
            {fundDetail?.sharia && (
              <Badge variant="lime" className="text-xs">
                Syariah
              </Badge>
            )}
            {fundDetail?.is_dividend && (
              <Badge variant="success" className="text-xs gap-1" title="Reksa dana dividen: return dan grafik disesuaikan">
                <Banknote className="w-3 h-3 text-emerald-400" />
                <span>Dividen (Adjusted)</span>
              </Badge>
            )}
            {fundDetail?.type && (
              <Badge variant="info" className="text-xs">
                {fundDetail.type}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manajer Investasi:{" "}
            <span className="text-foreground font-medium">
              {formatManagerName(fundDetail?.investment_manager)}
            </span>{" "}
            &bull; Bank Kustodian:{" "}
            <span className="text-foreground font-medium">
              {fundDetail?.custodian_bank || "-"}
            </span>
          </p>
        </DialogHeader>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">Memuat riwayat NAV lengkap...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-destructive/20 border border-destructive/50 rounded-xl text-destructive-foreground text-xs">
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <Card className="p-3 bg-secondary/30 border-border/70">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                    <span>Total AUM</span>
                  </div>
                  <div className="text-sm font-semibold text-foreground mt-1 font-mono">
                    {formatAum(fundDetail.aum)}
                  </div>
                </Card>

                <Card className="p-3 bg-secondary/30 border-border/70">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <PieChart className="w-3.5 h-3.5 text-primary" />
                    <span>Expense Ratio</span>
                  </div>
                  <div className="text-sm font-semibold text-foreground mt-1 font-mono">
                    {fundDetail.expense_ratio != null ? `${(fundDetail.expense_ratio * 100).toFixed(2)}%` : "-"}
                  </div>
                </Card>

                <Card className="p-3 bg-secondary/30 border-border/70">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Peluncuran</span>
                  </div>
                  <div className="text-sm font-semibold text-foreground mt-1">
                    {formatDate(fundDetail.released_date)}
                  </div>
                </Card>

                <Card className="p-3 bg-secondary/30 border-border/70">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    <span>Min. Beli</span>
                  </div>
                  <div className="text-sm font-semibold text-foreground mt-1 font-mono">
                    {formatCurrency(fundDetail.min_buy)}
                  </div>
                </Card>
              </div>

              {/* Static Bibit Official Presets Summary Table */}
              <Card className="p-4 bg-secondary/20 border-border/70">
                <h4 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-3">
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
                    <div key={idx} className="bg-card/80 border border-border/60 rounded-lg p-2.5">
                      <div className="text-[11px] text-muted-foreground">{preset.label}</div>
                      <div
                        className={`text-sm font-bold font-mono mt-0.5 ${
                          (preset.val ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {formatPercent(preset.val)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Daftar Produk Switching */}
              <Card className="p-4 bg-secondary/20 border-border/70">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                      Daftar Produk Switching
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {onOpenSwitchGraph && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenSwitchGraph(fundDetail.symbol)}
                        className="h-7 text-[11px] gap-1 px-2.5 border-cyan-800 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900 hover:text-cyan-100"
                        title="Lihat peta graf interaktif untuk reksa dana ini"
                      >
                        <Network className="w-3 h-3" />
                        <span>Lihat di Graf</span>
                      </Button>
                    )}
                    <Badge variant="outline" className="font-mono text-xs">
                      {fundDetail.switch_destinations?.length || 0} Produk
                    </Badge>
                  </div>
                </div>

                {fundDetail.switch_destinations && fundDetail.switch_destinations.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {fundDetail.switch_destinations.map((dest) => (
                      <div
                        key={dest.symbol}
                        onClick={() => onSelectFund?.(dest.symbol)}
                        className={`flex items-center justify-between p-2.5 rounded-lg bg-card/60 border border-border/60 transition-colors ${
                          onSelectFund ? "hover:border-primary/50 cursor-pointer" : ""
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-medium text-foreground truncate">
                            {dest.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {dest.symbol}
                          </div>
                        </div>
                        <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0 font-normal">
                          {dest.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground py-1">
                    Produk ini tidak memiliki daftar switching ke produk lain.
                  </p>
                )}
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
