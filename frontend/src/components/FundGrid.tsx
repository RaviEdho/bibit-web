import React, { useState, useMemo, useCallback, useDeferredValue, useEffect, useRef } from "react";
import { FundSummary } from "../types/fund";
import { FundCard, ReturnTimeframe } from "./FundCard";
import { FundTable } from "./FundTable";
import {
  Search,
  LayoutGrid,
  Table as TableIcon,
  Zap,
  TrendingUp,
  Banknote,
  Moon,
  ArrowRightLeft,
  X,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import { formatManagerName } from "../utils/formatters";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface FundGridProps {
  funds: FundSummary[];
  onSelectFund: (symbol: string) => void;
  onOpenSwitchGraph?: (symbol?: string) => void;
}

type SortOption = "quality_desc" | "return_desc" | "aum_desc" | "mdd_asc" | "name_asc";

const INITIAL_BATCH_SIZE = 36;
const BATCH_INCREMENT = 36;

export const FundGrid: React.FC<FundGridProps> = ({ funds, onSelectFund, onOpenSwitchGraph }) => {
  const [searchQuery, setSearchQuery] = useState("");
  // Deferred value keeps input typing instantaneous at 120 FPS
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const isStale = searchQuery !== deferredSearchQuery;

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

  // Incremental rendering batch size
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_BATCH_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const categories = [
    { id: "ALL", label: "Semua", dot: "bg-muted-foreground" },
    { id: "Pasar Uang", label: "Pasar Uang", dot: "bg-emerald-400" },
    { id: "Obligasi", label: "Obligasi", dot: "bg-sky-400" },
    { id: "Saham", label: "Saham", dot: "bg-purple-400" },
    { id: "Lainnya", label: "Campuran/Lainnya", dot: "bg-teal-400" },
  ];

  const timeframes: { id: ReturnTimeframe; label: string }[] = [
    { id: "1d", label: "1H" },
    { id: "1m", label: "1B" },
    { id: "ytd", label: "YTD" },
    { id: "1y", label: "1T" },
    { id: "3y", label: "3T" },
    { id: "5y", label: "5T" },
  ];

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

  // Step 1: Filter by category, special tags, and deferred search
  const categoryMatchedFunds = useMemo(() => {
    return funds.filter((fund) => {
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

        if (!matchesCategory) return false;
      }

      if (onlySyariah && !fund.sharia) return false;
      if (onlyInstant && !fund.is_instant_redemption) return false;
      if (onlyIndex && !fund.is_index_fund) return false;
      if (onlyDividend && !fund.is_dividend) return false;
      if (onlySwitchable && (!fund.switch_destinations_count || fund.switch_destinations_count <= 0)) {
        return false;
      }

      if (!deferredSearchQuery.trim()) return true;
      const q = deferredSearchQuery.toLowerCase();
      return (
        fund.name.toLowerCase().includes(q) ||
        fund.symbol.toLowerCase().includes(q) ||
        (fund.manager && (fund.manager.toLowerCase().includes(q) || formatManagerName(fund.manager).toLowerCase().includes(q)))
      );
    });
  }, [funds, selectedCategories, onlySyariah, onlyInstant, onlyIndex, onlyDividend, onlySwitchable, deferredSearchQuery]);

  // Step 2: Counts
  const tradableCount = useMemo(() => {
    return categoryMatchedFunds.filter((f) => f.notbuyable !== 1 && f.tradeable !== 0).length;
  }, [categoryMatchedFunds]);

  const totalCatalogCount = categoryMatchedFunds.length;

  // Step 3: Filter by onlyTradable & sort
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
          case "quality_desc": {
            const getQuality = (f: FundSummary) => {
              if (activeTimeframe === "1m") return f.quality_score_1m ?? -999;
              if (activeTimeframe === "ytd") return f.quality_score_ytd ?? -999;
              if (activeTimeframe === "1y") return f.quality_score_1y ?? -999;
              if (activeTimeframe === "3y") return f.quality_score_3y ?? -999;
              if (activeTimeframe === "5y") return f.quality_score_5y ?? -999;
              return f.quality_score_1y ?? -999;
            };
            return getQuality(b) - getQuality(a);
          }
          case "name_asc":
            return a.name.localeCompare(b.name);
          default:
            return 0;
        }
      });
  }, [categoryMatchedFunds, onlyTradable, sortOption, activeTimeframe]);

  // Reset visibleCount whenever filters change to keep initial DOM lightweight
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH_SIZE);
  }, [selectedCategories, onlyTradable, onlySyariah, onlyInstant, onlyIndex, onlyDividend, onlySwitchable, deferredSearchQuery, sortOption]);

  // IntersectionObserver for auto-infinite scrolling
  useEffect(() => {
    if (viewMode !== "card") return;
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + BATCH_INCREMENT, filteredAndSortedFunds.length));
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [viewMode, filteredAndSortedFunds.length]);

  // Sliced funds for card mode to avoid rendering 3,500+ DOM nodes at once
  const visibleFunds = useMemo(() => {
    return filteredAndSortedFunds.slice(0, visibleCount);
  }, [filteredAndSortedFunds, visibleCount]);

  // Stable callbacks for React.memo on FundCard
  const handleSelectFund = useCallback((symbol: string) => {
    onSelectFund(symbol);
  }, [onSelectFund]);

  const handleOpenSwitchGraph = useCallback((symbol?: string) => {
    onOpenSwitchGraph?.(symbol);
  }, [onOpenSwitchGraph]);

  const activeFiltersCount =
    (onlySyariah ? 1 : 0) +
    (onlyInstant ? 1 : 0) +
    (onlyIndex ? 1 : 0) +
    (onlyDividend ? 1 : 0) +
    (onlySwitchable ? 1 : 0) +
    (selectedCategories.length > 0 ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setOnlySyariah(false);
    setOnlyInstant(false);
    setOnlyIndex(false);
    setOnlyDividend(false);
    setOnlySwitchable(false);
    setSearchQuery("");
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Display Controls Bar */}
      <div className="bg-card/70 border border-border/80 rounded-2xl p-3 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Bar with live indicator */}
          <div className="relative flex-1 max-w-md">
            {isStale ? (
              <Loader2 className="w-4 h-4 text-primary absolute left-3 top-1/2 -translate-y-1/2 animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            )}
            <Input
              type="text"
              placeholder="Cari nama reksa dana, kode, atau MI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-10 bg-background/80 border-border/80 text-foreground text-xs sm:text-sm rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Selector & View Toggle */}
          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <div className="w-[190px]">
              <Select value={sortOption} onValueChange={(val) => setSortOption(val as SortOption)}>
                <SelectTrigger className="h-10 text-xs bg-background/80 border-border/80 rounded-xl">
                  <SelectValue placeholder="Urutkan..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quality_desc">Skor Kualitas Tertinggi</SelectItem>
                  <SelectItem value="return_desc">Return Tertinggi</SelectItem>
                  <SelectItem value="aum_desc">AUM Terbesar</SelectItem>
                  <SelectItem value="mdd_asc">Drawdown Terendah</SelectItem>
                  <SelectItem value="name_asc">Nama (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle */}
            <div className="h-10 flex items-center bg-background/80 border border-border/80 rounded-xl p-1 gap-1">
              <Button
                variant={viewMode === "card" ? "brand" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("card")}
                className={`rounded-lg h-8 w-8 ${viewMode === "card" ? "" : "text-muted-foreground hover:text-foreground"}`}
                title="Tampilan Kartu"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "brand" : "ghost"}
                size="icon-sm"
                onClick={() => setViewMode("table")}
                className={`rounded-lg h-8 w-8 ${viewMode === "table" ? "" : "text-muted-foreground hover:text-foreground"}`}
                title="Tampilan Tabel"
              >
                <TableIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Category Segmented Bar + Special Feature Chips */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1 border-t border-border/60">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Tradable Switcher Pill */}
            <div className="flex items-center bg-background/80 border border-border/80 p-0.5 rounded-xl text-xs mr-1">
              <button
                onClick={() => setOnlyTradable(true)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  onlyTradable
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Dijual di Bibit</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${onlyTradable ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                  {tradableCount}
                </span>
              </button>
              <button
                onClick={() => setOnlyTradable(false)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                  !onlyTradable
                    ? "bg-secondary text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>Semua</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${!onlyTradable ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                  {totalCatalogCount}
                </span>
              </button>
            </div>

            {categories.map((cat) => {
              const isActive =
                cat.id === "ALL"
                  ? selectedCategories.length === 0
                  : selectedCategories.includes(cat.id);

              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryToggle(cat.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all border flex items-center gap-1.5 ${
                    isActive
                      ? "bg-secondary text-foreground border-border shadow-sm font-semibold"
                      : "bg-background/40 border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full transition-transform ${
                      isActive ? "bg-primary scale-110" : cat.dot
                    }`}
                  />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Timeframe Selector (in Card view) */}
          {viewMode === "card" && (
            <div className="flex items-center gap-1 self-start lg:self-auto bg-background/80 border border-border/80 p-0.5 rounded-xl">
              <span className="text-[11px] text-muted-foreground px-2 font-medium">Periode:</span>
              {timeframes.map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setActiveTimeframe(tf.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    activeTimeframe === tf.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Feature Filter Badges Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mr-1">
            <SlidersHorizontal className="w-3 h-3 text-muted-foreground" />
            <span>Fitur:</span>
          </div>

          {/* 1. Pencairan Instan */}
          <button
            onClick={() => setOnlyInstant(!onlyInstant)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5 ${
              onlyInstant
                ? "bg-purple-950/80 border-purple-600 text-purple-300 shadow-sm"
                : "bg-background/40 border-border/50 text-muted-foreground hover:text-purple-300 hover:border-purple-800/50"
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${onlyInstant ? "text-purple-400 fill-purple-400" : "text-muted-foreground"}`} />
            <span>Pencairan Instan</span>
          </button>

          {/* 2. Index Fund */}
          <button
            onClick={() => setOnlyIndex(!onlyIndex)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5 ${
              onlyIndex
                ? "bg-amber-950/80 border-amber-600 text-amber-300 shadow-sm"
                : "bg-background/40 border-border/50 text-muted-foreground hover:text-amber-300 hover:border-amber-800/50"
            }`}
          >
            <TrendingUp className={`w-3.5 h-3.5 ${onlyIndex ? "text-amber-400" : "text-muted-foreground"}`} />
            <span>Index Fund</span>
          </button>

          {/* 3. Dividen */}
          <button
            onClick={() => setOnlyDividend(!onlyDividend)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5 ${
              onlyDividend
                ? "bg-emerald-950/80 border-emerald-600 text-emerald-300 shadow-sm"
                : "bg-background/40 border-border/50 text-muted-foreground hover:text-emerald-300 hover:border-emerald-800/50"
            }`}
          >
            <Banknote className={`w-3.5 h-3.5 ${onlyDividend ? "text-emerald-400" : "text-muted-foreground"}`} />
            <span>Dividen</span>
          </button>

          {/* 4. Syariah */}
          <button
            onClick={() => setOnlySyariah(!onlySyariah)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5 ${
              onlySyariah
                ? "bg-lime-950/80 border-lime-600 text-lime-300 shadow-sm"
                : "bg-background/40 border-border/50 text-muted-foreground hover:text-lime-300 hover:border-lime-800/50"
            }`}
          >
            <Moon className={`w-3.5 h-3.5 ${onlySyariah ? "text-lime-400 fill-lime-400" : "text-muted-foreground"}`} />
            <span>Syariah</span>
          </button>

          {/* 5. Switchable */}
          <button
            onClick={() => setOnlySwitchable(!onlySwitchable)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5 ${
              onlySwitchable
                ? "bg-cyan-950/80 border-cyan-600 text-cyan-300 shadow-sm"
                : "bg-background/40 border-border/50 text-muted-foreground hover:text-cyan-300 hover:border-cyan-800/50"
            }`}
          >
            <ArrowRightLeft className={`w-3.5 h-3.5 ${onlySwitchable ? "text-cyan-400" : "text-muted-foreground"}`} />
            <span>Bisa Switch</span>
          </button>

          {/* Clear all filters button */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 ml-1 px-1"
            >
              Reset Filter
            </button>
          )}

          <div className="ml-auto text-xs text-muted-foreground font-mono">
            {filteredAndSortedFunds.length} hasil
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === "table" ? (
        <FundTable funds={filteredAndSortedFunds} onSelectFund={handleSelectFund} onOpenSwitchGraph={handleOpenSwitchGraph} />
      ) : (
        <>
          {filteredAndSortedFunds.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground bg-card/40 border border-border/60 rounded-2xl space-y-2">
              <p className="text-sm font-medium">Tidak ada produk reksa dana yang sesuai dengan pencarian atau filter.</p>
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                Bersihkan Semua Filter
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {visibleFunds.map((fund) => (
                <FundCard
                  key={fund.symbol}
                  fund={fund}
                  timeframe={activeTimeframe}
                  onSelect={handleSelectFund}
                  onOpenSwitchGraph={handleOpenSwitchGraph}
                />
              ))}
            </div>
          )}

          {/* Infinite Scroll Sentinel / Load More Controls */}
          {viewMode === "card" && filteredAndSortedFunds.length > visibleCount && (
            <div ref={loadMoreRef} className="pt-4 pb-2 flex flex-col items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleCount((prev) => Math.min(prev + BATCH_INCREMENT, filteredAndSortedFunds.length))}
                className="text-xs gap-1.5"
              >
                <span>Tampilkan {Math.min(BATCH_INCREMENT, filteredAndSortedFunds.length - visibleCount)} Produk Lagi</span>
                <span className="text-[11px] text-muted-foreground font-mono">({visibleCount}/{filteredAndSortedFunds.length})</span>
              </Button>
            </div>
          )}

          <div className="text-center text-xs text-muted-foreground pt-2">
            {onlyTradable
              ? `Menampilkan ${Math.min(visibleCount, filteredAndSortedFunds.length)} dari ${filteredAndSortedFunds.length} reksa dana aktif dijual di Bibit`
              : `Menampilkan ${Math.min(visibleCount, filteredAndSortedFunds.length)} dari ${filteredAndSortedFunds.length} reksa dana katalog`}
          </div>
        </>
      )}
    </div>
  );
};
