
import React from 'react';
import { OrderItem, OrderSide, OrderMode, OrderBasis } from '../types';

interface OrderRowProps {
  order: OrderItem;
  onUpdate: (updates: Partial<OrderItem>) => void;
  onRemove: () => void;
}

const OrderRow: React.FC<OrderRowProps> = ({ order, onUpdate, onRemove }) => {
  const estimatedFinance = order.basis === 'Quantidade' 
    ? order.orderPrice * order.value 
    : order.value;

  return (
    <>
      <tr className={`group transition-colors ${order.stopLoss ? 'bg-orange-50/20' : 'hover:bg-slate-50'}`}>
        <td className="px-6 py-4">
          <div className="relative">
            <input
              type="text"
              className="block w-full rounded border-slate-300 py-1.5 text-sm font-bold uppercase text-slate-900 focus:border-primary focus:ring-primary"
              value={order.ticker}
              placeholder="Ativo"
              onChange={(e) => onUpdate({ ticker: e.target.value.toUpperCase() })}
            />
            {order.ticker && (
              <div className={`absolute right-2 top-3 h-2 w-2 rounded-full ${order.side === 'Compra' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            )}
          </div>
        </td>
        <td className="px-6 py-4">
          <select
            className={`block w-full rounded border-slate-300 py-1.5 text-sm font-semibold focus:border-primary focus:ring-primary ${order.side === 'Compra' ? 'text-green-600' : 'text-red-600'}`}
            value={order.side}
            onChange={(e) => onUpdate({ side: e.target.value as OrderSide })}
          >
            <option value="Compra">Compra</option>
            <option value="Venda">Venda</option>
          </select>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-1 font-mono text-slate-500 text-sm">
            <span className="text-xs">R$</span>
            <span>{order.lastPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-1">
             <span className="text-xs text-slate-400">R$</span>
             <input
                type="number"
                step="0.01"
                className="block w-full rounded border-slate-300 py-1.5 font-mono text-sm text-slate-900 focus:border-primary focus:ring-primary"
                value={order.orderPrice || ''}
                onChange={(e) => onUpdate({ orderPrice: parseFloat(e.target.value) || 0 })}
              />
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center cursor-pointer group/radio">
              <input
                type="radio"
                className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                checked={order.mode === 'Mercado'}
                onChange={() => onUpdate({ mode: 'Mercado' })}
              />
              <span className="ml-2 text-xs font-medium text-slate-600">A Mercado</span>
            </label>
            <label className="flex items-center cursor-pointer group/radio">
              <input
                type="radio"
                className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
                checked={order.mode === 'Limitada'}
                onChange={() => onUpdate({ mode: 'Limitada' })}
              />
              <span className="ml-2 text-xs font-medium text-slate-600">Limitada</span>
            </label>
          </div>
        </td>
        <td className="px-6 py-4">
          <select
            className="block w-full rounded border-slate-300 py-1.5 text-xs text-slate-600 focus:border-primary focus:ring-primary"
            value={order.basis}
            onChange={(e) => onUpdate({ basis: e.target.value as OrderBasis })}
          >
            <option value="Quantidade">Quantidade</option>
            <option value="Financeiro">Financeiro</option>
          </select>
        </td>
        <td className="px-6 py-4">
          <input
            type="number"
            className="block w-full rounded border-slate-300 py-1.5 font-mono text-sm text-slate-900 focus:border-primary focus:ring-primary"
            value={order.value || ''}
            placeholder="0"
            onChange={(e) => onUpdate({ value: parseFloat(e.target.value) || 0 })}
          />
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-1 font-mono text-sm font-semibold text-slate-700">
            <span className="text-xs text-slate-400">R$</span>
            <span>{estimatedFinance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </td>
        <td className="px-6 py-4 text-center">
          <button
            type="button"
            onClick={() => onUpdate({ stopLoss: !order.stopLoss })}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${order.stopLoss ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
          >
            <span className={`material-symbols-outlined text-[16px] ${order.stopLoss ? 'fill-1' : ''}`}>
               {order.stopLoss ? 'check_circle' : 'security'}
            </span>
            O STOP
            <span className={`material-symbols-outlined text-[14px] transition-transform ${order.stopLoss ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>
        </td>
        <td className="px-6 py-4 text-right">
          <button onClick={onRemove} className="text-slate-300 hover:text-red-500 transition-colors">
            <span className="material-symbols-outlined text-[20px]">delete</span>
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
