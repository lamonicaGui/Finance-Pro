import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../services/supabase';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface LongShortOp {
    id?: string;
    cliente: string;
    ativo_long: string;
    qtd_long: number;
    pm_long: number;
    ativo_short: string;
    qtd_short: number;
    pm_short: number;
    data_inicio: string;
    status: string;
}

interface QuoteData {
    price: number;
    change: number;
    changePercent: number;
}

const LongShortControl: React.FC = () => {
    const [operations, setOperations] = useState<LongShortOp[]>([]);
    const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [filterClient, setFilterClient] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchOperations();
    }, []);

    const fetchOperations = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('long_short_operations')
                .select('*')
                .eq('status', 'Aberta');

            if (error) throw error;
            setOperations(data || []);
            if (data && data.length > 0) {
                const assets = new Set<string>();
                data.forEach(op => {
                    assets.add(op.ativo_long);
                    assets.add(op.ativo_short);
                });
                fetchQuotes(Array.from(assets));
            }
        } catch (err) {
            console.error('Error fetching L&S operations:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuotes = async (tickers: string[]) => {
        if (tickers.length === 0) return;
        setSyncing(true);
        const uniqueTickers = Array.from(new Set(tickers));
        const newQuotes: Record<string, QuoteData> = { ...quotes };

        try {
            const ts = Date.now();
            for (let i = 0; i < uniqueTickers.length; i += 5) {
                const chunk = uniqueTickers.slice(i, i + 5);
                await Promise.all(chunk.map(async (ticker) => {
                    try {
                        const cleanTicker = ticker.trim().toUpperCase();
                        const yahooTicker = cleanTicker.endsWith('.SA') ? cleanTicker : `${cleanTicker}.SA`;
                        const res = await fetch(`/api/yahoo/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=1d&_=${ts}`);

                        if (!res.ok) return;

                        const data = await res.json();
                        const result = data.chart?.result?.[0];
                        const price = result?.meta?.regularMarketPrice || result?.meta?.chartPreviousClose;
                        const prevClose = result?.meta?.chartPreviousClose;

                        if (price !== undefined && price !== null) {
                            newQuotes[ticker] = {
                                price: price,
                                change: price - (prevClose || price),
                                changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0
                            };
                        }
                    } catch (e) {
                        console.error(`Error fetching quote for ${ticker}:`, e);
                    }
                }));
            }
            setQuotes(newQuotes);
        } catch (err) {
            console.error('Error syncing quotes:', err);
        } finally {
            setSyncing(false);
        }
    };

    const normalizeStr = (s: string) =>
        String(s || '').toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "");

    const parseNum = (val: any): number => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        let clean = String(val).replace('R$', '').replace(/\s/g, '').trim();
        const hasComma = clean.includes(',');
        const hasDot = clean.includes('.');

        if (hasComma && hasDot) {
            const lastComma = clean.lastIndexOf(',');
            const lastDot = clean.lastIndexOf('.');
            if (lastComma > lastDot) {
                clean = clean.replace(/\./g, '').replace(',', '.');
            } else {
                clean = clean.replace(/,/g, '');
            }
        } else if (hasComma) {
            clean = clean.replace(',', '.');
        }
        const parsed = parseFloat(clean);
        return isNaN(parsed) ? 0 : parsed;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();

        if (file.name.endsWith('.csv')) {
            reader.onload = (event) => {
                const text = new TextDecoder('utf-8').decode(new Uint8Array(event.target?.result as ArrayBuffer));
                // Tenta detectar se o delimitador é ponto-e-vírgula pesquisando nas primeiras linhas
                const firstLines = text.slice(0, 1000);
                const hasSemicolon = firstLines.includes(';');

                Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    delimiter: hasSemicolon ? ';' : ',',
                    complete: (results) => processImport(results.data),
                    error: () => setIsImporting(false)
                });
            };
            reader.readAsArrayBuffer(file);
        } else {
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                    processImport(jsonData);
                } catch (err) {
                    setIsImporting(false);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const processImport = async (rawData: any[]) => {
        try {
            // Se o arquivo tiver uma linha de metadados no topo, pulamos se necessário.
            // O PapaParse já lida com o cabeçalho se configurado.

            const getRaw = (item: any, aliases: string[]) => {
                const keys = Object.keys(item);
                const exact = keys.find(k => {
                    const normK = normalizeStr(k);
                    return aliases.some(a => normalizeStr(a) === normK);
                });
                return exact ? item[exact] : undefined;
            };

            // Processar como "legs" individuais primeiro
            const legs = rawData.map(item => {
                const statusRaw = String(getRaw(item, ['Status da Operação', 'Status', 'Situação']) || 'Aberta').trim();
                const isAberta = normalizeStr(statusRaw) === 'aberta' || statusRaw === '';

                return {
                    cliente: String(getRaw(item, ['Cliente', 'Nome', 'Titular', 'Nome do Cliente']) || '').trim(),
                    ativo: String(getRaw(item, ['Ativo', 'Papel', 'Símbolo']) || '').trim().toUpperCase(),
                    lado: String(getRaw(item, ['Lado', 'C/V', 'Sentido']) || '').trim().toUpperCase(), // 'C' ou 'V'
                    qtd: parseNum(getRaw(item, ['Quantidade', 'Qtd', 'Volume'])),
                    pm: parseNum(getRaw(item, ['Preço Médio', 'PM', 'Preço', 'Preço Executado'])),
                    data: String(getRaw(item, ['Data de Início', 'Data', 'Abertura', 'Criação', 'Criado em']) || '').split(' ')[0], // Apenas a data
                    status: isAberta ? 'Aberta' : statusRaw
                };
            }).filter(leg => leg.cliente && leg.ativo && leg.status === 'Aberta');

            // Agrupar pernas em Pares (Long & Short)
            // Agrupamos por Cliente + Data
            const groupedByClient: Record<string, typeof legs> = {};
            legs.forEach(leg => {
                if (!groupedByClient[leg.cliente]) groupedByClient[leg.cliente] = [];
                groupedByClient[leg.cliente].push(leg);
            });

            const pairs: any[] = [];
            Object.keys(groupedByClient).forEach(client => {
                const clientLegs = groupedByClient[client];
                const buys = clientLegs.filter(l => l.lado === 'C' || l.lado === 'COMPRA');
                const sells = clientLegs.filter(l => l.lado === 'V' || l.lado === 'VENDA' || l.lado === 'S');

                // Tentar parear por data
                buys.forEach(b => {
                    const matchIdx = sells.findIndex(s => s.data === b.data);
                    if (matchIdx !== -1) {
                        const s = sells.splice(matchIdx, 1)[0];
                        pairs.push({
                            cliente: client,
                            ativo_long: b.ativo,
                            qtd_long: b.qtd,
                            pm_long: b.pm,
                            ativo_short: s.ativo,
                            qtd_short: s.qtd,
                            pm_short: s.pm,
                            data_inicio: b.data,
                            status: 'Aberta'
                        });
                    } else {
                        // Se não achar par por data, mas for o único client-buy e tiver um client-sell, pareia mesmo assim
                        if (sells.length > 0) {
                            const s = sells.splice(0, 1)[0];
                            pairs.push({
                                cliente: client,
                                ativo_long: b.ativo,
                                qtd_long: b.qtd,
                                pm_long: b.pm,
                                ativo_short: s.ativo,
                                qtd_short: s.qtd,
                                pm_short: s.pm,
                                data_inicio: b.data,
                                status: 'Aberta'
                            });
                        }
                    }
                });
            });

            if (pairs.length === 0) {
                alert("Nenhum par Long & Short válido encontrado. Verifique se a planilha contém compras (C) e vendas (V) para o mesmo cliente.");
                return;
            }

            if (!confirm(`Importar ${pairs.length} operações Long & Short encontradas?`)) return;

            const { error } = await supabase.from('long_short_operations').insert(pairs);
            if (error) throw error;

            alert("Importação concluída com sucesso!");
            fetchOperations();
        } catch (err) {
            console.error('Import error:', err);
            alert("Erro ao importar dados. Verifique o console.");
        } finally {
            setIsImporting(false);
        }
    };

    const calculatedData = useMemo(() => {
        // Step 1: Consolidate by Cliente + Long + Short
        const consolidatedMap: Record<string, any> = {};

        operations.forEach(op => {
            const key = `${op.cliente}_${op.ativo_long}_${op.ativo_short}`;
            if (!consolidatedMap[key]) {
                consolidatedMap[key] = { ...op };
            } else {
                const existing = consolidatedMap[key];
                const newQtdLong = existing.qtd_long + op.qtd_long;
                const newQtdShort = existing.qtd_short + op.qtd_short;

                // Preço médio ponderado
                existing.pm_long = newQtdLong > 0 ? (existing.pm_long * existing.qtd_long + op.pm_long * op.qtd_long) / newQtdLong : 0;
                existing.pm_short = newQtdShort > 0 ? (existing.pm_short * existing.qtd_short + op.pm_short * op.qtd_short) / newQtdShort : 0;

                existing.qtd_long = newQtdLong;
                existing.qtd_short = newQtdShort;
            }
        });

        const data = Object.values(consolidatedMap).map(op => {
            const quoteLong = quotes[op.ativo_long]?.price || 0;
            const quoteShort = quotes[op.ativo_short]?.price || 0;

            const resLong = (quoteLong - op.pm_long) * op.qtd_long;
            const resShort = (op.pm_short - quoteShort) * op.qtd_short;
            const resTotal = resLong + resShort;
            const financialTotal = (op.pm_long * op.qtd_long) + (op.pm_short * op.qtd_short);
            const resPercent = financialTotal > 0 ? (resTotal / financialTotal) * 100 : 0;

            return { ...op, resLong, resShort, resTotal, resPercent, quoteLong, quoteShort };
        });

        let filtered = data.filter(op =>
            op.cliente.toLowerCase().includes(filterClient.toLowerCase())
        );

        if (sortConfig) {
            filtered.sort((a: any, b: any) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [operations, quotes, filterClient, sortConfig]);

    const totals = useMemo(() => {
        return calculatedData.reduce((acc, curr) => ({
            totalRes: acc.totalRes + curr.resTotal,
            totalFinanceiro: acc.totalFinanceiro + ((curr.pm_long * curr.qtd_long) + (curr.pm_short * curr.qtd_short))
        }), { totalRes: 0, totalFinanceiro: 0 });
    }, [calculatedData]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="flex-1 flex flex-col p-10 gap-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Controle L&S</h2>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Monitoramento Estratégico</p>
                        <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{calculatedData.length} Operações Consolidadas</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={filterClient}
                            onChange={(e) => setFilterClient(e.target.value)}
                            className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-[11px] font-black uppercase tracking-widest focus:ring-2 focus:ring-primary/20 outline-none transition-all w-64 shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => fetchQuotes(Array.from(new Set(operations.flatMap(op => [op.ativo_long, op.ativo_short]))))}
                        disabled={syncing}
                        className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border-2 border-slate-100 dark:border-slate-800 transition-all shadow-sm"
                    >
                        <span className={`material-symbols-outlined text-sm ${syncing ? 'animate-spin' : ''}`}>sync</span>
                        Atualizar
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv,.xlsx" />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className="bg-primary text-[#102218] px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">upload_file</span>
                        {isImporting ? 'Importando...' : 'Importar Planilha'}
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/40 dark:bg-card-dark/40 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Resultado Total Bruto</p>
                    <p className={`text-3xl font-black tracking-tighter ${totals.totalRes >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        R$ {totals.totalRes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-white/40 dark:bg-card-dark/40 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Financeiro Alocado</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                        R$ {totals.totalFinanceiro.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-white/40 dark:bg-card-dark/40 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Rentabilidade Média</p>
                    <p className={`text-3xl font-black tracking-tighter ${totals.totalRes >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {totals.totalFinanceiro > 0 ? (totals.totalRes / totals.totalFinanceiro * 100).toFixed(2) : '0.00'}%
                    </p>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white/60 dark:bg-card-dark/60 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort('cliente')}>
                                    <div className="flex items-center gap-2">Cliente {sortConfig?.key === 'cliente' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</div>
                                </th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Par (Long | Short)</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Preço Médio</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cotação Atual</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center text-emerald-500">Res. Long</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center text-red-500">Res. Short</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort('resTotal')}>
                                    <div className="flex items-center justify-center gap-2">Resultado Total {sortConfig?.key === 'resTotal' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</div>
                                </th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort('resPercent')}>
                                    <div className="flex items-center justify-center gap-2">% {sortConfig?.key === 'resPercent' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {calculatedData.map((op, i) => (
                                <tr key={i} className="group hover:bg-white dark:hover:bg-card-dark transition-all duration-300">
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-[12px] font-black text-slate-900 dark:text-white tracking-tight uppercase italic">{op.cliente}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">Início: {op.data_inicio}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-center gap-2 text-[11px] font-black">
                                                <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-lg">{op.ativo_long}</span>
                                                <span className="text-slate-300">/</span>
                                                <span className="bg-red-500/10 text-red-600 px-2 py-0.5 rounded-lg">{op.ativo_short}</span>
                                            </div>
                                            <div className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                                                {op.qtd_long.toLocaleString()} L | {op.qtd_short.toLocaleString()} S
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center text-[11px] font-bold text-slate-500">
                                        R$ {op.pm_long.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        <span className="mx-2 text-slate-300">|</span>
                                        R$ {op.pm_short.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-8 py-6 text-center text-[11px] font-black text-slate-900 dark:text-white">
                                        {op.quoteLong > 0 ? `R$ ${op.quoteLong.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '---'}
                                        <span className="mx-2 text-slate-300">|</span>
                                        {op.quoteShort > 0 ? `R$ ${op.quoteShort.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '---'}
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`text-[11px] font-black ${op.resLong >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            R$ {op.resLong.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`text-[11px] font-black ${op.resShort >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            R$ {op.resShort.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className={`inline-flex px-4 py-1.5 rounded-xl text-[11px] font-black ${op.resTotal >= 0 ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'}`}>
                                            R$ {op.resTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`text-[11px] font-black ${op.resPercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {op.resPercent >= 0 ? '+' : ''}{op.resPercent.toFixed(2)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {calculatedData.length === 0 && (
                    <div className="py-32 flex flex-col items-center justify-center text-slate-400">
                        <div className="h-20 w-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-4xl opacity-20">balance</span>
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-widest italic">Aguardando importação de operações abertas</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LongShortControl;
