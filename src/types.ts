export interface Trade {
  ts: number;
  sec: number;
  side: 'BUY' | 'SELL';
  outcome: 'Up' | 'Down';
  tokens: number;
  usdc: number;
  price: number;
}

export interface InventoryPoint {
  sec: number;
  upTokens: number;
  downTokens: number;
  upUsdc: number;
  downUsdc: number;
}

export interface PricePoint {
  t: number;
  sec: number;
  p: number;
}

export interface TraderStats {
  buyCount: number;
  sellCount: number;
  buyUsdc: number;
  sellUsdc: number;
  avgBuy: number;
  avgSell: number;
  spreadPnl: number;
  settlementPnl: number;
  netPnl: number;
}

export interface TraderWindowData {
  trades: Trade[];
  inventory: InventoryPoint[];
  stats: TraderStats;
}

export interface WindowDetail {
  windowTs: number;
  coin: string;
  conditionId: string;
  settlement: {
    winner: 'Up' | 'Down';
    upPrice: number;
    downPrice: number;
  };
  prices: PricePoint[];
  traders: Record<string, TraderWindowData>;
}

export interface ManifestEntry {
  windowTs: number;
  coin: string;
  traders: {
    name: string;
    buyCount: number;
    sellCount: number;
    netPnl: number;
  }[];
}

export interface TraderConfig {
  address: string;
  name: string;
  color: string;
}

export interface Manifest {
  generated: string;
  windows: ManifestEntry[];
  traders: TraderConfig[];
}
