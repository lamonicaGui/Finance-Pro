
import React from 'react';
import { StockQuote } from '../types';

interface QuoteCardProps {
  quote: StockQuote;
}

const QuoteCard: React.FC<QuoteCardProps> = ({ quote }) => {
  const isUp = quote.changePercent >= 0;

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 transition-all hover:shadow-md">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-lg text-slate-800">{quote.ticker}</h3>
          <p className="text-xs text-slate-500">{quote.name}</p>
        </div>
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${isUp ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
          <span className="material-symbols-outlined text-[20px]">
            {isUp ? 'trending_up' : 'trending_down'}
          </span>
        </span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-slate-900">
          R$ {quote.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <div className="flex flex-col items-end">
          <span className={`text-sm font-semibold ${isUp ? 'text-green-600' : 'text-red-600'}`}>
            {isUp ? '+' : ''}{quote.changePercent}%
          </span>
          <span className={`text-xs ${isUp ? 'text-green-600' : 'text-red-600'}`}>
            {isUp ? '+' : ''}R$ {Math.abs(quote.changeValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default QuoteCard;
