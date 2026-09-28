import React, { useState, useMemo } from "react";
import { FundSummary } from "../types/fund";
import { formatAum, formatPercent, formatManagerName } from "../utils/formatters";
import { ArrowUpDown, ArrowUp, ArrowDown, Zap, TrendingUp, Banknote, ArrowRightLeft } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "./ui/table";
import { Badge } from "./ui/badge";

interface FundTableProps {
  funds: FundSummary[];
  onSelectFund: (symbol: string) => void;
  onOpenSwitchGraph?: (symbol: string) => void;
}

type SortField =
  | "name"
  | "type"
  | "nav"
  | "return_1d"
  | "return_1m"
  | "cagr_1y"
  | "cagr_3y"
  | "max_drawdown_1y"
  | "quality_score_1y"
  | "aum";

export const FundTable: React.FC<FundTableProps> = ({ funds, onSelectFund, onOpenSwitchGraph }) => {
  const [sortField, setSortField] = useState<SortField>("aum");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedFunds = useMemo(() => {
    return [...funds].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === "string" && typeof valB === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      const numA = Number(valA);
      const numB = Number(valB);
      return sortAsc ? numA - numB : numB - numA;
    });
  }, [funds, sortField, sortAsc]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground opacity-60 group-hover:opacity-100" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3.5 h-3.5 text-primary" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-primary" />
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xl">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/80 hover:bg-transparent">
            <TableHead
              onClick={() => handleSort("name")}
              className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors group"
            >
              <div className="flex items-center gap-1.5">
                <span>Produk Reksa Dana</span>
                {renderSortIcon("name")}
              </div>
            </TableHead>
            <TableHead
              onClick={() => handleSort("nav")}
              className="py-3 px-3 text-right cursor-pointer hover:text-foreground transition-colors group"
            >
              <div className="flex items-center justify-end gap-1.5">
                <span>NAV Terakhir</span>
                {renderSortIcon("nav")}
              </div>
            </TableHead>
            <TableHead
              onClick={() => handleSort("return_1d")}
              className="py-3 px-3 text-right cursor-pointer hover:text-foreground transition-colors group"
            >
              <div className="flex items-center justify-end gap-1.5">
                <span>1 Hari</span>
                {renderSortIcon("return_1d")}
              </div>
            </TableHead>
            <TableHead
              onClick={() => handleSort("return_1m")}
              className="py-3 px-3 text-right cursor-pointer hover:text-foreground transition-colors group"
            >
              <div className="flex items-center justify-end gap-1.5">
                <span>1 Bulan</span>
                {renderSortIcon("return_1m")}
              </div>
            </TableHead>
            <TableHead
              onClick={() => handleSort("cagr_1y")}
              className="py-3 px-3 text-right cursor-pointer hover:text-foreground transition-colors group"
            >
              <div className="flex items-center justify-end gap-1.5">
                <span>1 Th (CAGR)</span>
                {renderSortIcon("cagr_1y")}
              </div>
            </TableHead>
            <TableHead
              onClick={() => handleSort("cagr_3y")}
              className="py-3 px-3 text-right cursor-pointer hover:text-foreground transition-colors group hidden sm:table-cell"
            >
              <div className="flex items-center justify-end gap-1.5">
                <span>3 Th (CAGR)</span>
                {renderSortIcon("cagr_3y")}
              </div>
            </TableHead>
            <TableHead
              onClick={() => handleSort("max_drawdown_1y")}
              className="py-3 px-3 text-right cursor-pointer hover:text-foreground transition-colors group hidden md:table-cell"
            >
              <div className="flex items-center justify-end gap-1.5">
                <span>1Y Drawdown</span>
                {renderSortIcon("max_drawdown_1y")}
              </div>
            </TableHead>
            <TableHead
              onClick={() => handleSort("quality_score_1y")}
              className="py-3 px-3 text-right cursor-pointer hover:text-foreground transition-colors group hidden lg:table-cell"
              title="Skor Kualitas 1 Tahun (Kombinasi Sortino & Ulcer Index)"
            >
              <div className="flex items-center justify-end gap-1.5">
                <span>Skor Kualitas</span>
                {renderSortIcon("quality_score_1y")}
              </div>
            </TableHead>
            <TableHead
              onClick={() => handleSort("aum")}
              className="py-3 px-4 text-right cursor-pointer hover:text-foreground transition-colors group"
            >
              <div className="flex items-center justify-end gap-1.5">
                <span>AUM</span>
                {renderSortIcon("aum")}
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedFunds.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                Tidak ada produk reksa dana yang sesuai dengan filter.
              </TableCell>
            </TableRow>
          ) : (
            sortedFunds.map((fund) => {
              const r1d = fund.return_1d ?? 0;
              const r1m = fund.return_1m ?? 0;
              const c1y = fund.cagr_1y ?? 0;
              const c3y = fund.cagr_3y ?? 0;

              return (
                <TableRow
                  key={fund.symbol}
                  onClick={() => onSelectFund(fund.symbol)}
                  className="render-optimized-row cursor-pointer group"
                >
                  {/* Name & Badges */}
                  <TableCell className="py-3 px-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {fund.name}
                        </span>
                        {fund.sharia && (
                          <Badge variant="lime" className="text-[10px] px-1.5 py-0">
                            Syariah
                          </Badge>
                        )}
                        {fund.is_instant_redemption && (
                          fund.instant_type === 1 ? (
                            <Badge variant="success" className="text-[10px] px-1.5 py-0 gap-0.5" title="Pencairan Instan Biasa">
                              <Zap className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />
                              Instan
                            </Badge>
                          ) : (
                            <Badge variant="purple" className="text-[10px] px-1.5 py-0 gap-0.5" title="Pencairan Instan+">
                              <Zap className="w-2.5 h-2.5 text-purple-400 fill-purple-400" />
                              Instan+
                            </Badge>
                          )
                        )}
                        {fund.is_index_fund && (
                          <Badge variant="warning" className="text-[10px] px-1.5 py-0 gap-0.5">
                            <TrendingUp className="w-2.5 h-2.5 text-amber-400" />
                            Index
                          </Badge>
                        )}
                        {fund.is_dividend && (
                          <Badge variant="success" className="text-[10px] px-1.5 py-0 gap-0.5">
                            <Banknote className="w-2.5 h-2.5 text-emerald-400" />
                            Dividen
                          </Badge>
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
                            className="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 gap-0.5 hover:bg-cyan-900 transition-colors"
                            title={`Mendukung switching ke ${fund.switch_destinations_count} produk. Klik untuk buka di graf.`}
                          >
                            <ArrowRightLeft className="w-2.5 h-2.5 text-cyan-400" />
                            Switch
                          </button>
                        )}
                        {fund.notbuyable === 1 && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            Tutup
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span className="font-mono text-muted-foreground/80">{fund.symbol}</span>
                        <span>&bull;</span>
                        <span className="text-muted-foreground">{fund.type}</span>
                        {fund.manager && (
                          <>
                            <span>&bull;</span>
                            <span className="text-muted-foreground/80 truncate max-w-[180px]">
                              {formatManagerName(fund.manager)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* NAV */}
                  <TableCell className="py-3 px-3 text-right font-mono text-foreground font-medium">
                    {fund.nav.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                  </TableCell>

                  {/* 1D */}
                  <TableCell
                    className={`py-3 px-3 text-right font-mono font-medium ${
                      r1d > 0
                        ? "text-emerald-400"
                        : r1d < 0
                        ? "text-rose-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatPercent(fund.return_1d)}
                  </TableCell>

                  {/* 1M */}
                  <TableCell
                    className={`py-3 px-3 text-right font-mono font-medium ${
                      r1m > 0
                        ? "text-emerald-400"
                        : r1m < 0
                        ? "text-rose-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatPercent(fund.return_1m)}
                  </TableCell>

                  {/* 1Y CAGR */}
                  <TableCell
                    className={`py-3 px-3 text-right font-mono font-semibold ${
                      c1y > 0
                        ? "text-emerald-400"
                        : c1y < 0
                        ? "text-rose-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatPercent(fund.cagr_1y)}
                  </TableCell>

                  {/* 3Y CAGR */}
                  <TableCell
                    className={`py-3 px-3 text-right font-mono hidden sm:table-cell ${
                      c3y > 0
                        ? "text-emerald-400"
                        : c3y < 0
                        ? "text-rose-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatPercent(fund.cagr_3y)}
                  </TableCell>

                  {/* 1Y Max Drawdown */}
                  <TableCell
                    className={`py-3 px-3 text-right font-mono hidden md:table-cell ${
                      fund.max_drawdown_1y === null || Math.abs(fund.max_drawdown_1y) < 0.05
                        ? "text-muted-foreground/60"
                        : "text-rose-400 font-semibold"
                    }`}
                  >
                    {fund.max_drawdown_1y !== null
                      ? formatPercent(fund.max_drawdown_1y, false)
                      : "-"}
                  </TableCell>

                  {/* 1Y Skor Kualitas */}
                  <TableCell className="py-3 px-3 text-right font-mono text-cyan-300 font-semibold hidden lg:table-cell" title="Skor Kualitas 1 Tahun">
                    {fund.quality_score_1y !== null && fund.quality_score_1y !== undefined ? fund.quality_score_1y.toFixed(2) : "-"}
                  </TableCell>

                  {/* AUM */}
                  <TableCell className="py-3 px-4 text-right font-mono text-muted-foreground">
                    {formatAum(fund.aum)}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {/* Table Footer */}
      <div className="py-2.5 px-4 bg-muted/30 border-t border-border/80 text-[11px] text-muted-foreground flex items-center justify-between">
        <span>Menampilkan {sortedFunds.length} reksa dana</span>
        <span>Klik baris untuk analisis historis & metrik interaktif</span>
      </div>
    </div>
  );
};
