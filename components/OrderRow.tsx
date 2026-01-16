import React, { useState, useEffect, useRef } from 'react';
import { OrderItem, OrderSide, OrderMode, OrderBasis } from '../types';

interface OrderRowProps {
  order: OrderItem;
  onUpdate: (updates: Partial<OrderItem>) => void;
  onRemove: () => void;
}

const OrderRow: React.FC<OrderRowProps> = ({ order, onUpdate, onRemove }) => {
  const [displayTicker, setDisplayTicker] = useState(order.ticker || '');
  const [isQuoting, setIsQuoting] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce ticker update to database
  useEffect(() => {
    if (displayTicker === order.ticker) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      onUpdate({ ticker: displayTicker });
    }, 500);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [displayTicker]);

  // Sync internal state if order.ticker changes from outside
  useEffect(() => {
    if (order.ticker !== displayTicker) {
      setDisplayTicker(order.ticker || '');
    }
  }, [order.ticker]);

  // Fetch Quotes when ticker changes in order state
  useEffect(() => {
    if (!order.ticker) return;
    fetchQuote(order.ticker);
  }, [order.ticker]);

  const fetchQuote = async (ticker: string) => {
    setIsQuoting(true);
    try {
      const yahooTicker = ticker.endsWith('.SA') ? ticker : `${ticker}.SA`;
      const res = await fetch(`/api/yahoo/v8/finance/chart/${yahooTicker}?interval=1d&range=1d`);
      if (res.ok) {
        const data = await res.json();
        const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
        const shortName = data.chart?.result?.[0]?.meta?.shortName || data.chart?.result?.[0]?.meta?.longName;

        const updates: Partial<OrderItem> = {};
        if (price) updates.lastPrice = price;
        if (shortName) updates.assetName = shortName;

        // Se estiver em modo Mercado, o preço da ordem segue a cotação
        if (order.mode === 'Mercado' && price) {
          updates.orderPrice = price;
        }

        if (Object.keys(updates).length > 0) {
          onUpdate(updates);
        }
      }
    } catch (e) {
      console.warn(`Erro ao buscar cotação para ${ticker}:`, e);
    } finally {
      setIsQuoting(false);
    }
  };

  const estimatedFinance = (order.orderPrice || 0) * (order.value || 0);
  const estimatedQty = order.orderPrice && order.orderPrice > 0
    ? Math.floor((order.value || 0) / order.orderPrice)
    : 0;

  return (
    <>
      <tr className={`group transition-all ${order.stopLoss ? 'bg-orange-50/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'}`}>
        <td className="px-6 py-5">
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <div className="relative">
              <input
                type="text"
                className="block w-full h-10 px-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 text-xs font-black uppercase text-slate-900 dark:text-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-mono"
                value={displayTicker}
                placeholder="Ativo"
                onChange={(e) => setDisplayTicker(e.target.value.toUpperCase())}
              />
              {displayTicker && (
                <div className={`absolute right-3 top-4 h-2 w-2 rounded-full ${order.side === 'Compra' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'} ${isQuoting ? 'animate-pulse' : ''}`}></div>
              )}
            </div>
            {order.assetName && (
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate max-w-[140px] px-1 animate-in fade-in slide-in-from-left-1">
                {order.assetName}
              </span>
            )}
          </div>
        </td>
        <td className="px-6 py-5 text-center">
          <select
            className={`inline-block bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-tight focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all ${order.side === 'Compra' ? 'text-emerald-600' : 'text-red-600'}`}
            value={order.side}
            onChange={(e) => onUpdate({ side: e.target.value as OrderSide })}
          >
            <option value="Compra">COMPRA</option>
            <option value="Venda">VENDA</option>
          </select>
        </td>
        <td className="px-6 py-5">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 font-mono text-slate-500 dark:text-slate-400 text-xs font-bold">
              <span className="opacity-50 text-[10px]">R$</span>
              <span>{order.lastPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Cotação</span>
          </div>
        </td>
        <td className="px-6 py-5">
          <div className={`flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl px-3 py-1.5 border border-slate-100 dark:border-slate-800 shadow-inner group-hover:bg-white dark:group-hover:bg-slate-800 transition-all ${order.mode === 'Mercado' ? 'opacity-70' : ''}`}>
            <span className="text-[10px] font-bold text-slate-400">R$</span>
            <input
              type="number"
              step="0.01"
              disabled={order.mode === 'Mercado'}
              className={`block w-20 bg-transparent border-none p-0 text-right font-mono text-sm font-black text-slate-800 dark:text-white focus:ring-0 ${order.mode === 'Mercado' ? 'cursor-not-allowed' : ''}`}
              value={order.orderPrice || ''}
              onChange={(e) => onUpdate({ orderPrice: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </td>
        <td className="px-6 py-5">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => {
                const updates: Partial<OrderItem> = { mode: 'Mercado' };
                if (order.lastPrice) updates.orderPrice = order.lastPrice;
                onUpdate(updates);
              }}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${order.mode === 'Mercado' ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'}`}
            >
              Mercado
            </button>
            <button
              onClick={() => onUpdate({ mode: 'Limitada' })}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${order.mode === 'Limitada' ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'}`}
            >
              Limite
            </button>
          </div>
        </td>
        <td className="px-6 py-5">
          <select
            className="block w-full bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 rounded-xl px-3 py-2 text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest focus:ring-2 focus:ring-primary/20 transition-all"
            value={order.basis}
            onChange={(e) => onUpdate({ basis: e.target.value as OrderBasis })}
          >
            <option value="Quantidade">Quantidade</option>
            <option value="Financeiro">Financeiro</option>
          </select>
        </td>
        <td className="px-6 py-5">
          <div className="flex flex-col gap-1.5">
            <div className={`flex items-center justify-end bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-sm focus-within:ring-4 focus-within:ring-primary/10 transition-all ${order.basis === 'Financeiro' ? 'bg-slate-50/50' : ''}`}>
              <span className="text-[10px] font-black text-slate-400 mr-2">{order.basis === 'Financeiro' ? 'R$' : 'QTD'}</span>
              <input
                type="number"
                className="block w-24 bg-transparent border-none p-0 text-right font-mono text-sm font-black text-slate-800 dark:text-white focus:ring-0"
                value={order.value || ''}
                placeholder="0"
                onChange={(e) => onUpdate({ value: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
        </td>
        <td className="px-6 py-5">
          <div className="flex flex-col items-end">
            {order.basis === 'Quantidade' ? (
              <>
                <div className="flex items-center gap-1 font-mono text-sm font-black text-emerald-600 dark:text-primary">
                  <span className="text-[10px] opacity-70">R$</span>
                  <span>{estimatedFinance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Total Estimado</span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 font-mono text-sm font-black text-emerald-600 dark:text-primary">
                  <span>{estimatedQty.toLocaleString('pt-BR')}</span>
                  <span className="text-[10px] opacity-70 uppercase tracking-tighter ml-1">Papéis</span>
                </div>
                <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Qtd Estimada</span>
              </>
            )}
          </div>
        </td>
        <td className="px-6 py-5 text-center">
          <button
            type="button"
            onClick={() => onUpdate({ stopLoss: !order.stopLoss })}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${order.stopLoss ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-primary hover:text-primary'}`}
          >
            <span className={`material-icons-outlined text-sm ${order.stopLoss ? 'fill-1' : ''}`}>
              {order.stopLoss ? 'check_circle' : 'security'}
            </span>
            STOP
          </button>
        </td>
        <td className="px-6 py-5 text-right">
          <button onClick={onRemove} className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
            <span className="material-icons-outlined text-lg">delete_outline</span>
          </button>
        </td>
      </tr>

      {/* STOP CONFIG PANEL */}
      {order.stopLoss && (
        <tr className="bg-orange-50/40 border-b border-orange-100/50">
          <td colSpan={10} className="px-8 py-3">
            <div className="flex flex-wrap items-center gap-6 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2 text-orange-500">
                <span className="material-symbols-outlined text-[18px]">security</span>
                <span className="text-xs font-black uppercase tracking-tight">Ordem STOP:</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Gain:</span>
                <div className="flex items-center rounded-md bg-white border border-slate-200 px-2 shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
                  <span className="text-[10px] text-slate-400 mr-1">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-20 border-none bg-transparent py-1 font-mono text-xs focus:ring-0"
                    placeholder="0.00"
                    value={order.stopGainValue || ''}
                    onChange={(e) => onUpdate({ stopGainValue: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Loss:</span>
                <div className="flex items-center rounded-md bg-white border border-slate-200 px-2 shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
                  <span className="text-[10px] text-slate-400 mr-1">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-20 border-none bg-transparent py-1 font-mono text-xs focus:ring-0"
                    placeholder="0.00"
                    value={order.stopLossValue || ''}
                    onChange={(e) => onUpdate({ stopLossValue: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Validade:</span>
                <select
                  className="rounded-md border-slate-200 bg-white py-1 pl-2 pr-8 text-xs font-semibold text-slate-700 shadow-sm focus:ring-1 focus:ring-primary focus:border-primary"
                  value={order.validity || 'Semana'}
                  onChange={(e) => onUpdate({ validity: e.target.value })}
                >
                  <option value="Hoje">Hoje</option>
                  <option value="Semana">Semana</option>
                  <option value="Mês">Mês</option>
                  <option value="GTC">Até cancelar (GTC)</option>
                </select>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default OrderRow;
