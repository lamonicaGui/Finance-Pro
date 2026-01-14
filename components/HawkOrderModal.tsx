
import React, { useState, useEffect } from 'react';
import { HawkAsset } from '../types.ts';
import ClientSearch from './ClientSearch.tsx';
import {
  copyAndOpenOutlook,
  generateOrderEmailSubject,
  generateOrderEmailHtml,
  generateOrderEmailPlainText
} from '../utils/emailGenerator.ts';

interface HawkOrderModalProps {
  selectedAssets: HawkAsset[];
  onClose: () => void;
}

interface OrderLineState {
  assetId: string;
  mode: 'Qtd' | 'Fin';
  quantity: string;
  financial: string;
}

const HawkOrderModal: React.FC<HawkOrderModalProps> = ({ selectedAssets, onClose }) => {
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [orderLines, setOrderLines] = useState<OrderLineState[]>([]);
  const [realtimePrices, setRealtimePrices] = useState<Record<string, number>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchRealtimePrices();
  }, [selectedAssets]);

  const fetchRealtimePrices = async () => {
    setIsSyncing(true);
    try {
      const uniqueTickers = Array.from(new Set(selectedAssets.map(a => a.ticker))) as string[];
      const priceMap: Record<string, number> = {};

      await Promise.all(uniqueTickers.map(async (ticker: string) => {
        try {
          const yahooTicker = ticker.endsWith('.SA') ? ticker : `${ticker}.SA`;
          const res = await fetch(`/api/yahoo/v8/finance/chart/${yahooTicker}?interval=1d&range=1d`);
          if (res.ok) {
            const data = await res.json();
            const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
            if (price) {
              priceMap[ticker] = price;
            }
          }
        } catch (e) {
          console.warn(`Erro quote ${ticker}:`, e);
        }
      }));

      setRealtimePrices(priceMap);
    } catch (err) {
      console.error("Erro na sincronização de preços:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    setOrderLines(selectedAssets.map(asset => ({
      assetId: asset.id,
      mode: 'Fin',
      quantity: '',
      financial: ''
    })));
  }, [selectedAssets]);

  const getAssetPrice = (asset: HawkAsset) => {
    return realtimePrices[asset.ticker] || asset.price || 0;
  };

  const updateLine = (assetId: string, updates: Partial<OrderLineState>) => {
    setOrderLines(prev => prev.map(line => {
      if (line.assetId !== assetId) return line;

      const asset = selectedAssets.find(a => a.id === assetId);
      const price = asset ? getAssetPrice(asset) : 1;
      const newLine = { ...line, ...updates };

      // Mudança de modo limpa os campos para novo cálculo
      if (updates.mode) {
        newLine.quantity = '';
        newLine.financial = '';
        return newLine;
      }

      // Cálculo Quantidade -> Financeiro
      if (updates.quantity !== undefined && newLine.mode === 'Qtd') {
        const q = parseFloat(updates.quantity) || 0;
        newLine.financial = q > 0 ? (q * price).toFixed(2) : '';
      }

      // Cálculo Financeiro -> Quantidade
      if (updates.financial !== undefined && newLine.mode === 'Fin') {
        const f = parseFloat(updates.financial) || 0;
        newLine.quantity = f > 0 ? Math.floor(f / price).toString() : '';
      }

      return newLine;
    }));
  };

  const handleSendOrder = async () => {
    if (!selectedClient) {
      alert('Por favor, selecione um cliente da base.');
      return;
    }

    const validOrders = orderLines.filter(l => l.quantity && parseFloat(l.quantity) > 0);

    if (validOrders.length === 0) {
      alert('Defina valores para as ordens antes de enviar.');
      return;
    }

    // Map for email generator
    const mappedOrders = validOrders.map(l => {
      const asset = selectedAssets.find(a => a.id === l.assetId);
      return {
        ticker: asset?.ticker || '',
        side: 'Compra', // Hawk is always Buy/Entry for these structured products
        quantity: l.quantity,
        price: asset?.price || 0,
        mode: 'Limitada', // Structured products usually have a fixed price/condition
        // Add protection/gain info as a note if possible, or just keep it simple
      };
    });

    const subject = generateOrderEmailSubject({
      conta: selectedClient.Conta,
      id: selectedClient["Cod Bolsa"]
    });

    const html = generateOrderEmailHtml({ nome: selectedClient.Cliente }, mappedOrders);
    const plainText = generateOrderEmailPlainText({ nome: selectedClient.Cliente }, mappedOrders);
    const ccEmail = selectedClient["Email Assessor"];

    await copyAndOpenOutlook(
      selectedClient["Email Cliente"] || '',
      subject,
      html,
      plainText,
      ccEmail
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center bg-white border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary-dark">
              <span className="material-symbols-outlined font-bold">send</span>
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Boleta de Ordens - Hawk Strategy</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-all p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Nome do Cliente */}
          <div className="space-y-1.5 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
            <label className="text-xs font-black text-slate-800 uppercase tracking-widest block mb-1.5">Cliente da Base Master</label>
            <ClientSearch
              onSelect={(c) => setSelectedClient(c)}
              placeholder="Busque por Nome, Sinacor ou Conta..."
            />
            {selectedClient && (
              <div className="mt-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                <p className="text-sm font-bold text-slate-700">
                  Selecionado: <span className="uppercase text-primary-dark">{selectedClient.Cliente}</span>
                  <span className="ml-2 text-slate-400">| Conta: {selectedClient.Conta}</span>
                  <span className="ml-2 text-slate-400">| Bolsa: {selectedClient["Cod Bolsa"]}</span>
                </p>
              </div>
            )}
          </div>

          {/* Tabela de Ordens */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/30 overflow-hidden shadow-inner">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/80 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                <tr>
                  <th className="px-4 py-4">Ativo</th>
                  <th className="px-4 py-4">Empresa</th>
                  <th className="px-4 py-4 text-center">Cotação</th>
                  <th className="px-4 py-4 text-center">Ganho</th>
                  <th className="px-4 py-4 text-center">Proteção</th>
                  <th className="px-4 py-4 text-center">Modo</th>
                  <th className="px-4 py-4">Quantidade</th>
                  <th className="px-4 py-4">Financeiro (R$)</th>
                  <th className="px-4 py-4 text-right">Execução Aproximada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {orderLines.map(line => {
                  const asset = selectedAssets.find(a => a.id === line.assetId);
                  if (!asset) return null;

                  const assetPrice = getAssetPrice(asset);
                  const approxExecution = (parseFloat(line.quantity) || 0) * assetPrice;

                  return (
                    <tr key={line.assetId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-4 font-black text-slate-900">{asset.ticker}</td>
                      <td className="px-4 py-4 text-slate-500 italic">{asset.company}</td>
                      <td className="px-4 py-4 text-center font-bold text-slate-700">
                        {isSyncing ? (
                          <span className="text-[10px] text-emerald-500 animate-pulse">Sinc...</span>
                        ) : (
                          `R$ ${assetPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        )}
                      </td>
                      <td className="px-4 py-4 text-center text-emerald-600 font-bold">{asset.gain}</td>
                      <td className="px-4 py-4 text-center text-slate-600 font-bold">{asset.protection}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-4">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`mode-${line.assetId}`}
                              checked={line.mode === 'Qtd'}
                              onChange={() => updateLine(line.assetId, { mode: 'Qtd' })}
                              className="text-primary focus:ring-primary h-4 w-4 border-slate-300"
                            />
                            <span className="text-[11px] font-bold text-slate-500">Qtd</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name={`mode-${line.assetId}`}
                              checked={line.mode === 'Fin'}
                              onChange={() => updateLine(line.assetId, { mode: 'Fin' })}
                              className="text-primary focus:ring-primary h-4 w-4 border-slate-300"
                            />
                            <span className="text-[11px] font-bold text-slate-500">Fin</span>
                          </label>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          value={line.quantity}
                          disabled={line.mode === 'Fin'}
                          placeholder="0"
                          onChange={(e) => updateLine(line.assetId, { quantity: e.target.value })}
                          className="w-24 rounded-lg border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-bold focus:ring-primary disabled:opacity-40 disabled:bg-slate-100 transition-all"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative">
                          <span className="absolute left-2 top-2.5 text-[10px] text-slate-400">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={line.financial}
                            disabled={line.mode === 'Qtd'}
                            placeholder="0,00"
                            onChange={(e) => updateLine(line.assetId, { financial: e.target.value })}
                            className="w-32 rounded-lg border-slate-200 bg-slate-50/50 pl-7 pr-2 py-2 text-xs font-bold focus:ring-primary disabled:opacity-40 disabled:bg-slate-100 transition-all"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-black text-slate-900">
                        R$ {approxExecution.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-500 hover:bg-slate-100 transition-all uppercase"
          >
            Cancelar
          </button>
          <button
            onClick={handleSendOrder}
            className="flex items-center gap-2 px-10 py-3 rounded-xl bg-[#102218] text-primary text-xs font-black hover:brightness-125 transition-all shadow-lg shadow-primary/10 uppercase"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
            Enviar E-mail de Aprovação
          </button>
        </div>
      </div>
    </div>
  );
};

export default HawkOrderModal;
