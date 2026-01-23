
export type OrderSide = 'Compra' | 'Venda';
export type OrderMode = 'Mercado' | 'Limitada';
export type OrderBasis = 'Quantidade' | 'Financeiro';

export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  changeValue: number;
}

export interface OrderItem {
  id: string;
  ticker: string;
  side: OrderSide;
  lastPrice: number;
  orderPrice: number;
  mode: OrderMode;
  basis: OrderBasis;
  value: number;
  assetName?: string;
  stopLoss: boolean;
  stopGainValue?: number;
  stopLossValue?: number;
  validity?: string;
}

export interface ClientGroup {
  id: string;
  account: string;
  name: string;
  email?: string;
  cc?: string;
  orders: OrderItem[];
}

// NOVOS TIPOS HAWK STRATEGY
export type HawkAssetType = 'Ação Nacional' | 'BDR';
export type HawkTerm = '15 dias' | '30 dias';

export interface HawkAsset {
  id: string;
  ticker: string;
  company: string;
  type: HawkAssetType;
  term: HawkTerm;
  expiration: string;
  protection: string;
  gain: string;
  cdiPercent: string;
  officeRevenue: string;
  price?: number;
  minInvestment?: number;
  selected?: boolean;
}

// TIPOS SWING TRADE
export type SwingTradeCall = 'Compra' | 'Venda' | 'L&S';
export type SwingTradeStatus = 'Em Aberto' | 'Valendo Entrada' | 'Encerrada';

export interface SwingTradeAsset {
  id: string;
  ticker: string;
  company?: string;
  type: SwingTradeCall;
  entryPrice: number;
  targetPrice: number;
  stopPrice: number;
  upside: string;  // do PDF
  downside: string; // do PDF
  startDate: string;
  status: SwingTradeStatus;
  graphTime?: string;
  realizedReturn?: string;
  closePrice?: number;
  selected?: boolean;
  currentPrice?: number;
}

// PERFORMANCE ANALYSIS TYPES
export interface TradeRecord {
  data: string;
  codBolsa: string;
  cliente: string;
  papel: string;
  cv: 'C' | 'V' | 'Compra' | 'Venda';
  quantidade: number;
  precoMedio: number;
  status: string;
  dataHora: string;
  volume: number;
  liquidacao: string;
  assessor: string;
  especialista: string;
  conta: string;
}

export interface Operation {
  id: string;
  ticker: string;
  cliente: string;
  conta: string;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  volume: number;
  resultBrRL: number;
  resultNet?: number;
  resultPercent: number;
  durationDays: number;
  side: 'Long' | 'Short';
}

export interface PerformanceSummary {
  totalResultBrRL: number;
  totalResultNet?: number;
  corretagem?: number;
  comissaoKAT?: number;
  averageReturnPercent: number;
  weightedAverageReturnPercent: number;
  totalOperations: number;
  winRate: number;
  totalVolume: number; // Represents Volume Total Encerrado
  totalVolumeOperated: number;
  averageVolumeClosed: number;
  drawdown?: number;
}
