import { NavPoint, RangeMetrics } from "../types/fund";

/**
 * Computes financial metrics (Return, CAGR, Max Drawdown, Volatility, Sharpe)
 * for an arbitrary slice of daily NAV points.
 * Runs in < 1ms on the client.
 */
export function computeRangeMetrics(
  data: NavPoint[],
  startIndex: number,
  endIndex: number,
  annualRiskFreeRate: number = 0.025 // 2.5% Net bank deposit benchmark
): RangeMetrics | null {
  if (!data || data.length < 2) return null;

  const start = Math.max(0, startIndex);
  const end = Math.min(data.length - 1, endIndex);

  if (start >= end) return null;

  const slice = data.slice(start, end + 1);
  const n = slice.length;
  if (n < 2) return null;

  const startNav = slice[0].value;
  const endNav = slice[n - 1].value;

  // 1. Total Return
  const totalReturn = startNav > 0 ? (endNav - startNav) / startNav : 0;

  // 2. Calendar Days & CAGR
  const dStart = new Date(slice[0].time).getTime();
  const dEnd = new Date(slice[n - 1].time).getTime();
  const calendarDays = Math.max(1, Math.round((dEnd - dStart) / (1000 * 60 * 60 * 24)));
  const years = calendarDays / 365.25;

  let cagr = 0;
  if (startNav > 0 && endNav > 0 && years > 0) {
    try {
      cagr = Math.pow(endNav / startNav, 1 / years) - 1;
    } catch {
      cagr = 0;
    }
  }

  // 3. Max Drawdown & Ulcer Index across the selected window
  let peak = slice[0].value;
  let maxDd = 0;
  const drawdowns: number[] = [0];
  const dailyReturns: number[] = [];

  for (let i = 1; i < n; i++) {
    const nav = slice[i].value;
    const prev = slice[i - 1].value;

    if (prev > 0 && nav > 0) {
      dailyReturns.push((nav - prev) / prev);
    }

    if (nav > peak) {
      peak = nav;
      drawdowns.push(0);
    } else if (peak > 0) {
      const dd = (nav - peak) / peak;
      if (dd < maxDd) {
        maxDd = dd;
      }
      drawdowns.push(dd * 100);
    } else {
      drawdowns.push(0);
    }
  }

  const ulcerIndex = Math.sqrt(drawdowns.reduce((acc, d) => acc + Math.pow(d, 2), 0) / n);
  const excessReturnPct = (totalReturn * 100) - (annualRiskFreeRate * 100);
  const effectiveUlcer = Math.max(ulcerIndex, 0.05);
  const martinRatio = excessReturnPct / effectiveUlcer;

  // 4. Annualized Volatility, Downside Volatility, Sharpe & Sortino Ratios
  const m = dailyReturns.length;
  let annualizedVol = 0;
  let downsideVol = 0;
  let sharpeRatio = 0;
  let sortinoRatio = 0;

  if (m > 1) {
    const meanDaily = dailyReturns.reduce((acc, r) => acc + r, 0) / m;
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanDaily, 2), 0) / m;
    const dailyStdDev = Math.sqrt(variance);
    annualizedVol = dailyStdDev * Math.sqrt(252);

    const dailyRf = annualRiskFreeRate / 252;
    const excessDaily = meanDaily - dailyRf;
    sharpeRatio = dailyStdDev > 0 ? (excessDaily / dailyStdDev) * Math.sqrt(252) : 0;

    // Downside deviation below mean (semi-deviation)
    const downsideDiffs = dailyReturns.map((r) => Math.pow(Math.min(0, r - meanDaily), 2));
    const downsideVar = downsideDiffs.reduce((acc, v) => acc + v, 0) / m;
    const downsideStdDev = Math.sqrt(downsideVar);
    downsideVol = downsideStdDev * Math.sqrt(252);
    sortinoRatio = downsideStdDev > 0 ? (excessDaily / downsideStdDev) * Math.sqrt(252) : 0;
  }

  const excessPct = calendarDays >= 365
    ? (cagr * 100) - (annualRiskFreeRate * 100)
    : (totalReturn * 100) - (annualRiskFreeRate * 100);
  const mddPct = Math.abs(maxDd * 100);
  const painIndex = 0.25 + Math.max(0, ulcerIndex) + (0.10 * mddPct) + (0.03 * Math.pow(mddPct, 2));
  const qualityScore = excessPct >= 0
    ? excessPct / painIndex
    : excessPct * (1.0 + painIndex);

  return {
    startDate: slice[0].time,
    endDate: slice[n - 1].time,
    days: calendarDays,
    startNav: Number(startNav.toFixed(2)),
    endNav: Number(endNav.toFixed(2)),
    totalReturn: Number((totalReturn * 100).toFixed(2)),
    cagr: Number((cagr * 100).toFixed(2)),
    maxDrawdown: Number((maxDd * 100).toFixed(2)),
    volatilityAnnualized: Number((annualizedVol * 100).toFixed(2)),
    downsideVolatility: Number((downsideVol * 100).toFixed(2)),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    sortinoRatio: Number(sortinoRatio.toFixed(2)),
    ulcerIndex: Number(ulcerIndex.toFixed(2)),
    martinRatio: Number(martinRatio.toFixed(2)),
    qualityScore: Number(qualityScore.toFixed(2)),
  };
}
