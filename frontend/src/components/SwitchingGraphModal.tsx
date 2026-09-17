import React, { useEffect, useState, useMemo, useRef } from "react";
import { SwitchingGraphResponse, GraphNode } from "../types/fund";
import { formatAum, formatCurrency, formatManagerName } from "../utils/formatters";
import { X, ArrowRightLeft, Search, Building2, ExternalLink, Network, ListTree, Sparkles, ChevronUp, ChevronDown, Zap, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface SwitchingGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFund: (symbol: string) => void;
  initialSymbol?: string | null;
}

const TYPE_COLORS: Record<string, { bg: string; border: string; text: string; fill: string }> = {
  "Pasar Uang": { bg: "bg-emerald-950", border: "#10b981", text: "text-emerald-400", fill: "#10b981" },
  Obligasi: { bg: "bg-sky-950", border: "#0ea5e9", text: "text-sky-400", fill: "#0ea5e9" },
  Saham: { bg: "bg-purple-950", border: "#a855f7", text: "text-purple-400", fill: "#a855f7" },
  Campuran: { bg: "bg-amber-950", border: "#f59e0b", text: "text-amber-400", fill: "#f59e0b" },
  Lainnya: { bg: "bg-teal-950", border: "#14b8a6", text: "text-teal-400", fill: "#14b8a6" },
};

function getTypeColor(type: string) {
  return TYPE_COLORS[type] || TYPE_COLORS["Lainnya"];
}

function splitFundName(name: string): string[] {
  if (name.length <= 16) return [name];
  const words = name.split(" ");
  if (words.length <= 1) return [name.slice(0, 15) + "…"];
  let line1 = words[0];
  let i = 1;
  while (i < words.length && (line1 + " " + words[i]).length <= 16) {
    line1 += " " + words[i];
    i++;
  }
  let line2 = words.slice(i).join(" ");
  if (line2.length > 18) line2 = line2.slice(0, 16) + "…";
  return line2 ? [line1, line2] : [line1];
}

export const SwitchingGraphModal: React.FC<SwitchingGraphModalProps> = ({
  isOpen,
  onClose,
  onSelectFund,
  initialSymbol,
}) => {
  const [data, setData] = useState<SwitchingGraphResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedManager, setSelectedManager] = useState<string>("");
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewTab, setViewTab] = useState<"graph" | "matrix">("graph");
  const [isMobileExpanded, setIsMobileExpanded] = useState<boolean>(false);
  const [focusMode, setFocusMode] = useState<"targets" | "senders">("targets");
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [zoom, setZoom] = useState<number>(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? 0.88 : 1
  );
  const [pan, setPan] = useState<{ x: number; y: number }>(() => ({
    x: 0,
    y: typeof window !== "undefined" && window.innerWidth < 768 ? -6 : 0,
  }));

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const touchDistanceRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef(1);

  // Reset pan & zoom when switching manager
  useEffect(() => {
    setZoom(isMobile ? 0.88 : 1);
    setPan({ x: 0, y: isMobile ? -6 : 0 });
  }, [selectedManager, isMobile]);

  // Non-passive wheel zoom listener on SVG
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 0.88;
      setZoom((prev) => Math.min(Math.max(prev * factor, 0.6), 3.5));
    };
    svgEl.addEventListener("wheel", handleWheel, { passive: false });
    return () => svgEl.removeEventListener("wheel", handleWheel);
  }, []);

  // Mouse handlers for desktop pan
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.hypot(dx, dy) > 4) {
      hasMovedRef.current = true;
    }
    setPan({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch handlers for mobile pan & pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      hasMovedRef.current = false;
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStartRef.current = { ...pan };
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
      touchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchDistanceRef.current;
      setZoom(Math.min(Math.max(touchStartZoomRef.current * factor, 0.6), 3.5));
      hasMovedRef.current = true;
    } else if (e.touches.length === 1 && isDraggingRef.current) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      if (Math.hypot(dx, dy) > 4) {
        hasMovedRef.current = true;
      }
      setPan({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    touchDistanceRef.current = null;
  };

  // Load graph JSON
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);

    fetch(`/api/switching_graph.json?t=${Date.now()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Gagal memuat data graf switching`);
        return res.json();
      })
      .then((json: SwitchingGraphResponse) => {
        setData(json);
        setLoading(false);

        // Auto-select manager if initialSymbol provided
        if (initialSymbol) {
          const found = json.nodes.find((n) => n.symbol === initialSymbol);
          if (found) {
            setSelectedManager(found.manager);
            setSelectedSymbol(found.symbol);
            return;
          }
        }
        // Default to the manager with the most switching pairs
        if (json.managers.length > 0) {
          setSelectedManager(json.managers[0].name);
        }
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [isOpen, initialSymbol]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Active manager data
  const activeManager = useMemo(() => {
    if (!data) return null;
    return data.managers.find((m) => m.name === selectedManager) || data.managers[0] || null;
  }, [data, selectedManager]);

  // Filtered funds in active manager
  const managerFunds = useMemo(() => {
    if (!activeManager) return [];
    if (!searchQuery.trim()) return activeManager.funds;
    const q = searchQuery.toLowerCase();
    return activeManager.funds.filter(
      (f) => f.name.toLowerCase().includes(q) || f.symbol.toLowerCase().includes(q)
    );
  }, [activeManager, searchQuery]);
  const isSearching = searchQuery.trim().length > 0;
  const searchMatchingSymbols = useMemo(() => {
    if (!isSearching || !activeManager) return new Set<string>();
    const q = searchQuery.toLowerCase().trim();
    return new Set(
      activeManager.funds
        .filter((f) => f.symbol.toLowerCase().includes(q) || f.name.toLowerCase().includes(q))
        .map((f) => f.symbol)
    );
  }, [searchQuery, isSearching, activeManager]);

  // Auto-switch to manager with most matches (or exact symbol match)
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!data || !q) return;

    // Priority 1: Exact fund symbol match anywhere in data
    const exactFund = data.nodes.find((n) => n.symbol.toLowerCase() === q);
    if (exactFund) {
      if (exactFund.manager !== selectedManager) {
        setSelectedManager(exactFund.manager);
      }
      setSelectedSymbol(exactFund.symbol);
      return;
    }

    // Priority 2: If current manager already has matches, remain on it
    if (activeManager) {
      const currentMatches = activeManager.funds.some(
        (f) => f.symbol.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)
      );
      if (currentMatches) return;
    }

    // Priority 3: Current manager has 0 matches -> find manager with most matches
    let bestMgr = "";
    let maxScore = 0;
    data.managers.forEach((m) => {
      const nameMatch = m.name.toLowerCase().includes(q);
      const matchingCount = m.funds.filter(
        (f) => f.symbol.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)
      ).length;
      const score = matchingCount + (nameMatch ? 50 : 0);
      if (score > maxScore) {
        maxScore = score;
        bestMgr = m.name;
      }
    });

    if (bestMgr && bestMgr !== selectedManager) {
      setSelectedManager(bestMgr);
      setSelectedSymbol(null);
      setHoveredSymbol(null);
    }
  }, [searchQuery, data]);


  // Active inspector node
  const inspectNode: GraphNode | null = useMemo(() => {
    const sym = hoveredSymbol || selectedSymbol;
    if (!sym || !data) return null;
    return data.nodes.find((n) => n.symbol === sym) || null;
  }, [hoveredSymbol, selectedSymbol, data]);

  // SVG Geometry calculations for circular network graph
  const graphDimensions = 720;
  const center = graphDimensions / 2;
  const radius = 236;

  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number; angle: number }> = {};
    const funds = activeManager?.funds || [];
    const count = funds.length;
    if (count === 0) return positions;

    funds.forEach((fund, index) => {
      const angle = (2 * Math.PI * index) / count - Math.PI / 2;
      positions[fund.symbol] = {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
        angle,
      };
    });

    return positions;
  }, [activeManager, center, radius]);

  // Highlighted connections for hovered/selected symbol
  const activeFocusSymbol = hoveredSymbol || selectedSymbol;
  const isTargetMode = focusMode === "targets";

  // Responsive node radii & curve offsets (Enlarged on mobile for better touch targets and clarity)
  const baseNodeRadius = isMobile ? 21 : 16;
  const focusedNodeRadius = isMobile ? 26 : 20;
  const getNodeRadius = (symbol: string) =>
    activeFocusSymbol === symbol ? focusedNodeRadius : baseNodeRadius;

  const connectedOutgoing = useMemo(() => {
    if (!activeFocusSymbol || !data) return new Set<string>();
    return new Set(data.adjacency[activeFocusSymbol] || []);
  }, [activeFocusSymbol, data]);

  const connectedIncoming = useMemo(() => {
    if (!activeFocusSymbol || !activeManager) return new Set<string>();
    const inc = new Set<string>();
    activeManager.edges.forEach((edge) => {
      if (edge.target === activeFocusSymbol) {
        inc.add(edge.source);
      }
    });
    return inc;
  }, [activeFocusSymbol, activeManager]);

  const incomingSenders = useMemo(() => {
    if (!inspectNode || !activeManager || !data) return [];
    const senderSymbols = activeManager.edges
      .filter((e) => e.target === inspectNode.symbol)
      .map((e) => e.source);
    return data.nodes.filter((n) => senderSymbols.includes(n.symbol));
  }, [inspectNode, activeManager, data]);

  // Click handler: toggles continuously between Targets and Senders on the same node
  const handleNodeClick = (symbol: string) => {
    if (hasMovedRef.current) return; // Ignore clicks if user was panning/dragging
    if (selectedSymbol === symbol) {
      setFocusMode((prev) => (prev === "targets" ? "senders" : "targets"));
    } else {
      setSelectedSymbol(symbol);
      setFocusMode("targets");
    }
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 sm:px-5 sm:py-3 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400 shadow shrink-0">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                  Peta Switching Reksa Dana
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 shrink-0">
                  <Sparkles className="w-2.5 h-2.5" />
                  Visual Graf
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                Arah pengalihan produk per Manajer Investasi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {data && (
              <div className="hidden md:flex items-center gap-1.5 text-xs font-mono bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60 text-slate-300">
                <span>{data.total_funds} Produk</span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-cyan-400">{data.total_edges} Jalur</span>
                <span className="text-slate-600">&bull;</span>
                <span>{data.total_managers} MI</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Tutup (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Controls */}
        <div className="px-3 py-2 sm:px-5 sm:py-2.5 border-b border-slate-800/80 bg-slate-900/60 flex flex-wrap items-center justify-between gap-2 sm:gap-2.5">
          {/* Manager Dropdown & Search */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/70 rounded-xl px-3 py-1.5 text-xs text-slate-200">
              <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <select
                value={selectedManager}
                onChange={(e) => {
                  setSelectedManager(e.target.value);
                  setSelectedSymbol(null);
                  setHoveredSymbol(null);
                }}
                className="bg-transparent border-none text-xs text-white focus:outline-none cursor-pointer max-w-[240px] truncate"
              >
                {data?.managers.map((m) => (
                  <option key={m.name} value={m.name} className="bg-slate-900 text-white">
                    {formatManagerName(m.name)} ({m.fund_count} produk, {m.pair_count} jalur)
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kode, nama produk, atau manajer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 bg-slate-800/50 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                  title="Hapus pencarian"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* View Tab Selector & Legend */}
          <div className="flex items-center gap-3">
            {/* Legend */}
            <div className="hidden lg:flex items-center gap-2 text-[11px] font-medium text-slate-400 pr-2 border-r border-slate-800">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Pasar Uang</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>Obligasi</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span>Saham</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Campuran</span>
              </div>
              <div className="flex items-center gap-1 border-l border-slate-800 pl-2 text-slate-300 font-medium">
                <Zap className="w-2.5 h-2.5 fill-current text-cyan-400" />
                <span>Instan / Instan+</span>
              </div>
            </div>

            {/* Zoom Controls (only in graph view) */}
            {viewTab === "graph" && (
              <div className="flex items-center bg-slate-800/80 border border-slate-700/60 rounded-xl p-0.5 text-xs gap-0.5">
                <button
                  onClick={() => setZoom((prev) => Math.min(prev * 1.2, 3.5))}
                  className="p-1 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg transition-colors"
                  title="Perbesar (Zoom In)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoom((prev) => Math.max(prev / 1.2, 0.6))}
                  className="p-1 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg transition-colors"
                  title="Perkecil (Zoom Out)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setZoom(isMobile ? 0.88 : 1);
                    setPan({ x: 0, y: isMobile ? -6 : 0 });
                  }}
                  className="px-1.5 py-0.5 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-mono"
                  title="Reset Tampilan (100%)"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>{Math.round((zoom / (isMobile ? 0.88 : 1)) * 100)}%</span>
                </button>
              </div>
            )}
            <div className="flex items-center bg-slate-800/80 border border-slate-700/60 rounded-xl p-0.5 text-xs">
              <button
                onClick={() => setViewTab("graph")}
                className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  viewTab === "graph"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>Visual Graf</span>
              </button>
              <button
                onClick={() => setViewTab("matrix")}
                className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  viewTab === "matrix"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <ListTree className="w-3.5 h-3.5" />
                <span>Daftar Jalur</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col md:flex-row min-h-0 md:min-h-[460px]">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 z-10 bg-slate-900/80">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Memuat visualisasi switching...</p>
            </div>
          )}

          {error && (
            <div className="m-auto p-6 bg-rose-950/30 border border-rose-800 rounded-2xl text-center space-y-2">
              <p className="text-rose-300 text-sm font-semibold">{error}</p>
            </div>
          )}

          {/* Main Visualizer Panel */}
          <div className="flex-1 pt-1 pb-3 px-1 sm:px-4 flex items-start md:items-center justify-center relative overflow-hidden bg-slate-900/40 min-h-0 md:min-h-[340px]">
            {viewTab === "graph" ? (
              activeManager && activeManager.funds.length > 0 ? (
                <div className="relative w-full h-full flex items-center justify-center select-none touch-none">
                  <svg
                    ref={svgRef}
                    viewBox="70 65 580 585"
                    preserveAspectRatio="xMidYMid meet"
                    className="w-full h-full max-h-full max-w-full cursor-grab active:cursor-grabbing"
                    style={{ touchAction: "none" }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={(e) => {
                      if (hasMovedRef.current) return;
                      if (e.target === e.currentTarget) {
                        setSelectedSymbol(null);
                        setFocusMode("targets");
                      }
                    }}
                  >
                    <defs>
                      <marker
                        id="arrow-default"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                      >
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#334155" />
                      </marker>
                      <marker
                        id="arrow-Pasar-Uang"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                      >
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
                      </marker>
                      <marker
                        id="arrow-Obligasi"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                      >
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#0ea5e9" />
                      </marker>
                      <marker
                        id="arrow-Saham"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                      >
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#a855f7" />
                      </marker>
                      <marker
                        id="arrow-Campuran"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                      >
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
                      </marker>
                      <marker
                        id="arrow-Lainnya"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                      >
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#14b8a6" />
                      </marker>
                      <marker
                        id="arrow-incoming"
                        viewBox="0 0 10 10"
                        refX="8"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                      >
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b" />
                      </marker>
                    </defs>

                    {/* Viewport Transform Group (Pan & Pinch/Wheel Zoom) */}
                    <g transform={`translate(${center + pan.x}, ${center + pan.y}) scale(${zoom}) translate(${-center}, ${-center})`}>
                    {/* Background Central Ring Indicator */}
                    <circle
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />


                    {/* Layer 1: Dimmed / Inactive Edges (background layer) */}
                    {activeFocusSymbol !== null &&
                      activeManager.edges.map((edge) => {
                        const isActiveEdge = isTargetMode
                          ? activeFocusSymbol === edge.source
                          : activeFocusSymbol === edge.target;
                        if (isActiveEdge) return null; // Active lines rendered in Layer 3 with node color

                        const srcPos = nodePositions[edge.source];
                        const dstPos = nodePositions[edge.target];
                        if (!srcPos || !dstPos) return null;

                        const midX = (srcPos.x + dstPos.x) / 2;
                        const midY = (srcPos.y + dstPos.y) / 2;
                        const ctrlX = midX * 0.65 + center * 0.35;
                        const ctrlY = midY * 0.65 + center * 0.35;

                        const srcR = getNodeRadius(edge.source) + 1;
                        const svx = ctrlX - srcPos.x, svy = ctrlY - srcPos.y;
                        const slen = Math.hypot(svx, svy) || 1;
                        const startX = srcPos.x + (svx / slen) * srcR;
                        const startY = srcPos.y + (svy / slen) * srcR;

                        const dstR = getNodeRadius(edge.target) + 1;
                        const evx = dstPos.x - ctrlX, evy = dstPos.y - ctrlY;
                        const elen = Math.hypot(evx, evy) || 1;
                        const endX = dstPos.x - (evx / elen) * dstR;
                        const endY = dstPos.y - (evy / elen) * dstR;

                        const d = `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;

                        return (
                          <path
                            key={`dimmed-${edge.source}->${edge.target}`}
                            d={d}
                            fill="none"
                            stroke="#1e293b"
                            strokeWidth={1.2}
                            strokeOpacity={0.04}
                            markerEnd="url(#arrow-default)"
                          />
                        );
                      })}

                    {/* Layer 2: Fund Node Bodies & Outer Glow Rings */}
                    {activeManager.funds.map((fund) => {
                      const pos = nodePositions[fund.symbol];
                      if (!pos) return null;

                      const isFocused = activeFocusSymbol === fund.symbol;
                      const isConnected = isTargetMode
                        ? connectedOutgoing.has(fund.symbol)
                        : connectedIncoming.has(fund.symbol);
                      const isSearchMatch = !isSearching || searchMatchingSymbols.has(fund.symbol);
                      // When a node is focused/inspected, its connected targets/sources MUST remain fully visible and highlighted!
                      const isDimmed = activeFocusSymbol
                        ? !isFocused && !isConnected
                        : isSearching && !isSearchMatch;
                      const colors = getTypeColor(fund.type);
                      const radiusSize = getNodeRadius(fund.symbol);
                      const iconScale = isMobile ? 1.15 : 1;

                      return (
                        <g
                          key={`node-${fund.symbol}`}
                          transform={`translate(${pos.x}, ${pos.y})`}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredSymbol(fund.symbol)}
                          onMouseLeave={() => setHoveredSymbol(null)}
                          onClick={() => handleNodeClick(fund.symbol)}
                        >
                          {/* Outer Glow Ring */}
                          {(isFocused ||
                            isConnected ||
                            (!activeFocusSymbol && isSearching && isSearchMatch && searchMatchingSymbols.size > 0)) && (
                            <circle
                              r={radiusSize + (isMobile ? 7 : 6)}
                              fill="none"
                              stroke={colors.border}
                              strokeWidth={isFocused ? 2.5 : isSearching ? 2 : 1.5}
                              strokeOpacity={isFocused ? 0.7 : isSearching ? 0.6 : 0.3}
                              className={isFocused || isSearching ? "animate-pulse" : ""}
                            />
                          )}

                          {/* Node Circle */}
                          <circle
                            r={radiusSize}
                            fill="#0f172a"
                            stroke={isDimmed ? "#334155" : colors.border}
                            strokeWidth={isFocused ? 3 : isSearching && isSearchMatch ? 2.5 : 2}
                            opacity={isDimmed ? 0.18 : 1}
                            className="transition-all duration-200"
                          />

                          {/* Center Indicator: Zap lightning for instant (⚡) or lightning+ for instant+ (⚡+), otherwise center dot */}
                          {fund.is_instant_redemption ? (
                            fund.instant_type === 1 ? (
                              /* Standard Instant (type 1) */
                              <g transform={`scale(${iconScale})`}>
                              <g
                                transform={`translate(${isFocused ? -9 : -7.5}, ${isFocused ? -9 : -7.5}) scale(${
                                  isFocused ? 0.78 : 0.65
                                })`}
                                opacity={isDimmed ? 0.18 : 1}
                              >
                                <polygon
                                  points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
                                  fill={colors.fill}
                                  stroke={colors.fill}
                                  strokeWidth="1.2"
                                  strokeLinejoin="round"
                                />
                              </g>
                              </g>
                            ) : (
                              <g opacity={isDimmed ? 0.18 : 1}>
                                <g transform={`scale(${iconScale})`}>
                                <g
                                  transform={`translate(${isFocused ? -12 : -10}, ${isFocused ? -8.5 : -7}) scale(${
                                    isFocused ? 0.68 : 0.58
                                  })`}
                                >
                                  <polygon
                                    points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
                                    fill={colors.fill}
                                    stroke={colors.fill}
                                    strokeWidth="1.2"
                                    strokeLinejoin="round"
                                  />
                                </g>
                                <g transform={`translate(${isFocused ? 8 : 6.5}, ${isFocused ? -2.5 : -2})`}>
                                  <line
                                    x1={isFocused ? -3 : -2.5}
                                    y1={0}
                                    x2={isFocused ? 3 : 2.5}
                                    y2={0}
                                    stroke={colors.fill}
                                    strokeWidth={isFocused ? 2.5 : 2.2}
                                    strokeLinecap="round"
                                  />
                                  <line
                                    x1={0}
                                    y1={isFocused ? -3 : -2.5}
                                    x2={0}
                                    y2={isFocused ? 3 : 2.5}
                                    stroke={colors.fill}
                                    strokeWidth={isFocused ? 2.5 : 2.2}
                                    strokeLinecap="round"
                                  />
                                </g>
                                </g>
                              </g>
                            )
                          ) : (
                            <circle
                              r={isMobile ? (isFocused ? 6 : 5) : isFocused ? 5 : 4}
                              fill={colors.fill}
                              opacity={isDimmed ? 0.18 : 1}
                            />
                          )}
                        </g>
                      );
                    })}

                    {/* Layer 3: Active Edges & Arrows (Rendered in FRONT of the nodes & outer glow rings!) */}
                    {activeManager.edges.map((edge) => {
                      const isOutgoing = activeFocusSymbol === edge.source;
                      const isIncoming = activeFocusSymbol === edge.target;
                      const isActiveEdge = isTargetMode ? isOutgoing : isIncoming;

                      // When a node is focused, only render the active lines for the current mode
                      if (activeFocusSymbol !== null && !isActiveEdge) {
                        return null;
                      }

                      const srcPos = nodePositions[edge.source];
                      const dstPos = nodePositions[edge.target];
                      if (!srcPos || !dstPos) return null;

                      const midX = (srcPos.x + dstPos.x) / 2;
                      const midY = (srcPos.y + dstPos.y) / 2;
                      const ctrlX = midX * 0.65 + center * 0.35;
                      const ctrlY = midY * 0.65 + center * 0.35;

                      // Trim each curve just beyond the source and destination node perimeters.
                      const srcR = getNodeRadius(edge.source) + 1;
                      const svx = ctrlX - srcPos.x, svy = ctrlY - srcPos.y;
                      const slen = Math.hypot(svx, svy) || 1;
                      const startX = srcPos.x + (svx / slen) * srcR;
                      const startY = srcPos.y + (svy / slen) * srcR;

                      const dstR = getNodeRadius(edge.target) + 1;
                      const evx = dstPos.x - ctrlX, evy = dstPos.y - ctrlY;
                      const elen = Math.hypot(evx, evy) || 1;
                      const endX = dstPos.x - (evx / elen) * dstR;
                      const endY = dstPos.y - (evy / elen) * dstR;

                      const d = `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;

                      let stroke = "#334155";
                      let strokeWidth = 1.2;
                      let markerEnd = "url(#arrow-default)";
                      let opacity = isSearching ? 0.2 : 0.35;

                      const srcFund = activeManager.funds.find((f) => f.symbol === edge.source);
                      const srcColor = srcFund ? getTypeColor(srcFund.type) : TYPE_COLORS["Lainnya"];
                      const markerType = (srcFund?.type || "Lainnya").replace(/\s+/g, "-");

                      if (activeFocusSymbol !== null) {
                        stroke = srcColor.border;
                        strokeWidth = 2.4;
                        markerEnd = `url(#arrow-${markerType})`;
                        opacity = 0.95;
                      }
                      return (
                        <path
                          key={`front-${edge.source}->${edge.target}`}
                          d={d}
                          fill="none"
                          stroke={stroke}
                          strokeWidth={strokeWidth}
                          strokeOpacity={opacity}
                          markerEnd={markerEnd}
                          className="transition-all duration-200 pointer-events-none"
                        />
                      );
                    })}
                    {/* Central Manager Stamp & Stats Badge (Rendered in FRONT of all connection curves) */}
                    <g className="pointer-events-none select-none">
                      {/* Outer subtle boundary ring */}
                      <circle
                        cx={center}
                        cy={center}
                        r={72}
                        fill="#0b1329"
                        stroke="#334155"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        className="transition-all duration-200"
                      />
                      {/* Inner solid backdrop disc to cleanly block crossing curves */}
                      <circle
                        cx={center}
                        cy={center}
                        r={66}
                        fill="#0f172a"
                        stroke={activeFocusSymbol ? (isTargetMode ? "#06b6d4" : "#a855f7") : "#334155"}
                        strokeWidth={activeFocusSymbol ? 1.5 : 1}
                        className="transition-all duration-200"
                      />
                      <text
                        x={center}
                        y={center - 13}
                        textAnchor="middle"
                        className="text-[11px] font-bold fill-slate-200 uppercase tracking-wider"
                      >
                        {activeFocusSymbol ? activeFocusSymbol : `${activeManager.funds.length} Produk`}
                      </text>
                      <text
                        x={center}
                        y={center + 8}
                        textAnchor="middle"
                        className="text-[10px] font-mono font-bold"
                        fill={isTargetMode ? "#06b6d4" : "#a855f7"}
                      >
                        {activeFocusSymbol
                          ? isTargetMode
                            ? `${inspectNode?.out_count || 0} Target (Keluar)`
                            : `${incomingSenders.length} Sumber (Masuk)`
                          : `${activeManager.pair_count} Jalur Switch`}
                      </text>
                      <text
                        x={center}
                        y={center + 24}
                        textAnchor="middle"
                        className="text-[8.5px] fill-slate-400 font-medium"
                      >
                        {activeFocusSymbol
                          ? isTargetMode
                            ? "Klik lagi: lihat sumber"
                            : "Klik lagi: lihat target"
                          : isMobile
                            ? "Ketuk node untuk detail"
                            : "Arahkan kursor / klik node"}
                      </text>
                    </g>

                    {/* Layer 4: Node Text Labels (Actual fund names, wrapped cleanly without target count) */}
                    {activeManager.funds.map((fund) => {
                      const pos = nodePositions[fund.symbol];
                      if (!pos) return null;

                      const isFocused = activeFocusSymbol === fund.symbol;
                      const isConnected = isTargetMode
                        ? connectedOutgoing.has(fund.symbol)
                        : connectedIncoming.has(fund.symbol);
                      const isSearchMatch = !isSearching || searchMatchingSymbols.has(fund.symbol);
                      const isDimmed = activeFocusSymbol
                        ? !isFocused && !isConnected
                        : isSearching && !isSearchMatch;
                      const colors = getTypeColor(fund.type);

                      const lines = splitFundName(fund.name);
                      const isBottom = pos.y > center;
                      const labelOffset = isMobile
                        ? getNodeRadius(fund.symbol) + 10
                        : isBottom
                          ? 32
                          : 28;
                      const baseY = isBottom ? labelOffset : -(labelOffset + (lines.length - 1) * 12);
                      return (
                        <g
                          key={`label-${fund.symbol}`}
                          transform={`translate(${pos.x}, ${pos.y})`}
                          className="cursor-pointer select-none"
                          onMouseEnter={() => setHoveredSymbol(fund.symbol)}
                          onMouseLeave={() => setHoveredSymbol(null)}
                          onClick={() => handleNodeClick(fund.symbol)}
                        >
                          <text
                            textAnchor="middle"
                            fill={
                              isFocused
                                ? colors.fill
                                : isConnected
                                  ? "#f1f5f9"
                                  : isSearching && isSearchMatch
                                    ? colors.fill
                                    : isDimmed
                                      ? "#334155"
                                      : "#f1f5f9"
                            }
                            className={`text-[10px] transition-all duration-200 ${
                              isFocused || (isSearching && isSearchMatch)
                                ? "font-extrabold"
                                : isConnected
                                  ? "font-bold"
                                  : "font-semibold"
                            }`}
                          >
                            {lines.map((lineText, idx) => (
                              <tspan key={idx} x="0" y={baseY + idx * 12}>
                                {lineText}
                              </tspan>
                             ))}
                           </text>
                         </g>
                      );
                    })}
                    </g>
                  </svg>

                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Tidak ada data untuk manajer investasi ini.
                </div>
              )
            ) : (
              /* Matrix / Table Pathway View */
              <div className="w-full max-h-[520px] overflow-y-auto space-y-3 p-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {managerFunds.map((fund) => {
                    const colors = getTypeColor(fund.type);
                    return (
                      <div
                        key={fund.symbol}
                        onClick={() => setSelectedSymbol(fund.symbol)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          selectedSymbol === fund.symbol
                            ? "bg-slate-800/90 shadow-md"
                            : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                        }`}
                        style={
                          selectedSymbol === fund.symbol
                            ? { borderColor: colors.border }
                            : undefined
                        }
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold" style={{ color: colors.border }}>
                                {fund.symbol}
                              </span>
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${colors.bg} ${colors.text}`}
                              >
                                {fund.type}
                              </span>
                              {fund.sharia && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-lime-950 text-lime-300 border border-lime-800">
                                  Syariah
                                </span>
                              )}
                              {fund.is_instant_redemption && (
                                <span
                                  className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60 flex items-center gap-0.5"
                                  title="Pencairan Instan"
                                >
                                  <Zap className="w-2.5 h-2.5 fill-current text-emerald-400" />
                                  <span>Instan</span>
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-semibold text-white mt-1 leading-snug">
                              {fund.name}
                            </h4>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-cyan-400 font-mono">
                              {fund.out_count}
                            </span>
                            <div className="text-[10px] text-slate-500">Target</div>
                          </div>
                        </div>

                        {/* Destination Pills */}
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                          <div className="text-[10px] font-medium text-slate-400 mb-1.5">
                            Dapat di-switch ke:
                          </div>
                          {fund.destinations.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {fund.destinations.map((tgt) => (
                                <span
                                  key={tgt}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700/60"
                                >
                                  {tgt}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">
                              Tidak dapat dialihkan ke produk lain
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mobile Hint (When no node selected, md:hidden) */}
            {viewTab === "graph" && !inspectNode && (
              <div className="md:hidden absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none z-10">
                <span className="text-[10px] text-slate-400 bg-slate-900/90 border border-slate-800/90 px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap">
                  Ketuk node untuk melihat arah switching
                </span>
              </div>
            )}

            {/* Mobile Floating Bottom Bar / Drawer (md:hidden) */}
            {viewTab === "graph" && inspectNode && (
              <div className="md:hidden absolute bottom-2.5 left-2.5 right-2.5 z-20 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
                {/* Collapsed Header Row */}
                <div className="p-2.5 flex items-center justify-between gap-2">
                  <div
                    className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                    onClick={() => setIsMobileExpanded(!isMobileExpanded)}
                  >
                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded border shrink-0 ${
                        getTypeColor(inspectNode.type).bg
                      } ${getTypeColor(inspectNode.type).text}`}
                      style={{ borderColor: `${getTypeColor(inspectNode.type).border}80` }}
                    >
                      {inspectNode.symbol}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate leading-tight">
                        {inspectNode.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        <span className={getTypeColor(inspectNode.type).text}>{inspectNode.type}</span>
                        <span>&bull;</span>
                        <span style={{ color: getTypeColor(inspectNode.type).border }} className="font-semibold">
                          {focusMode === "targets" ? `${inspectNode.out_count} target` : `${incomingSenders.length} sumber`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setIsMobileExpanded(!isMobileExpanded)}
                      className="px-2 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
                      title={isMobileExpanded ? "Ciutkan" : "Lihat target pengalihan"}
                    >
                      <span className="text-[10px] font-medium">{isMobileExpanded ? "Tutup" : "Daftar"}</span>
                      {isMobileExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                    </button>

                    <button
                      onClick={() => {
                        onSelectFund(inspectNode.symbol);
                        onClose();
                      }}
                      className="p-1.5 text-white rounded-lg transition-opacity hover:opacity-90 shadow"
                      style={{ backgroundColor: getTypeColor(inspectNode.type).border }}
                      title="Buka detail lengkap"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        setSelectedSymbol(null);
                        setHoveredSymbol(null);
                        setIsMobileExpanded(false);
                      }}
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                      title="Batal pilih"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Bottom Drawer on Mobile */}
                {isMobileExpanded && (
                  <div className="border-t border-slate-800 p-3 max-h-[38vh] overflow-y-auto space-y-2.5 bg-slate-900/90">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-800/60 rounded-lg p-2 border border-slate-800">
                        <div className="text-[10px] text-slate-500">NAV Terakhir</div>
                        <div className="font-semibold text-white mt-0.5">
                          {formatCurrency(inspectNode.nav)}
                        </div>
                      </div>
                      <div className="bg-slate-800/60 rounded-lg p-2 border border-slate-800">
                        <div className="text-[10px] text-slate-500">Total AUM</div>
                        <div className="font-semibold text-white mt-0.5">
                          {formatAum(inspectNode.aum)}
                        </div>
                      </div>
                    </div>

                    {/* Mode Toggle on Mobile */}
                    <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs">
                      <button
                        onClick={() => setFocusMode("targets")}
                        className={`flex-1 py-1 rounded-md font-medium transition-all text-center flex items-center justify-center gap-1 ${
                          focusMode === "targets"
                            ? "bg-cyan-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <span>Target ({inspectNode.out_count})</span>
                      </button>
                      <button
                        onClick={() => setFocusMode("senders")}
                        className={`flex-1 py-1 rounded-md font-medium transition-all text-center flex items-center justify-center gap-1 ${
                          focusMode === "senders"
                            ? "bg-purple-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <span>Sumber ({incomingSenders.length})</span>
                      </button>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>
                          {focusMode === "targets"
                            ? `Target Pengalihan (${inspectNode.destinations.length})`
                            : `Sumber Pengalihan (${incomingSenders.length})`}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {focusMode === "targets" ? "Keluar" : "Masuk"}
                        </span>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                        {(focusMode === "targets" ? inspectNode.destinations : incomingSenders.map((s) => s.symbol)).map((relSymbol) => {
                          const relNode = data?.nodes.find((n) => n.symbol === relSymbol);
                          return (
                            <div
                              key={relSymbol}
                              onClick={() => {
                                setSelectedSymbol(relSymbol);
                                setFocusMode("targets");
                                setHoveredSymbol(null);
                              }}
                              className="flex items-center justify-between p-1.5 rounded-lg bg-slate-800/50 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-colors"
                            >
                              <div className="min-w-0 pr-1">
                                <div className="text-xs font-medium text-white truncate">
                                  {relNode?.name || relSymbol}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400">
                                  {relSymbol}
                                </div>
                              </div>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700/60 text-slate-300 shrink-0">
                                {relNode?.type || "-"}
                              </span>
                            </div>
                          );
                        })}
                        {focusMode === "senders" && incomingSenders.length === 0 && (
                          <p className="text-xs text-slate-500 py-2 text-center italic">
                            Tidak ada produk yang bisa dialihkan ke sini.
                          </p>
                        )}
                        {focusMode === "targets" && inspectNode.destinations.length === 0 && (
                          <p className="text-xs text-slate-500 py-2 text-center italic">
                            Produk ini tidak dapat dialihkan ke produk lain.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Inspector Panel (When node selected or hovered) */}
          <div className="hidden md:flex w-80 border-l border-slate-800 bg-slate-900/90 p-4 flex-col justify-between shrink-0">
            {inspectNode ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                        getTypeColor(inspectNode.type).bg
                      } ${getTypeColor(inspectNode.type).text}`}
                      style={{ borderColor: `${getTypeColor(inspectNode.type).border}80` }}
                    >
                      {inspectNode.symbol}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {inspectNode.is_instant_redemption && (
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.2 rounded border flex items-center gap-0.5 ${
                            inspectNode.instant_type === 1
                              ? "bg-emerald-950 text-emerald-300 border-emerald-700/60"
                              : "bg-purple-950 text-purple-300 border-purple-800/60"
                          }`}
                          title={inspectNode.instant_type === 1 ? "Pencairan Instan" : "Pencairan Instan+"}
                        >
                          <Zap className="w-2.5 h-2.5 fill-current" />
                          <span>{inspectNode.instant_type === 1 ? "Instan" : "Instan+"}</span>
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                          getTypeColor(inspectNode.type).bg
                        } ${getTypeColor(inspectNode.type).text}`}
                        style={{ borderColor: `${getTypeColor(inspectNode.type).border}80` }}
                      >
                        {inspectNode.type}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedSymbol(null);
                          setFocusMode("targets");
                        }}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                        title="Batal pilih"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-2 leading-snug">
                    {inspectNode.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">{formatManagerName(inspectNode.manager)}</p>
                </div>

                {/* Metrics Pill Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-800/60 rounded-lg p-2 border border-slate-800">
                    <div className="text-[10px] text-slate-500">NAV Terakhir</div>
                    <div className="font-semibold text-white mt-0.5">
                      {formatCurrency(inspectNode.nav)}
                    </div>
                  </div>
                  <div className="bg-slate-800/60 rounded-lg p-2 border border-slate-800">
                    <div className="text-[10px] text-slate-500">Total AUM</div>
                    <div className="font-semibold text-white mt-0.5">
                      {formatAum(inspectNode.aum)}
                    </div>
                  </div>
                </div>

                {/* Switching Stats */}
                {/* Switching Stats / Mode Toggle */}
                <div
                  className="rounded-xl p-2 space-y-1.5 border"
                  style={{
                    backgroundColor: `${getTypeColor(inspectNode.type).border}12`,
                    borderColor: `${getTypeColor(inspectNode.type).border}40`,
                  }}
                >
                  <button
                    onClick={() => setFocusMode("targets")}
                    className={`w-full flex items-center justify-between text-xs p-1.5 rounded-lg transition-colors ${
                      focusMode === "targets"
                        ? "bg-slate-800/90 text-white font-semibold shadow-sm"
                        : "text-slate-300 hover:bg-slate-800/40"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-cyan-400">&rarr;</span>
                      <span>Target Switching (Keluar):</span>
                    </span>
                    <span
                      className="font-bold font-mono"
                      style={{ color: getTypeColor(inspectNode.type).border }}
                    >
                      {inspectNode.out_count} Produk
                    </span>
                  </button>

                  <button
                    onClick={() => setFocusMode("senders")}
                    className={`w-full flex items-center justify-between text-xs p-1.5 rounded-lg transition-colors ${
                      focusMode === "senders"
                        ? "bg-slate-800/90 text-white font-semibold shadow-sm"
                        : "text-slate-300 hover:bg-slate-800/40"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-purple-400">&larr;</span>
                      <span>Sumber Pengalihan (Masuk):</span>
                    </span>
                    <span className="font-bold text-purple-400 font-mono">
                      {incomingSenders.length} Produk
                    </span>
                  </button>
                </div>

                {/* Destinations or Senders List */}
                <div>
                  <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                    <span>
                      {focusMode === "targets"
                        ? `Target Pengalihan (${inspectNode.destinations.length})`
                        : `Sumber Pengalihan (${incomingSenders.length})`}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {focusMode === "targets" ? "Bisa Switch Ke" : "Bisa Switch Dari"}
                    </span>
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                    {(focusMode === "targets" ? inspectNode.destinations : incomingSenders.map((s) => s.symbol)).map(
                      (relSymbol) => {
                        const relNode = data?.nodes.find((n) => n.symbol === relSymbol);
                        return (
                          <div
                            key={relSymbol}
                            onClick={() => {
                              setSelectedSymbol(relSymbol);
                              setFocusMode("targets");
                              setHoveredSymbol(null);
                            }}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-colors"
                          >
                            <div className="min-w-0 pr-1">
                              <div className="text-xs font-medium text-white truncate">
                                {relNode?.name || relSymbol}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                {relSymbol}
                              </div>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700/60 text-slate-300 shrink-0">
                              {relNode?.type || "-"}
                            </span>
                          </div>
                        );
                      }
                    )}
                    {focusMode === "targets" && inspectNode.destinations.length === 0 && (
                      <p className="text-xs text-slate-500 py-3 text-center italic">
                        Produk ini tidak dapat dialihkan ke produk lain.
                      </p>
                    )}
                    {focusMode === "senders" && incomingSenders.length === 0 && (
                      <p className="text-xs text-slate-500 py-3 text-center italic">
                        Tidak ada produk lain yang dapat dialihkan ke produk ini.
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    onSelectFund(inspectNode.symbol);
                    onClose();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-cyan-950/50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Detail Lengkap Reksa Dana</span>
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 space-y-2">
                <ArrowRightLeft className="w-8 h-8 text-slate-600" />
                <p className="text-xs">
                  Pilih atau arahkan kursor ke salah satu node untuk melihat relasi switching dan detail produk.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
