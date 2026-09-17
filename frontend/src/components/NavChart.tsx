import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  PriceScaleMode,
  Time,
} from "lightweight-charts";
import { NavPoint, RangeMetrics } from "../types/fund";
import { computeRangeMetrics } from "../utils/metrics";

interface NavChartProps {
  series: NavPoint[];
  symbol: string;
  onRangeChange?: (metrics: RangeMetrics | null) => void;
}

export const NavChart: React.FC<NavChartProps> = ({
  series,
  symbol,
  onRangeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const isProgrammaticChangeRef = useRef<boolean>(true);

  const [activeTimeframe, setActiveTimeframe] = useState<string>("1Y");
  const [isLogScale, setIsLogScale] = useState<boolean>(false);

  useEffect(() => {
    if (!containerRef.current || !series || series.length === 0) return;

    // Dispose old chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 380,
      layout: {
        background: { type: ColorType.Solid, color: "#0f172a" }, // slate-900
        textColor: "#94a3b8", // slate-400
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      },
      grid: {
        vertLines: { color: "#1e293b" }, // slate-800
        horzLines: { color: "#1e293b" },
      },
      crosshair: {
        vertLine: {
          color: "#22c55e",
          width: 1,
          style: 3,
          labelBackgroundColor: "#15803d",
        },
        horzLine: {
          color: "#22c55e",
          width: 1,
          style: 3,
          labelBackgroundColor: "#15803d",
        },
      },
      rightPriceScale: {
        borderColor: "#334155",
        mode: isLogScale ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
      },
      timeScale: {
        borderColor: "#334155",
        timeVisible: false,
      },
    });

    chartRef.current = chart;

    const areaSeries = chart.addAreaSeries({
      topColor: "rgba(34, 197, 94, 0.4)",
      bottomColor: "rgba(34, 197, 94, 0.0)",
      lineColor: "#22c55e",
      lineWidth: 2,
    });
    areaSeriesRef.current = areaSeries;

    // Filter valid chronological data
    const chartData = series
      .filter((p) => p.value > 0)
      .map((p) => ({
        time: p.time as Time,
        value: p.value,
      }));

    areaSeries.setData(chartData);

    // Calculate default 1-Year range
    const lastDate = new Date(series[series.length - 1].time);
    const targetDate = new Date(lastDate);
    targetDate.setFullYear(targetDate.getFullYear() - 1);
    const targetDateStr = targetDate.toISOString().split("T")[0];

    const startIndex = series.findIndex((p) => p.time >= targetDateStr);
    const fromIndex = startIndex !== -1 ? startIndex : 0;
    const toIndex = series.length - 1;

    isProgrammaticChangeRef.current = true;
    chart.timeScale().setVisibleLogicalRange({
      from: fromIndex,
      to: toIndex,
    });
    setTimeout(() => {
      isProgrammaticChangeRef.current = false;
    }, 150);

    // Initial 1-Year range metrics
    if (onRangeChange && chartData.length >= 2) {
      const initialMetrics = computeRangeMetrics(series, fromIndex, toIndex);
      onRangeChange(initialMetrics);
    }

    // Subscribe to pan/zoom/drag range changes
    chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
      if (!logicalRange || !onRangeChange || series.length < 2) return;

      // If range changed via user drag/zoom, untick preset button to denote custom range
      if (!isProgrammaticChangeRef.current) {
        setActiveTimeframe("");
      }

      const fromIdx = Math.max(0, Math.floor(logicalRange.from));
      const toIdx = Math.min(series.length - 1, Math.ceil(logicalRange.to));

      if (fromIdx < toIdx) {
        const metrics = computeRangeMetrics(series, fromIdx, toIdx);
        onRangeChange(metrics);
      }
    });

    // Handle responsive resize
    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [series, symbol]);

  // Handle scale mode toggle (Linear vs Log)
  const toggleScaleMode = () => {
    if (!chartRef.current) return;
    const nextMode = !isLogScale;
    setIsLogScale(nextMode);
    chartRef.current.priceScale("right").applyOptions({
      mode: nextMode ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal,
    });
  };

  // Handle timeframe preset clicks
  const handleTimeframeChange = (tf: string) => {
    setActiveTimeframe(tf);
    if (!chartRef.current || !series || series.length < 2) return;

    isProgrammaticChangeRef.current = true;

    if (tf === "ALL") {
      chartRef.current.timeScale().fitContent();
      setTimeout(() => {
        isProgrammaticChangeRef.current = false;
      }, 150);
      return;
    }

    const lastDate = new Date(series[series.length - 1].time);
    let targetDate = new Date(lastDate);

    switch (tf) {
      case "1M":
        targetDate.setMonth(targetDate.getMonth() - 1);
        break;
      case "6M":
        targetDate.setMonth(targetDate.getMonth() - 6);
        break;
      case "YTD":
        targetDate = new Date(lastDate.getFullYear(), 0, 1);
        break;
      case "1Y":
        targetDate.setFullYear(targetDate.getFullYear() - 1);
        break;
      case "3Y":
        targetDate.setFullYear(targetDate.getFullYear() - 3);
        break;
      case "5Y":
        targetDate.setFullYear(targetDate.getFullYear() - 5);
        break;
      default:
        break;
    }

    const targetDateStr = targetDate.toISOString().split("T")[0];
    const startIndex = series.findIndex((p) => p.time >= targetDateStr);
    const fromIndex = startIndex !== -1 ? startIndex : 0;
    const toIndex = series.length - 1;

    chartRef.current.timeScale().setVisibleLogicalRange({
      from: fromIndex,
      to: toIndex,
    });

    setTimeout(() => {
      isProgrammaticChangeRef.current = false;
    }, 150);
  };

  const timeframes = ["1M", "6M", "YTD", "1Y", "3Y", "5Y", "ALL"];

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => handleTimeframeChange(tf)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeTimeframe === tf
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {activeTimeframe === "" && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-brand-950/80 text-brand-300 border border-brand-800/60 font-medium">
              Kustom
            </span>
          )}
          <button
            onClick={toggleScaleMode}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
              isLogScale
                ? "bg-slate-700 text-brand-400 border-brand-500/40"
                : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
            title="Toggle Logarithmic / Linear Price Scale"
          >
            {isLogScale ? "Log Scale" : "Linear Scale"}
          </button>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Drag/Zoom chart untuk kalkulasi kustom
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div ref={containerRef} className="w-full relative min-h-[380px]" />
    </div>
  );
};
