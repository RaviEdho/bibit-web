import React, { useState, useMemo } from "react";
import { FundSummary } from "../types/fund";
import { formatAum, formatPercent, formatManagerName } from "../utils/formatters";
import { ArrowUpDown, ArrowUp, ArrowDown, Zap, TrendingUp, Banknote, ArrowRightLeft } from "lucide-react";

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
  | "return_1y"
  | "cagr_1y"
  | "cagr_3y"
  | "max_drawdown_1y"
  | "sharpe_1y"
  | "sortino_1y"
  | "ulcer_index_1y"
  | "martin_ratio_1y"
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
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3.5 h-3.5 text-brand-400" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-brand-400" />
    );
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800/60 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800 select-none">
            <tr>
              <th
                onClick={() => handleSort("name")}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Produk Reksa Dana</span>
                  {renderSortIcon("name")}
                </div>
              </th>
              <th
                onClick={() => handleSort("nav")}
                className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>NAV Terakhir</span>
                  {renderSortIcon("nav")}
                </div>
              </th>
              <th
                onClick={() => handleSort("return_1d")}
                className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>1 Hari</span>
                  {renderSortIcon("return_1d")}
                </div>
              </th>
              <th
                onClick={() => handleSort("return_1m")}
                className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>1 Bulan</span>
                  {renderSortIcon("return_1m")}
                </div>
              </th>
              <th
                onClick={() => handleSort("cagr_1y")}
                className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>1 Th (CAGR)</span>
                  {renderSortIcon("cagr_1y")}
                </div>
              </th>
              <th
                onClick={() => handleSort("cagr_3y")}
                className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors group hidden sm:table-cell"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>3 Th (CAGR)</span>
                  {renderSortIcon("cagr_3y")}
                </div>
              </th>
              <th
                onClick={() => handleSort("max_drawdown_1y")}
                className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors group hidden md:table-cell"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>1Y Drawdown</span>
                  {renderSortIcon("max_drawdown_1y")}
                </div>
              </th>
              <th
                onClick={() => handleSort("quality_score_1y")}
                className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors group hidden lg:table-cell"
                title="Skor Kualitas 1 Tahun (Kombinasi Sortino & Ulcer Index)"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Skor Kualitas</span>
                  {renderSortIcon("quality_score_1y")}
                </div>
              </th>
              <th
                onClick={() => handleSort("aum")}
                className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors group"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>AUM</span>
                  {renderSortIcon("aum")}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sortedFunds.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500">
                  Tidak ada produk reksa dana yang sesuai dengan filter.
                </td>
              </tr>
            ) : (
              sortedFunds.map((fund) => {
                const r1d = fund.return_1d ?? 0;
                const r1m = fund.return_1m ?? 0;
                const c1y = fund.cagr_1y ?? 0;
                const c3y = fund.cagr_3y ?? 0;

                return (
                  <tr
                    key={fund.symbol}
                    onClick={() => onSelectFund(fund.symbol)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    {/* Name & Badges */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-white group-hover:text-brand-400">
                            {fund.name}
                          </span>
                          {fund.sharia && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-lime-950 text-lime-300 border border-lime-800/60">
                              Syariah
                            </span>
                          )}
                          {fund.is_instant_redemption && (
                            fund.instant_type === 1 ? (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-700/60 gap-0.5" title="Pencairan Instan Biasa">
                                <Zap className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />
                                Instan
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-purple-950 text-purple-300 border border-purple-800/60 gap-0.5" title="Pencairan Instan+">
                                <Zap className="w-2.5 h-2.5 text-purple-400 fill-purple-400" />
                                Instan+
                              </span>
                            )
                          )}
                          {fund.is_index_fund && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-950 text-amber-300 border border-amber-800/60 gap-0.5">
                              <TrendingUp className="w-2.5 h-2.5 text-amber-400" />
                              Index
                            </span>
                          )}
                          {fund.is_dividend && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800/60 gap-0.5">
                              <Banknote className="w-2.5 h-2.5 text-emerald-400" />
                              Dividen
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
                              className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-cyan-950 text-cyan-300 border border-cyan-800/60 gap-0.5 ${
                                onOpenSwitchGraph ? "hover:bg-cyan-900 hover:border-cyan-600 cursor-pointer transition-colors" : ""
                              }`}
                              title={`Mendukung switching ke ${fund.switch_destinations_count} produk. Klik untuk buka di graf.`}
                            >
                              <ArrowRightLeft className="w-2.5 h-2.5 text-cyan-400" />
                              Switch
                            </button>
                          )}
                          {fund.notbuyable === 1 && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-800/60">
                              Tutup
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-mono text-slate-500">{fund.symbol}</span>
                          <span>&bull;</span>
                          <span className="text-slate-400">{fund.type}</span>
                          {fund.manager && (
                            <>
                              <span>&bull;</span>
                              <span className="text-slate-500 truncate max-w-[180px]">
                                {formatManagerName(fund.manager)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* NAV */}
                    <td className="py-3 px-3 text-right font-mono text-white font-medium">
                      {fund.nav.toLocaleString("id-ID", { minimumFractionDigits: 2 })}
                    </td>

                    {/* 1D */}
                    <td
                      className={`py-3 px-3 text-right font-mono font-medium ${
                        r1d > 0
                          ? "text-emerald-400"
                          : r1d < 0
                          ? "text-rose-400"
                          : "text-slate-400"
                      }`}
                    >
                      {formatPercent(fund.return_1d)}
                    </td>

                    {/* 1M */}
                    <td
                      className={`py-3 px-3 text-right font-mono font-medium ${
                        r1m > 0
                          ? "text-emerald-400"
                          : r1m < 0
                          ? "text-rose-400"
                          : "text-slate-400"
                      }`}
                    >
                      {formatPercent(fund.return_1m)}
                    </td>

                    {/* 1Y CAGR */}
                    <td
                      className={`py-3 px-3 text-right font-mono font-semibold ${
                        c1y > 0
                          ? "text-emerald-400"
                          : c1y < 0
                          ? "text-rose-400"
                          : "text-slate-400"
                      }`}
                    >
                      {formatPercent(fund.cagr_1y)}
                    </td>

                    {/* 3Y CAGR */}
                    <td
                      className={`py-3 px-3 text-right font-mono hidden sm:table-cell ${
                        c3y > 0
                          ? "text-emerald-400"
                          : c3y < 0
                          ? "text-rose-400"
                          : "text-slate-400"
                      }`}
                    >
                      {formatPercent(fund.cagr_3y)}
                    </td>

                    {/* 1Y Max Drawdown */}
                    <td
                      className={`py-3 px-3 text-right font-mono hidden md:table-cell ${
                        fund.max_drawdown_1y === null || Math.abs(fund.max_drawdown_1y) < 0.05
                          ? "text-slate-500 opacity-60"
                          : "text-rose-400 font-semibold"
                      }`}
                    >
                      {fund.max_drawdown_1y !== null
                        ? formatPercent(fund.max_drawdown_1y, false)
                        : "-"}
                    </td>

                    {/* 1Y Skor Kualitas */}
                    <td className="py-3 px-3 text-right font-mono text-cyan-300 font-semibold hidden lg:table-cell" title="Skor Kualitas 1 Tahun">
                      {fund.quality_score_1y !== null && fund.quality_score_1y !== undefined ? fund.quality_score_1y.toFixed(2) : "-"}
                    </td>

                    {/* AUM */}
                    <td className="py-3 px-4 text-right font-mono text-slate-300">
                      {formatAum(fund.aum)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="py-2.5 px-4 bg-slate-800/40 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Menampilkan {sortedFunds.length} reksa dana</span>
        <span className="text-slate-500">Klik baris mana saja untuk melihat grafik interaktif</span>
      </div>
    </div>
  );
};
