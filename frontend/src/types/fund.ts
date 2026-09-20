export interface FundSummary {
  symbol: string;
  name: string;
  type: string;
  manager: string | null;
  custodian: string | null;
  aum: number | null;
  nav: number;
  latest_date: string;
  start_date: string;
  history_days: number;
  sharia: boolean;
  tradeable: number;
  notbuyable: number;
  is_instant_redemption?: boolean;
  instant_type?: number | null;
  is_index_fund?: boolean;
  is_dividend?: boolean;
  risk_profile: string | null;
  expense_ratio: number | null;
  min_buy: number | null;
  return_1d: number | null;
  return_1m: number | null;
  return_ytd: number | null;
  return_1y: number | null;
  return_3y: number | null;
  return_5y?: number | null;
  cagr_1y: number | null;
  cagr_3y: number | null;
  cagr_5y: number | null;
  cagr_all: number | null;
  max_drawdown_1m?: number | null;
  max_drawdown_ytd?: number | null;
  max_drawdown_1y: number | null;
  max_drawdown_3y?: number | null;
  max_drawdown_5y?: number | null;
  max_drawdown_all: number | null;
  sharpe_1y: number | null;
  sharpe_3y: number | null;
  volatility_1y: number | null;
  switch_destinations_count?: number;
}

export interface SummaryResponse {
  last_updated: string;
  total_funds: number;
  total_nav_points: number;
  funds: FundSummary[];
}

export interface NavPoint {
  time: string; // "YYYY-MM-DD"
  value: number; // NAV
  raw_nav?: number; // Original non-adjusted unit NAV
}

export interface WindowMetric {
  return: number | null;
  cagr: number | null;
  max_drawdown: number | null;
  sharpe: number | null;
  volatility: number | null;
}
export interface SwitchDestination {
  symbol: string;
  name: string;
  type: string;
}


export interface FundDetail {
  symbol: string;
  name: string;
  type: string;
  investment_manager: string | null;
  custodian_bank: string | null;
  released_date: string | null;
  latest_nav: number;
  latest_date: string;
  start_date: string;
  history_points: number;
  aum: number | null;
  sharia: boolean;
  tradeable: number;
  notbuyable: number;
  is_instant_redemption?: boolean;
  instant_type?: number | null;
  is_index_fund?: boolean;
  is_dividend?: boolean;
  expense_ratio: number | null;
  min_buy: number | null;
  risk_profile: string | null;
  metrics: {
    "1d_return": number | null;
    "1m": WindowMetric;
    "3m": WindowMetric;
    "6m": WindowMetric;
    "ytd": WindowMetric;
    "1y": WindowMetric;
    "3y": WindowMetric;
    "5y": WindowMetric;
    "all": WindowMetric;
  };
  series: NavPoint[];
  switch_destinations?: SwitchDestination[];
}

export interface RangeMetrics {
  startDate: string;
  endDate: string;
  days: number;
  startNav: number;
  endNav: number;
  totalReturn: number;
  cagr: number;
  maxDrawdown: number;
  volatilityAnnualized: number;
  sharpeRatio: number;
}

export interface GraphNode {
  symbol: string;
  name: string;
  type: string;
  manager: string;
  aum: number | null;
  nav: number;
  sharia: boolean;
  is_instant_redemption?: boolean;
  instant_type?: number | null;
  risk_profile: string | null;
  min_buy: number | null;
  out_count: number;
  in_count: number;
  destinations: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface ManagerGraph {
  name: string;
  fund_count: number;
  pair_count: number;
  funds: GraphNode[];
  edges: GraphEdge[];
}

export interface SwitchingGraphResponse {
  last_updated: string;
  total_funds: number;
  total_edges: number;
  total_managers: number;
  managers: ManagerGraph[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  adjacency: Record<string, string[]>;
}
