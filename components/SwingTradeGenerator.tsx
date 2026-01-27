
import React, { useState, useEffect } from 'react';
import { SwingTradeAsset, SwingTradeStatus } from '../types.ts';
import { supabase } from '../services/supabase';
import { parseSwingTradePdf } from '../utils/swingTradeParser.ts';
import SwingTradeOrderModal from './SwingTradeOrderModal.tsx';

interface SwingTradeGeneratorProps {
    userEmail?: string;
}

const SwingTradeGenerator: React.FC<SwingTradeGeneratorProps> = ({ userEmail }) => {
    const [assets, setAssets] = useState<SwingTradeAsset[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const [rawText, setRawText] = useState<string | null>(null);
    const [showDebug, setShowDebug] = useState(false);
    const [orderAssets, setOrderAssets] = useState<SwingTradeAsset[]>([]);
    const [modalMode, setModalMode] = useState<'entry' | 'exchange'>('entry');

    // Load from Supabase on mount and subscribe to changes
    useEffect(() => {
        const fetchAssets = async () => {
            const { data, error } = await supabase
                .from('swing_trade_menu')
                .select('*')
                .order('created_at', { ascending: true });
            if (data) setAssets(data);
            if (error) console.error("Error fetching swing trade menu:", error);
        };

        fetchAssets();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('swing_trade_menu_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'swing_trade_menu'
            }, () => {
                fetchAssets();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Sincronização de Preços (Yahoo Finance Proxy)
    const fetchPrices = async () => {
        if (assets.length === 0) return;
        setIsSyncing(true);
        console.log("Sincronizando cotações Swing Trade...");

        try {
            const tickers = Array.from(new Set(assets.map(a => a.ticker as string)));
            const updatedAssets = [...assets];

            await Promise.all(tickers.map(async (ticker: string) => {
                try {
                    const yahooTicker = ticker.includes('/') ? ticker.split('/')[0] + '.SA' : (ticker.endsWith('.SA') ? ticker : `${ticker}.SA`);
                    const res = await fetch(`/api/yahoo/v8/finance/chart/${yahooTicker}?interval=1d&range=1d`);
                    if (res.ok) {
                        const data = await res.json();
                        const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
                        if (price) {
                            updatedAssets.forEach((asset, idx) => {
                                if (asset.ticker === ticker) {
                                    updatedAssets[idx].currentPrice = price;
                                }
                            });
                        }
                    }
                } catch (e) {
                    console.warn(`Erro quote ${ticker}:`, e);
                }
            }));

            setAssets(updatedAssets);

            // Update database with new prices (async, don't block UI)
            updatedAssets.forEach(async (a) => {
                if (a.currentPrice) {
                    await supabase.from('swing_trade_menu').update({ currentPrice: a.currentPrice }).eq('id', a.id);
                }
            });
        } catch (err) {
            console.error("Erro geral na sincronização:", err);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleFileUpload = async (file: File) => {
        setIsParsing(true);
        setRawText(null);
        setShowDebug(false);
        try {
            const result = await parseSwingTradePdf(file);
            setRawText(result.rawText);
            if (result.assets.length === 0) {
                alert("Nenhuma recomendação encontrada.");
            } else {
                const newAssets = result.assets.map(a => ({ ...a, selected: false }));

                // Persistence in Supabase
                const { error: deleteError } = await supabase.from('swing_trade_menu').delete().neq('id', 'CLEAR_ALL');
                if (deleteError) throw deleteError;

                const { error: insertError } = await supabase.from('swing_trade_menu').insert(newAssets);
                if (insertError) throw insertError;

                setAssets(newAssets);
            }
        } catch (err: any) {
            alert(`Falha ao ler o PDF: ${err.message || 'Erro desconhecido'}`);
        } finally {
            setIsParsing(false);
        }
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
        }
    };

    const toggleSelect = async (id: string) => {
        const asset = assets.find(a => a.id === id);
        if (!asset) return;

        const nextSelected = !asset.selected;

        // Optimistic
        setAssets(prev => prev.map(a => a.id === id ? { ...a, selected: nextSelected } : a));

        const { error } = await supabase.from('swing_trade_menu').update({ selected: nextSelected }).eq('id', id);
        if (error) {
            console.error("Error toggling:", error);
            setAssets(prev => prev.map(a => a.id === id ? { ...a, selected: !nextSelected } : a));
        }
    };

    const deleteAsset = async (id: string) => {
        setAssets(prev => prev.filter(a => a.id !== id));
        await supabase.from('swing_trade_menu').delete().eq('id', id);
    };

    const clearAll = async () => {
        if (!confirm("Deseja limpar todo o cardápio Swing Trade?")) return;
        setAssets([]);
        await supabase.from('swing_trade_menu').delete().neq('id', 'CLEAR_ALL');
    };

    const calculateDynamicPotential = (asset: SwingTradeAsset) => {
        const price = asset.currentPrice || asset.entryPrice;
        if (!price || price <= 0) return { upside: asset.upside, downside: asset.downside };
        const upPct = ((asset.targetPrice / price) - 1) * 100;
        const downPct = ((asset.stopPrice / price) - 1) * 100;
        return {
            upside: `${upPct > 0 ? '+' : ''}${upPct.toFixed(2)}%`,
            downside: `${downPct > 0 ? '+' : ''}${downPct.toFixed(2)}%`
        };
    };

    const renderTable = (status: SwingTradeStatus, title: string) => {
        const filtered = assets.filter(a => a.status === status);
        if (filtered.length === 0 && assets.length > 0) return null;

        return (
            <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-900 dark:bg-primary/10 rounded-t-[2.5rem] px-8 py-6 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(206,255,0,0.8)]"></div>
                        <h3 className="text-[13px] font-black text-white dark:text-primary uppercase tracking-[0.2em] italic">{title}</h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-card-dark rounded-b-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border-x border-b border-slate-100 dark:border-slate-800 overflow-hidden px-4 pb-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[1000px]">
                            <thead>
                                <tr className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] border-b border-slate-50 dark:border-slate-800">
                                    <th className="px-6 py-6 w-10 text-center">Sel.</th>
                                    <th className="px-4 py-6 font-black">Ativo</th>
                                    <th className="px-4 py-6 text-center font-black">Operação</th>
                                    <th className="px-4 py-6 text-center font-black">Objetivo</th>
                                    <th className="px-4 py-6 text-center font-black">Stop</th>
                                    <th className="px-4 py-6 text-center font-black">Cotação</th>
                                    <th className="px-4 py-6 text-center text-emerald-600 font-black">Ganho Potencial</th>
                                    <th className="px-4 py-6 text-center text-red-500 font-black">Perda Potencial</th>
                                    <th className="px-6 py-6 text-right font-black">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50/50 dark:divide-slate-800/50">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={9} className="px-6 py-16 text-center text-slate-300 dark:text-slate-700 italic text-sm font-black uppercase tracking-widest">Nenhuma recomendação</td></tr>
                                ) : (
                                    filtered.map((asset) => {
                                        const dyn = calculateDynamicPotential(asset);
                                        return (
                                            <tr key={asset.id} className={`${asset.selected ? 'bg-primary/5' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all duration-300 group`}>
                                                <td className="px-6 py-5 text-center">
                                                    <input type="checkbox" checked={asset.selected} onChange={() => toggleSelect(asset.id)} className="w-5 h-5 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-primary cursor-pointer focus:ring-primary/20" />
                                                </td>
                                                <td className="px-4 py-5">
                                                    <div className="text-sm font-black text-slate-800 dark:text-white uppercase truncate max-w-[120px]" title={asset.ticker}>{asset.ticker}</div>
                                                </td>
                                                <td className="px-4 py-5 text-center">
                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${asset.type === 'Compra' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : (asset.type === 'Venda' ? 'bg-red-50 dark:bg-red-500/10 text-red-600' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600')}`}>{asset.type}</span>
                                                </td>
                                                <td className="px-4 py-5 text-center font-black text-slate-600 dark:text-slate-400">
                                                    {asset.targetPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                                </td>
                                                <td className="px-4 py-5 text-center font-black text-slate-600 dark:text-slate-400">
                                                    {asset.stopPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                                </td>
                                                <td className="px-4 py-5 text-center font-black text-slate-900 dark:text-slate-200">
                                                    {(asset.currentPrice || asset.entryPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                                    {asset.currentPrice && <div className="text-[8px] text-emerald-500 font-bold uppercase tracking-tighter animate-pulse">LIVE</div>}
                                                </td>
                                                <td className="px-4 py-5 text-center font-black text-emerald-500">{dyn.upside}</td>
                                                <td className="px-4 py-5 text-center font-black text-red-400">{dyn.downside}</td>
                                                <td className="px-6 py-5 text-right">
                                                    <button onClick={() => { setModalMode('entry'); setOrderAssets([asset]); }} className="h-10 w-10 flex items-center justify-center text-slate-300 hover:text-primary dark:hover:text-primary transition-all rounded-xl hover:bg-primary/5">
                                                        <span className="material-symbols-outlined">send</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-12 animate-in fade-in duration-700 -mt-10">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                <div>
                    <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic">Swing Trade</h1>
                    <div className="text-[10px] font-black text-primary uppercase mt-2 tracking-[0.2em] italic">Dashboard de Oportunidades</div>
                </div>
                <div className="flex gap-4">
                    {assets.some(a => a.selected) && (
                        <>
                            <button
                                onClick={() => {
                                    const selected = assets.filter(a => a.selected);
                                    setModalMode('entry');
                                    setOrderAssets(selected);
                                }}
                                className="bg-[#27a673] px-8 py-4 rounded-[1.25rem] text-[11px] font-black text-white shadow-2xl hover:scale-105 transition-all uppercase tracking-[0.2em] flex items-center gap-3 animate-in zoom-in duration-300"
                            >
                                <span className="material-symbols-outlined text-lg">add_circle</span>
                                Nova Entrada
                            </button>
                            <button
                                onClick={() => {
                                    const selected = assets.filter(a => a.selected);
                                    setModalMode('exchange');
                                    setOrderAssets(selected);
                                }}
                                className="bg-slate-900 dark:bg-primary px-8 py-4 rounded-[1.25rem] text-[11px] font-black text-primary dark:text-white shadow-2xl hover:scale-105 transition-all uppercase tracking-[0.2em] flex items-center gap-3 animate-in zoom-in duration-300"
                            >
                                <span className="material-symbols-outlined text-lg">swap_horiz</span>
                                Troca de Ativo(s)
                            </button>
                        </>
                    )}
                    {assets.length > 0 && (
                        <button onClick={fetchPrices} disabled={isSyncing} className="bg-white dark:bg-card-dark border-2 border-primary/20 dark:border-primary/40 px-8 py-4 rounded-[1.25rem] text-[11px] font-black text-primary shadow-xl hover:scale-105 transition-all uppercase flex items-center gap-3 disabled:opacity-50">
                            <span className={`material-symbols-outlined text-lg ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
                            {isSyncing ? 'Sincronizando...' : 'Atualizar Cotações'}
                        </button>
                    )}
                    <button onClick={clearAll} className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 px-8 py-4 rounded-[1.25rem] text-[11px] font-black text-slate-400 hover:text-red-500 transition-all uppercase flex items-center gap-3">
                        <span className="material-symbols-outlined text-lg">delete_sweep</span>
                        Limpar
                    </button>
                </div>
            </div>

            {assets.length === 0 ? (
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
                    onDragLeave={() => setIsDragActive(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragActive(false); if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]); }}
                    className={`relative group rounded-[3rem] border-2 border-dashed transition-all duration-700 p-24 text-center ${isDragActive ? 'border-primary bg-primary/5 shadow-2xl scale-[0.98]' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-card-dark shadow-xl dark:shadow-none'}`}
                >
                    <input type="file" onChange={onFileChange} accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="mb-8 h-32 w-32 mx-auto bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-200 dark:text-slate-800 group-hover:text-primary transition-all group-hover:rotate-12 shadow-inner">
                        <span className="material-symbols-outlined text-6xl">{isParsing ? 'sync' : 'upload_file'}</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase mb-3 tracking-tighter italic">Importar Safra Prospect</h2>
                    <p className="text-slate-400 dark:text-slate-500 font-medium max-w-sm mx-auto">Arraste o PDF de recomendações para cá ou clique para selecionar o arquivo no seu computador.</p>
                </div>
            ) : (
                <div className="space-y-4 pb-20">
                    {renderTable('Valendo Entrada', 'Recomendações Valendo Entrada')}
                    {renderTable('Em Aberto', 'Recomendações em Aberto')}
                </div>
            )}

            {!isParsing && assets.length === 0 && rawText && (
                <div className="mt-10 max-w-2xl mx-auto p-8 bg-white dark:bg-card-dark rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl dark:shadow-none">
                    <button onClick={() => setShowDebug(!showDebug)} className="w-full py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-100 transition-all mb-4">
                        {showDebug ? 'Ocultar Debug' : 'Ver Conteúdo Bruto'}
                    </button>
                    {showDebug && <textarea className="w-full h-64 bg-slate-900 border-none rounded-2xl p-6 text-[11px] font-mono text-emerald-400/80 focus:outline-none shadow-inner" readOnly value={rawText} />}
                </div>
            )}

            {orderAssets.length > 0 && (
                <SwingTradeOrderModal
                    assets={orderAssets}
                    mode={modalMode}
                    userEmail={userEmail}
                    onClose={() => setOrderAssets([])}
                    onConfirm={(data) => {
                        console.log("Processo de envio Swing Trade concluído:", data);
                        setOrderAssets([]);
                    }}
                />
            )}
        </div>
    );
};

export default SwingTradeGenerator;
