import React, { useState, useEffect } from 'react';
import { HawkAsset } from '../types.ts';
import ClientSearch from './ClientSearch.tsx';
import {
  copyAndOpenOutlook,
  generateHawkOrderEmailSubject,
  generateHawkOrderEmailHtml,
  generateHawkOrderEmailPlainText
} from '../utils/emailGenerator.ts';

interface HawkOrderModalProps {
  selectedAssets: HawkAsset[];
  allAssets: HawkAsset[];
  onClose: () => void;
}

interface OrderLineState {
  assetId: string;
  ticker: string;
  gain: string;
  protection: string;
  expiration: string;
  mode: 'Qtd' | 'Fin';
  quantity: string;
  financial: string;
  price: number;
}

interface ClientSession {
  client: any;
  orderLines: OrderLineState[];
}

const HawkOrderModal: React.FC<HawkOrderModalProps> = ({ selectedAssets, allAssets, onClose }) => {
  const [sessions, setSessions] = useState<ClientSession[]>([]);
  const [activeSessionIndex, setActiveSessionIndex] = useState<number>(-1);
  const [realtimePrices, setRealtimePrices] = useState<Record<string, number>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAssetSelector, setShowAssetSelector] = useState(false);

  useEffect(() => {
    fetchRealtimePrices();
  }, [selectedAssets, allAssets]);

  const fetchRealtimePrices = async () => {
    setIsSyncing(true);
    try {
      const uniqueTickers = Array.from(new Set(allAssets.map(a => a.ticker))) as string[];
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

  const createOrderLines = (assets: HawkAsset[]): OrderLineState[] => {
    return assets.map(asset => ({
      assetId: asset.id,
      ticker: asset.ticker,
      gain: asset.gain,
      protection: asset.protection,
      expiration: asset.expiration,
      mode: 'Fin',
      quantity: '',
      financial: '',
      price: realtimePrices[asset.ticker] || asset.price || 0
    }));
  };

  const handleAddClient = (client: any) => {
    const alreadyExists = sessions.find(s => s.client.Conta === client.Conta);
    if (alreadyExists) {
      const idx = sessions.indexOf(alreadyExists);
      setActiveSessionIndex(idx);
      return;
    }

    const newSession: ClientSession = {
      client,
      orderLines: createOrderLines(selectedAssets)
    };
    setSessions(prev => [...prev, newSession]);
    setActiveSessionIndex(sessions.length);
  };

  const handleAddAssetToClient = (asset: HawkAsset) => {
    if (activeSessionIndex === -1) return;

    setSessions(prev => {
      const newSessions = [...prev];
      const session = newSessions[activeSessionIndex];

      const alreadyHas = session.orderLines.find(line => line.assetId === asset.id);
      if (alreadyHas) return prev;

      session.orderLines.push({
        assetId: asset.id,
        ticker: asset.ticker,
        gain: asset.gain,
        protection: asset.protection,
        expiration: asset.expiration,
        mode: 'Fin',
        quantity: '',
        financial: '',
        price: realtimePrices[asset.ticker] || asset.price || 0
      });
      return newSessions;
    });
    setShowAssetSelector(false);
  };

  const updateLine = (lineIdx: number, updates: Partial<OrderLineState>) => {
    if (activeSessionIndex === -1) return;

    setSessions(prev => {
      const newSessions = [...prev];
      const session = newSessions[activeSessionIndex];
      const line = session.orderLines[lineIdx];
      const price = realtimePrices[line.ticker] || line.price || 1;

      const newLine = { ...line, ...updates };

      if (updates.mode) {
        newLine.quantity = '';
        newLine.financial = '';
      } else if (updates.quantity !== undefined && newLine.mode === 'Qtd') {
        const q = parseFloat(updates.quantity) || 0;
        newLine.financial = q > 0 ? (q * price).toFixed(2) : '';
      } else if (updates.financial !== undefined && newLine.mode === 'Fin') {
        const f = parseFloat(updates.financial) || 0;
        newLine.quantity = f > 0 ? Math.floor(f / price).toString() : '';
      }

      session.orderLines[lineIdx] = newLine;
      return newSessions;
    });
  };

  const handleRemoveLine = (lineIdx: number) => {
    setSessions(prev => {
      const newSessions = [...prev];
      newSessions[activeSessionIndex].orderLines.splice(lineIdx, 1);
      return newSessions;
    });
  };

  const handleRemoveClient = (idx: number) => {
    setSessions(prev => prev.filter((_, i) => i !== idx));
    if (activeSessionIndex >= idx) {
      setActiveSessionIndex(prev => Math.max(-1, prev - 1));
    }
  };

  const handleSendOrder = async (sessionIdx: number) => {
    const session = sessions[sessionIdx];
    const validOrders = session.orderLines.filter(l => l.financial && parseFloat(l.financial) > 0);

    if (validOrders.length === 0) {
      alert('Defina valores financeiros para as ordens do cliente antes de enviar.');
      return;
    }

    const subject = generateHawkOrderEmailSubject({
      conta: session.client.Conta,
      id: session.client["Cod Bolsa"]
    });

    const html = generateHawkOrderEmailHtml({ nome: session.client.Cliente }, validOrders);
    const plainText = generateHawkOrderEmailPlainText({ nome: session.client.Cliente }, validOrders);
    const ccEmail = session.client["Email Assessor"];

    await copyAndOpenOutlook(
      session.client["Email Cliente"] || '',
      subject,
      html,
      plainText,
      ccEmail
    );
  };

  const activeSession = activeSessionIndex !== -1 ? sessions[activeSessionIndex] : null;

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-7xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col h-[90vh] animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="px-6 py-4 flex justify-between items-center bg-white border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary-dark">
              <span className="material-symbols-outlined font-bold">send</span>
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Boleta de Ordens Hawk Strategy</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-all p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Clientes */}
          <div className="w-80 bg-slate-50 border-r border-slate-200 p-6 flex flex-col gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adicionar Cliente</label>
              <ClientSearch
                onSelect={handleAddClient}
                placeholder="Busque cliente..."
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Clientes Selecionados ({sessions.length})</label>
              {sessions.map((s, idx) => (
                <div
                  key={s.client.Conta}
                  onClick={() => setActiveSessionIndex(idx)}
                  className={`group p-3 rounded-xl cursor-pointer transition-all border-2 ${activeSessionIndex === idx ? 'bg-primary/10 border-primary shadow-sm' : 'bg-white border-transparent hover:border-slate-200'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`text-xs font-black uppercase tracking-tight truncate w-48 ${activeSessionIndex === idx ? 'text-primary-dark' : 'text-slate-700'}`}>{s.client.Cliente}</p>
                      <p className="text-[10px] font-bold text-slate-400">Conta: {s.client.Conta}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveClient(idx); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="py-12 text-center">
                  <span className="material-symbols-outlined text-slate-200 text-4xl block mb-2">person_add</span>
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhum cliente</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col bg-white">
            {!activeSession ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                <span className="material-symbols-outlined text-6xl mb-4">touch_app</span>
                <p className="font-black text-sm uppercase tracking-widest">Selecione ou adicione um cliente à esquerda</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Info Bar */}
                <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{activeSession.client.Cliente}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID Bolsa: {activeSession.client["Cod Bolsa"]} | Consultor: {activeSession.client.Assessor}</p>
                  </div>
                  <button
                    onClick={() => handleSendOrder(activeSessionIndex)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#102218] text-primary text-[10px] font-black hover:brightness-110 transition-all shadow-md uppercase tracking-widest"
                  >
                    <span className="material-symbols-outlined text-sm">send</span>
                    Enviar Email deste Cliente
                  </button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">Papel</th>
                          <th className="px-6 py-4 text-center">Cotação</th>
                          <th className="px-6 py-4 text-center">Ganho</th>
                          <th className="px-6 py-4 text-center">Proteção</th>
                          <th className="px-6 py-4 text-center">Modo</th>
                          <th className="px-6 py-4">Financeiro (R$)</th>
                          <th className="px-6 py-4">Quantidade</th>
                          <th className="px-6 py-4 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeSession.orderLines.map((line, lIdx) => (
                          <tr key={`${activeSession.client.Conta}-${line.assetId}-${lIdx}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-black text-slate-900">{line.ticker}</p>
                              <p className="text-[10px] font-bold text-slate-400">ID: {line.assetId}</p>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-slate-700">
                              {isSyncing ? '...' : `R$ ${line.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[10px] font-black tracking-tight">{line.gain}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-black tracking-tight">{line.protection}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-3">
                                {['Fin', 'Qtd'].map(m => (
                                  <label key={m} className="flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      checked={line.mode === m}
                                      onChange={() => updateLine(lIdx, { mode: m as any })}
                                      className="h-3 w-3 text-primary border-slate-300"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{m}</span>
                                  </label>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="relative">
                                <span className="absolute left-2 top-2.5 text-[10px] text-slate-400">R$</span>
                                <input
                                  type="number"
                                  value={line.financial}
                                  disabled={line.mode === 'Qtd'}
                                  onChange={(e) => updateLine(lIdx, { financial: e.target.value })}
                                  className="w-28 rounded-lg border-slate-200 pl-7 py-2 text-[11px] font-black focus:ring-primary disabled:bg-slate-50 transition-all"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <input
                                type="number"
                                value={line.quantity}
                                disabled={line.mode === 'Fin'}
                                onChange={(e) => updateLine(lIdx, { quantity: e.target.value })}
                                className="w-20 rounded-lg border-slate-200 py-2 text-[11px] font-black focus:ring-primary disabled:bg-slate-50 transition-all"
                              />
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => handleRemoveLine(lIdx)} className="text-slate-300 hover:text-red-500 transition-colors">
                                <span className="material-symbols-outlined text-lg">close</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 flex justify-between items-center">
                    <div className="relative">
                      <button
                        onClick={() => setShowAssetSelector(!showAssetSelector)}
                        className="flex items-center gap-2 text-[10px] font-black text-primary-dark uppercase tracking-widest hover:text-primary transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">add_circle</span>
                        Adicionar Ativo ao Cliente
                      </button>

                      {showAssetSelector && (
                        <div className="absolute top-full left-0 mt-2 w-72 max-h-60 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-y-auto z-10 animate-in slide-in-from-top-2 duration-200">
                          {allAssets.map(asset => (
                            <div
                              key={asset.id}
                              onClick={() => handleAddAssetToClient(asset)}
                              className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                            >
                              <p className="font-black text-xs text-slate-800 tracking-tight">{asset.ticker}</p>
                              <div className="flex justify-between mt-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase">{asset.term}</span>
                                <span className="text-[9px] font-black text-emerald-600">{asset.gain}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal Estimado</p>
                      <p className="text-xl font-black text-slate-800 tracking-tighter">
                        R$ {activeSession.orderLines.reduce((acc, l) => acc + (parseFloat(l.financial) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HawkOrderModal;
