
import React, { useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import ClientSearch from './ClientSearch';

interface Client {
    "Cod Bolsa": string;
    "Cliente": string;
    "Conta": string;
    "Email Cliente"?: string;
    "Email Assessor"?: string;
}

interface OpenPosition {
    id: any;
    ativo: string;
    conta: string;
    preco_medio: any;
    cliente_nome: string;
    qtd?: any;
    Qtd?: any;
}

interface QuoteData {
    price: number;
    change: number;
    changePercent: number;
}

const OpenPositions: React.FC = () => {
    const [positions, setPositions] = useState<OpenPosition[]>([]);
    const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const fetchClientPositions = async (client: Client) => {
        setLoading(true);
        setHasSearched(true);
        setSelectedClient(client);
        try {
            // Search by name and account to be precise if possible
            const { data, error } = await supabase
                .from('open_positions')
                .select('*')
                .or(`cliente_nome.ilike.%${client.Cliente}%,conta.eq.${client.Conta}`)
                .order('ativo', { ascending: true });

            if (error) throw error;
            setPositions(data || []);
            if (data && data.length > 0) {
                fetchQuotes(data.map(p => p.ativo));
            } else {
                setQuotes({});
            }
        } catch (err) {
            console.error('Erro ao buscar posições:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuotes = async (tickers: string[]) => {
        setSyncing(true);
        const uniqueTickers = Array.from(new Set(tickers));
        const newQuotes: Record<string, QuoteData> = {};

        try {
            for (let i = 0; i < uniqueTickers.length; i += 5) {
                const chunk = uniqueTickers.slice(i, i + 5);
                await Promise.all(chunk.map(async (ticker) => {
                    try {
                        const yahooTicker = ticker.endsWith('.SA') ? ticker : `${ticker}.SA`;
                        const res = await fetch(`/api/yahoo/v8/finance/chart/${yahooTicker}?interval=1d&range=1d`);
                        if (res.ok) {
                            const data = await res.json();
                            const result = data.chart?.result?.[0];
                            const price = result?.meta?.regularMarketPrice;
                            const prevClose = result?.meta?.chartPreviousClose;

                            if (price) {
                                newQuotes[ticker] = {
                                    price: price,
                                    change: price - prevClose,
                                    changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0
                                };
                            }
                        }
                    } catch (e) {
                        console.warn(`Erro ao buscar cotação para ${ticker}:`, e);
                    }
                }));
            }
            setQuotes(newQuotes);
        } catch (err) {
            console.error('Erro na sincronização de preços:', err);
        } finally {
            setSyncing(false);
        }
    };

    const parseBRL = (val: any): number => {
        if (typeof val === 'number') return val;
        if (!val || typeof val !== 'string') return 0;
        const clean = val.replace('R$', '')
            .replace(/\s/g, '')
            .replace(/\./g, '')
            .replace(',', '.');
        return parseFloat(clean) || 0;
    };

    const totals = useMemo(() => {
        return positions.reduce((acc, pos) => {
            const quote = quotes[pos.ativo];
            const currentPrice = quote?.price || 0;
            const q = parseBRL(pos.qtd || pos.Qtd);
            const pm = parseBRL(pos.preco_medio);

            const costTotal = q * pm;
            const currentTotal = q * currentPrice;
            const result = currentTotal - costTotal;

            return {
                totalCusto: acc.totalCusto + costTotal,
                totalSaldo: acc.totalSaldo + currentTotal,
                totalResultado: acc.totalResultado + result
            };
        }, { totalCusto: 0, totalSaldo: 0, totalResultado: 0 });
    }, [positions, quotes]);

    if (!hasSearched && !loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 gap-8 animate-in fade-in duration-500">
                <div className="text-center space-y-4 max-w-xl">
                    <div className="h-16 w-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-4xl">person_search</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Posições em Aberto</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Selecione um cliente para consultar o saldo e resultado em tempo real.</p>
                </div>

                <div className="w-full max-w-lg">
                    <ClientSearch
                        onSelect={(client) => fetchClientPositions(client)}
                        placeholder="Pesquisar por Nome, Cod Bolsa ou Conta..."
                        className="shadow-2xl rounded-[2rem]"
                    />
                </div>

                <div className="grid grid-cols-3 gap-4 w-full max-w-lg mt-4 opacity-50 grayscale pointer-events-none">
                    {['VALE3', 'PETR4', 'ITUB4'].map(t => (
                        <div
                            key={t}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center"
                        >
                            {t}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (loading && positions.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center bg-transparent">
                <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando Posições...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col p-10 gap-8 animate-in fade-in duration-500">
            {/* Header with Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic truncate max-w-md">
                        {selectedClient?.Cliente || 'Posições do Cliente'}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Conta: {selectedClient?.Conta || '---'}</p>
                        <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{positions.length} Ativos</p>
                    </div>
                </div>
                <div className="flex gap-2 min-w-[350px]">
                    <div className="flex-1">
                        <ClientSearch
                            onSelect={(client) => fetchClientPositions(client)}
                            placeholder="Mudar cliente..."
                            showHeaderStyle={true}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setHasSearched(false);
                            setPositions([]);
                            setSelectedClient(null);
                        }}
                        className="h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    >
                        Limpar
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white/40 dark:bg-card-dark/40 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Saldo Bruto Total</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                        R$ {totals.totalSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Valores em tempo real</span>
                    </div>
                </div>

                <div className="bg-white/40 dark:bg-card-dark/40 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Resultado Total</p>
                    <p className={`text-3xl font-black tracking-tighter ${totals.totalResultado >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        R$ {totals.totalResultado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">
                        Rentabilidade: {totals.totalCusto > 0 ? ((totals.totalResultado / totals.totalCusto) * 100).toFixed(2) : '0.00'}%
                    </p>
                </div>

                <div className="bg-white/40 dark:bg-card-dark/40 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm lg:col-span-1 md:col-span-2">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status da Sincronização</p>
                        {syncing && <span className="material-symbols-outlined text-sm animate-spin text-primary">sync</span>}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-1000"
                                style={{ width: syncing ? '100%' : '0%', opacity: syncing ? 1 : 0 }}
                            ></div>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase">{syncing ? 'Sincronizando Preços...' : 'Preços Atualizados'}</span>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white/60 dark:bg-card-dark/60 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ATIVO</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">QUANTIDADE</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">COTAÇÃO</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">PREÇO MÉDIO</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">CUSTO TOTAL</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">SALDO BRUTO (R$)</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">VARIAÇÃO (%)</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">RESULTADO (R$)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {positions.map((pos) => {
                                const quote = quotes[pos.ativo];
                                const currentPrice = quote?.price || 0;
                                const q = parseBRL(pos.qtd || pos.Qtd);
                                const pm = parseBRL(pos.preco_medio);

                                const costTotal = q * pm;
                                const currentTotal = q * currentPrice;
                                const result = currentTotal - costTotal;
                                const variation = costTotal > 0 ? (result / costTotal) * 100 : 0;

                                return (
                                    <tr key={pos.id} className="group hover:bg-white dark:hover:bg-card-dark transition-all transition-duration-300">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{pos.ativo}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate max-w-[150px]">{pos.cliente_nome}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">{q.toLocaleString('pt-BR')}</span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs font-black text-slate-900 dark:text-white">
                                                    {currentPrice > 0 ? `R$ ${currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '---'}
                                                </span>
                                                {quote && (
                                                    <span className={`text-[9px] font-bold ${quote.changePercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {quote.changePercent >= 0 ? '▲' : '▼'} {Math.abs(quote.changePercent).toFixed(2)}%
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="text-xs font-bold text-slate-500">R$ {pm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">R$ {costTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-xs font-black text-slate-900 dark:text-white">
                                                {currentTotal > 0 ? `R$ ${currentTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '---'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black ${variation >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {variation >= 0 ? '+' : ''}{variation.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <span className={`text-xs font-black ${result >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                R$ {result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {positions.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-20">inventory_2</span>
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma posição em aberto encontrada para "{selectedClient?.Cliente}"</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OpenPositions;
