
import { StockQuote } from './types';

export const INITIAL_QUOTES: StockQuote[] = [
  {
    ticker: 'PETR4',
    name: 'Petrobras PN',
    price: 38.42,
    changePercent: 1.25,
    changeValue: 0.47
  },
  {
    ticker: 'VALE3',
    name: 'Vale ON',
    price: 62.15,
    changePercent: -0.85,
    changeValue: -0.53
  },
  {
    ticker: 'ITUB4',
    name: 'Itaú Unibanco PN',
    price: 33.90,
    changePercent: 0.45,
    changeValue: 0.15
  },
  {
    ticker: 'BBAS3',
    name: 'Banco do Brasil ON',
    price: 58.22,
    changePercent: 1.10,
    changeValue: 0.63
  }
];
