import React, { useState, useMemo } from "react";
import { FundSummary } from "../types/fund";
import { FundCard, ReturnTimeframe } from "./FundCard";
import { FundTable } from "./FundTable";
import { Search, LayoutGrid, Table, ArrowDownUp, Zap, TrendingUp, Banknote, Moon, ArrowRightLeft, Network } from "lucide-react";
import { formatManagerName } from "../utils/formatters";

interface FundGridProps {
  funds: FundSummary[];
  onSelectFund: (symbol: string) => void;
  onOpenSwitchGraph?: (symbol?: string) => void;
}

type SortOption = "quality_desc" | "return_desc" | "aum_desc" | "mdd_asc" | "name_asc";

export const FundGrid: React.FC<FundGridProps> = ({ funds, onSelectFund, onOpenSwitchGraph }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeTimeframe, setActiveTimeframe] = useState<ReturnTimeframe>("1y");
  const [sortOption, setSortOption] = useState<SortOption>("quality_desc");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [onlyTradable, setOnlyTradable] = useState<boolean>(true);
  const [onlySyariah, setOnlySyariah] = useState<boolean>(false);
  const [onlyInstant, setOnlyInstant] = useState<boolean>(false);
  const [onlyIndex, setOnlyIndex] = useState<boolean>(false);
  const [onlyDividend, setOnlyDividend] = useState<boolean>(false);
  const [onlySwitchable, setOnlySwitchable] = useState<boolean>(false);

  const categories = [
    {
      id: "ALL",
      label: "Semua",
      activeClass: "bg-slate-700 text-white border-slate-600 shadow-md shadow-slate-950/40",
      inactiveClass: "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800",
      dotColor: "bg-slate-400",
    },
    {
      id: "Pasar Uang",
      label: "Pasar Uang",
      activeClass: "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/50",
      inactiveClass: "bg-emerald-950/20 border-emerald-800/40 text-emerald-400 hover:bg-emerald-950/50 hover:text-emerald-300",
      dotColor: "bg-emerald-400",
    },
    {
      id: "Obligasi",
      label: "Obligasi",
      activeClass: "bg-sky-600 text-white border-sky-500 shadow-md shadow-sky-950/50",
      inactiveClass: "bg-sky-950/20 border-sky-800/40 text-sky-400 hover:bg-sky-950/50 hover:text-sky-300",
      dotColor: "bg-sky-400",
    },
    {
      id: "Saham",
      label: "Saham",
      activeClass: "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-950/50",
      inactiveClass: "bg-purple-950/20 border-purple-800/40 text-purple-400 hover:bg-purple-950/50 hover:text-purple-300",
      dotColor: "bg-purple-400",
    },
    {
      id: "Lainnya",
      label: "Lainnya",
      activeClass: "bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-950/50",
      inactiveClass: "bg-teal-950/20 border-teal-800/40 text-teal-400 hover:bg-teal-950/50 hover:text-teal-300",
      dotColor: "bg-teal-400",
    },
  ];

  const timeframes: { id: ReturnTimeframe; label: string }[] = [
    { id: "1d", label: "1H" },
    { id: "1m", label: "1B" },
    { id: "ytd", label: "YTD" },
    { id: "1y", label: "1T" },
    { id: "3y", label: "3T" },
    { id: "5y", label: "5T" },
  ];

  // Handler for multi-toggle categories
  const handleCategoryToggle = (id: string) => {
    if (id === "ALL") {
      setSelectedCategories([]);
      return;
    }
    setSelectedCategories((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Step 1: Filter by selected categories, feature toggles, and search query
  const categoryMatchedFunds = useMemo(() => {
    return funds.filter((fund) => {
      // Type filter (if any specific fund types are selected)
      if (selectedCategories.length > 0) {
        const matchesCategory = selectedCategories.some((catId) => {
          if (catId === "Lainnya") {
            return (
              fund.type === "Campuran" ||
              fund.type === "Reksadana Global" ||
              fund.type === "Lainnya" ||
              !["Pasar Uang", "Obligasi", "Saham"].includes(fund.type)
            );
          }
          return fund.type === catId;
        });

        if (!matchesCategory) {
          return false;
        }
      }

      // Syariah filter
      if (onlySyariah && !fund.sharia) {
        return false;
      }

      // Instant Redemption filter
      if (onlyInstant && !fund.is_instant_redemption) {
        return false;
      }

      // Index Fund filter
      if (onlyIndex && !fund.is_index_fund) {
        return false;
      }

      // Dividend filter
      if (onlyDividend && !fund.is_dividend) {
        return false;
      }

      // Switchable filter
      if (onlySwitchable && (!fund.switch_destinations_count || fund.switch_destinations_count <= 0)) {
        return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        fund.name.toLowerCase().includes(q) ||
        fund.symbol.toLowerCase().includes(q) ||
        (fund.manager && (fund.manager.toLowerCase().includes(q) || formatManagerName(fund.manager).toLowerCase().includes(q)))
      );
    });
  }, [funds, selectedCategories, onlySyariah, onlyInstant, onlyIndex, onlyDividend, onlySwitchable, searchQuery]);

  // Step 2: Dynamic counts matching the currently active category / search query
  const tradableCount = useMemo(() => {
    return categoryMatchedFunds.filter((f) => f.notbuyable !== 1 && f.tradeable !== 0).length;
  }, [categoryMatchedFunds]);

  const totalCatalogCount = categoryMatchedFunds.length;

  // Step 3: Filter by onlyTradable toggle and apply sort
  const filteredAndSortedFunds = useMemo(() => {
    return categoryMatchedFunds
      .filter((fund) => {
        if (onlyTradable) {
          if (fund.notbuyable === 1 || fund.tradeable === 0) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case "aum_desc":
            return (b.aum ?? 0) - (a.aum ?? 0);
          case "return_desc": {
            const getVal = (f: FundSummary) => {
              if (activeTimeframe === "1d") return f.return_1d ?? -999;
              if (activeTimeframe === "1m") return f.return_1m ?? -999;
              if (activeTimeframe === "ytd") return f.return_ytd ?? -999;
              if (activeTimeframe === "1y") return f.return_1y ?? f.cagr_1y ?? -999;
              if (activeTimeframe === "3y") return f.return_3y ?? -999;
              if (activeTimeframe === "5y") return f.return_5y ?? -999;
              return 0;
            };
            return getVal(b) - getVal(a);
          }
          case "mdd_asc": {
            const getMdd = (f: FundSummary) => {
              if (activeTimeframe === "1m") return f.max_drawdown_1m ?? -100;
              if (activeTimeframe === "ytd") return f.max_drawdown_ytd ?? -100;
              if (activeTimeframe === "1y") return f.max_drawdown_1y ?? -100;
              if (activeTimeframe === "3y") return f.max_drawdown_3y ?? -100;
              if (activeTimeframe === "5y") return f.max_drawdown_5y ?? -100;
              return f.max_drawdown_1y ?? -100;
            };
            return getMdd(b) - getMdd(a);
          }
          case "quality_desc":
            return (b.quality_score_1y ?? -999) - (a.quality_score_1y ?? -999);
          case "name_asc":
            return a.name.localeCompare(b.name);
          default:
            return 0;
        }
      });
  }, [categoryMatchedFunds, onlyTradable, sortOption, activeTimeframe]);

  return (
    <div className="space-y-4">
      {/* Search & Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama produk, kode, manajer investasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-colors shadow-inner"
          />
        </div>

        {/* View Mode & Sort Dropdown */}
        <div className="flex items-center gap-2 justify-between sm:justify-end">
          {/* Sort Selector */}
          <div className="h-10 flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 sm:px-3 text-xs text-slate-300 min-w-0">
            <ArrowDownUp className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-transparent border-none text-xs text-slate-200 focus:outline-none cursor-pointer py-1 truncate max-w-[130px] sm:max-w-none"
            >
              <option value="quality_desc" className="bg-slate-900 text-white">Skor Kualitas Tertinggi</option>
              <option value="return_desc" className="bg-slate-900 text-white">Return Tertinggi</option>
              <option value="aum_desc" className="bg-slate-900 text-white">AUM Terbesar</option>
              <option value="mdd_asc" className="bg-slate-900 text-white">Drawdown Terendah</option>
              <option value="name_asc" className="bg-slate-900 text-white">Nama (A-Z)</option>
            </select>
          </div>
          {/* View Toggle (Cards vs Table) */}
          <div className="h-10 flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewMode("card")}
              className={`h-full px-2.5 rounded-lg transition-colors flex items-center justify-center ${
                viewMode === "card"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Tampilan Kartu (Mobile-friendly)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`h-full px-2.5 rounded-lg transition-colors flex items-center justify-center ${
                viewMode === "table"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Tampilan Tabel"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>

          {/* Switching Graph Button */}
          {onOpenSwitchGraph && (
            <button
              onClick={() => onOpenSwitchGraph()}
              className="h-10 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/80 text-xs font-semibold transition-all shadow-sm hover:border-cyan-700 active:scale-95 whitespace-nowrap shrink-0"
              title="Buka Peta Jaringan Switching Antar Reksa Dana"
            >
              <Network className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline">Peta Switching</span>
              <span className="sm:hidden">Switching</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Timeframe Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Left Controls: Tradable Switcher, Category Pills, and Special Feature Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tradable Switcher Pill */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-xl text-xs">
            <button
              onClick={() => setOnlyTradable(true)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                onlyTradable
                  ? "bg-brand-600 text-white shadow-md shadow-brand-950/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Dijual di Bibit</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${onlyTradable ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"}`}>
                {tradableCount}
              </span>
            </button>
            <button
              onClick={() => setOnlyTradable(false)}
              className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                !onlyTradable
                  ? "bg-slate-700 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Semua</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${!onlyTradable ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"}`}>
                {totalCatalogCount}
              </span>
            </button>
          </div>

          {/* Category Pills (Wrapping on Mobile) */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => {
              const isActive =
                cat.id === "ALL"
                  ? selectedCategories.length === 0
                  : selectedCategories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryToggle(cat.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                    isActive ? cat.activeClass : cat.inactiveClass
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full transition-transform ${
                      isActive ? "bg-white scale-110" : cat.dotColor
                    }`}
                  />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Special Feature Toggles (Pencairan Instan, Index, Dividen, Syariah) */}
          <div className="flex flex-wrap items-center gap-1.5 pl-0 sm:pl-1 border-t sm:border-t-0 sm:border-l border-slate-800/80 pt-1.5 sm:pt-0">
            {/* 1. Pencairan Instan */}
            <button
              onClick={() => setOnlyInstant(!onlyInstant)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                onlyInstant
                  ? "bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-950/50"
                  : "bg-slate-900 border-slate-800 text-purple-400 hover:bg-purple-950/30 hover:border-purple-800/50"
              }`}
              title="Reksa dana yang bisa dicairkan dalam hitungan detik"
            >
              <Zap className={`w-3.5 h-3.5 ${onlyInstant ? "text-white fill-white" : "text-purple-400"}`} />
              <span>Pencairan Instan</span>
            </button>

            {/* 2. Index Fund */}
            <button
              onClick={() => setOnlyIndex(!onlyIndex)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                onlyIndex
                  ? "bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-950/50"
                  : "bg-slate-900 border-slate-800 text-amber-400 hover:bg-amber-950/30 hover:border-amber-800/50"
              }`}
              title="Reksa dana yang portofolionya mengacu pada indeks tertentu"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Index Fund</span>
            </button>

            {/* 3. Reksa Dana Dividen */}
            <button
              onClick={() => setOnlyDividend(!onlyDividend)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                onlyDividend
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/50"
                  : "bg-slate-900 border-slate-800 text-emerald-400 hover:bg-emerald-950/30 hover:border-emerald-800/50"
              }`}
              title="Reksa dana yang rutin membagikan dividen"
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Dividen</span>
            </button>

            {/* 4. Syariah */}
            <button
              onClick={() => setOnlySyariah(!onlySyariah)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                onlySyariah
                  ? "bg-lime-600 text-white border-lime-500 shadow-md shadow-lime-950/50"
                  : "bg-slate-900 border-slate-800 text-lime-400 hover:bg-lime-950/30 hover:border-lime-800/50"
              }`}
              title="Filter hanya produk reksa dana Syariah"
            >
              <Moon className={`w-3.5 h-3.5 ${onlySyariah ? "text-white fill-white" : "text-lime-400"}`} />
              <span>Syariah</span>
            </button>

            {/* 5. Switchable */}
            <button
              onClick={() => setOnlySwitchable(!onlySwitchable)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                onlySwitchable
                  ? "bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-950/50"
                  : "bg-slate-900 border-slate-800 text-cyan-400 hover:bg-cyan-950/30 hover:border-cyan-800/50"
              }`}
              title="Filter reksa dana yang dapat dialihkan (switching) ke produk lain"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Switching</span>
            </button>
          </div>
        </div>

        {/* Timeframe Pills for Cards */}
        {viewMode === "card" && (
          <div className="flex items-center gap-1.5 self-start md:self-auto bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <span className="text-[11px] text-slate-500 px-2 font-medium">Periode:</span>
            {timeframes.map((tf) => (
              <button
                key={tf.id}
                onClick={() => setActiveTimeframe(tf.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  activeTimeframe === tf.id
                    ? "bg-slate-800 text-brand-400 border border-brand-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {viewMode === "table" ? (
        <FundTable funds={filteredAndSortedFunds} onSelectFund={onSelectFund} onOpenSwitchGraph={onOpenSwitchGraph} />
      ) : (
        <>
          {filteredAndSortedFunds.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-slate-900/60 border border-slate-800 rounded-2xl">
              Tidak ada produk reksa dana yang sesuai dengan pencarian atau filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredAndSortedFunds.map((fund) => (
                <FundCard
                  key={fund.symbol}
                  fund={fund}
                  timeframe={activeTimeframe}
                  onClick={() => onSelectFund(fund.symbol)}
                  onOpenSwitchGraph={onOpenSwitchGraph}
                />
              ))}
            </div>
          )}

          <div className="text-center text-xs text-slate-500 pt-3">
            {onlyTradable
              ? `Menampilkan ${filteredAndSortedFunds.length} reksa dana aktif dijual di Bibit`
              : `Menampilkan ${filteredAndSortedFunds.length} reksa dana (katalog lengkap termasuk produk tutup)`}
          </div>
        </>
      )}
    </div>
  );
};
