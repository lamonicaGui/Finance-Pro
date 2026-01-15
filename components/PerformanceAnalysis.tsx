import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend, Area, AreaChart
} from 'recharts';
import { TradeRecord, Operation, PerformanceSummary } from '../types';
import { supabase } from '../services/supabase';
import { useEffect } from 'react';
import ClientSearch from './ClientSearch';

// Helper to format currency
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Helper to format percentage
const formatPercent = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return '0.00%';
    return `${value.toFixed(2)}%`;
};

// Helpers de normalização ultra-robustos
const normalizeStr = (s: string) =>
    String(s || '').toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9]/g, ""); // Remove tudo que não for letra ou número

const parseNum = (val: any): number => {
    if (typeof val === 'number') return val;
    if (val === undefined || val === null || val === '') return 0;

    let clean = String(val).replace('R$', '').replace(/\s/g, '').trim();

    // Detectar formato brasileiro (1.234,56) vs US (1,234.56)
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

const parseFullDate = (dStr: string) => {
    if (!dStr) return 0;
    try {
        const parts = String(dStr).trim().split(' ');
        const dateParts = parts[0].split('/');
        if (dateParts.length < 3) return 0;

        const day = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1;
        const yr = dateParts[2];
        const year = yr.length === 2 ? parseInt(`20${yr}`) : parseInt(yr);

        const timeParts = parts[1] ? parts[1].split(':') : ['00', '00'];
        const hour = parseInt(timeParts[0] || '0');
        const min = parseInt(timeParts[1] || '0');

        return new Date(year, month, day, hour, min).getTime();
    } catch (e) {
        return 0;
    }
};

const PerformanceAnalysis: React.FC = () => {
    const [operations, setOperations] = useState<Operation[]>([]);
    const [summary, setSummary] = useState<PerformanceSummary | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    // Filter states
    const [clientsList, setClientsList] = useState<string[]>([]);
    const [tickersList, setTickersList] = useState<string[]>([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedTicker, setSelectedTicker] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Load initial clients list
    useEffect(() => {
        const loadClients = async () => {
            const { data: clientsData } = await supabase
                .from('executed_orders')
                .select('cliente')
                .not('cliente', 'is', null);

            if (clientsData) {
                const uniqueClients = Array.from(new Set(clientsData.map(c => c.cliente))).sort();
                setClientsList(uniqueClients);
            }
        };
        loadClients();
    }, []);

    // Load tickers list dynamically based on selected client
    useEffect(() => {
        const loadTickers = async () => {
            let sbQuery = supabase
                .from('executed_orders')
                .select('papel')
                .not('papel', 'is', null);

            if (selectedClient) {
                // Filter tickers only for this client
                sbQuery = sbQuery.ilike('cliente', `%${selectedClient.trim()}%`);
            }

            const { data: tickersData } = await sbQuery;

            if (tickersData) {
                const uniqueTickers = Array.from(new Set(tickersData.map(t => t.papel))).sort();
                setTickersList(uniqueTickers);

                // If current selected ticker is not in the new list, reset it
                if (selectedTicker && !uniqueTickers.includes(selectedTicker)) {
                    setSelectedTicker('');
                }
            }
        };
        loadTickers();
    }, [selectedClient]);

    const fetchDataFromSupabase = async () => {
        setIsProcessing(true);
        try {
            let query = supabase.from('executed_orders').select('*');

            if (selectedClient) {
                // Use ilike for robustness against spaces or case
                query = query.ilike('cliente', `%${selectedClient.trim()}%`);
            }
            if (selectedTicker) {
                query = query.eq('papel', selectedTicker);
            }
            if (startDate) {
                query = query.gte('data', startDate);
            }
            if (endDate) {
                query = query.lte('data', endDate);
            }

            const { data, error } = await query;
            console.log(`[PerformanceAnalysis] Filters:`, { selectedClient, selectedTicker, startDate, endDate });
            console.log(`[PerformanceAnalysis] Success: ${data?.length || 0} items fetched`);

            if (error) {
                console.error("Error fetching data:", error);
                alert(`Erro ao buscar dados: ${error.message}`);
                return;
            }

            if (!data || data.length === 0) {
                alert(`Nenhuma ordem encontrada. 
                \nFiltros: ${selectedClient || 'Todos'} 
                \nPeriodo: ${startDate || '?'} a ${endDate || '?'}
                \n(Dica: Verifique se o nome está correto e o período abrange o ano de 2025)`);
                setOperations([]);
                setSummary(null);
                return;
            }

            // Map DB columns to TradeRecord logic
            // The DB has "Data", "Papel", "C/V", "Qtd. Exec.", "Prc. Médio", "Data / Hora", "Volume", etc.
            processRawData(data);
        } catch (err) {
            console.error("Supabase fetch error:", err);
            alert("Erro inesperado ao buscar dados.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        const reader = new FileReader();

        if (file.name.endsWith('.csv')) {
            reader.onload = (event) => {
                const arrayBuffer = event.target?.result as ArrayBuffer;

                // Tenta UTF-8 primeiro
                const utf8Decoder = new TextDecoder('utf-8');
                let text = utf8Decoder.decode(new Uint8Array(arrayBuffer));

                // Se houver caracteres "estranhos" (como o diamante com interrogação), tenta latin1
                if (text.includes('') || !text.includes(';')) {
                    const latin1Decoder = new TextDecoder('iso-8859-1');
                    text = latin1Decoder.decode(new Uint8Array(arrayBuffer));
                }

                console.log("CSV text preview:", text.substring(0, 200));

                Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    dynamicTyping: false,
                    // Deixa o PapaParse detectar o delimitador, mas podemos forçar se necessário
                    complete: (results) => {
                        console.log("PapaParse results:", results.data.length, "rows", results.meta);
                        if (results.data.length === 0) {
                            alert("O arquivo parece estar vazio ou o formato não foi reconhecido.");
                            setIsProcessing(false);
                        } else {
                            processRawData(results.data);
                        }
                    },
                    error: (err) => {
                        console.error("PapaParse error:", err);
                        alert("Erro ao ler o arquivo CSV.");
                        setIsProcessing(false);
                    }
                });
            };
            reader.readAsArrayBuffer(file);
        } else {
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    console.log("XLSX results:", jsonData.length, "rows");
                    processRawData(jsonData);
                } catch (err) {
                    console.error("XLSX error:", err);
                    alert("Erro ao ler o arquivo Excel.");
                    setIsProcessing(false);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const processRawData = (data: any[]) => {
        setIsProcessing(true);
        console.log("Iniciando processamento de dados:", data.length, "linhas");

        try {
            // 2. Normalização com mapeamento de colunas ultra-robusto
            const normalizedData: TradeRecord[] = data.map((item, idx) => {
                const itemKeys = Object.keys(item);
                if (idx === 0) console.log("Primeira linha de dados brutos:", item);
                const getRaw = (aliases: string[]) => {
                    const normalizedAliases = aliases.map(a => normalizeStr(a));

                    // Prioridade 1: Match exato (normalizado)
                    const exactKey = itemKeys.find(ik => normalizedAliases.includes(normalizeStr(ik)));
                    if (exactKey !== undefined) return item[exactKey];

                    // Prioridade 2: Match parcial (se a chave contém ou é contida pelo alias)
                    const softKey = itemKeys.find(ik => {
                        const nik = normalizeStr(ik);
                        return normalizedAliases.some(alias => {
                            if (alias.length < 3) return false;
                            return nik.includes(alias) || alias.includes(nik);
                        });
                    });
                    return softKey !== undefined ? item[softKey] : undefined;
                };

                const rawData = getRaw(['data', 'Data', 'Data Operação', 'Data Operacao', 'Date', 'Trade Date']);
                const rawPapel = getRaw(['papel', 'Papel', 'Ativo', 'Ticker', 'Symbol', 'Ativos', 'Ação', 'Acao']);
                const rawCV = getRaw(['cv', 'C/V', 'CV', 'C', 'V', 'Operação', 'Operacao', 'Lado', 'Side', 'Tipo', 'Compra/Venda']);
                const rawQtd = getRaw(['qtd_exec', 'Qtd. Exec.', 'Qtd. Exe', 'Quantidade Executada', 'Quantidade', 'Qtd', 'Qtde', 'Quantity', 'Volume Qtd']);
                const rawPreco = getRaw(['prc_medio', 'Prc. Médio', 'Prc. Méd', 'Preço Médio', 'Preço', 'Preco', 'Pm', 'Price', 'Avg Price']);
                const rawStatus = getRaw(['status', 'Status', 'Status da Ordem', 'Order Status']);
                const rawDataHora = getRaw(['data_hora', 'Data / Hora', 'Data/Hora', 'Timestamp', 'Date Time']);
                const rawVolume = getRaw(['volume', 'Volume', 'Volume Financeiro', 'Financeiro', 'Total']);
                const rawConta = getRaw(['conta', 'Conta', 'Account', 'Cta']);

                return {
                    data: String(rawData || ''),
                    codBolsa: String(getRaw(['cod_bolsa', 'Cod Bolsa', 'Código da Bolsa', 'CodBolsa']) || ''),
                    cliente: String(getRaw(['cliente', 'Cliente', 'Client', 'Nome']) || 'Desconhecido'),
                    papel: String(rawPapel || ''),
                    cv: (String(rawCV).toUpperCase().startsWith('V') || normalizeStr(String(rawCV)) === 'venda' || normalizeStr(String(rawCV)) === 'sell') ? 'V' : 'C',
                    quantidade: Math.abs(parseNum(rawQtd)),
                    precoMedio: parseNum(rawPreco),
                    status: String(rawStatus || ''),
                    dataHora: String(rawDataHora || rawData || ''),
                    volume: parseNum(rawVolume),
                    liquidacao: String(getRaw(['Liquidação', 'Data de Liquidação']) || ''),
                    assessor: String(getRaw(['Assessor', 'Broker']) || ''),
                    especialista: String(getRaw(['Especialista']) || ''),
                    conta: String(rawConta || 'N/A')
                } as TradeRecord;
            }).filter(item => {
                const p = normalizeStr(item.papel);
                if (!p || p === 'papel' || p === 'ativo' || p === 'symbol') return false;
                if (item.quantidade <= 0) return false;

                const s = normalizeStr(item.status);
                return s === 'executada' || s === 'executed' || !item.status || s === '' || s === 'undefined';
            });

            console.log("Dados normalizados:", normalizedData.length, "registros válidos");

            // 4. Group by Account + Ticker
            const groups: { [key: string]: TradeRecord[] } = {};
            normalizedData.forEach(record => {
                const key = `${record.conta}-${record.papel}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(record);
            });

            const allOperations: Operation[] = [];

            // 5. FIFO Logic
            Object.keys(groups).forEach(key => {
                const records = groups[key].sort((a, b) => parseFullDate(a.dataHora) - parseFullDate(b.dataHora));
                const buys: { qty: number, price: number, date: string, dataHora: string }[] = [];
                const sells: { qty: number, price: number, date: string, dataHora: string }[] = [];

                records.forEach(r => {
                    const qty = r.quantidade;
                    const price = r.precoMedio;
                    const date = r.data;
                    const dataHora = r.dataHora;

                    if (r.cv === 'C') {
                        let remainingQty = qty;
                        while (remainingQty > 0 && sells.length > 0) {
                            const sell = sells[0];
                            const matchQty = Math.min(remainingQty, sell.qty);
                            const resultBrRL = (sell.price - price) * matchQty;
                            const resultPercent = price === 0 ? 0 : ((sell.price / price) - 1) * 100;

                            allOperations.push({
                                id: Math.random().toString(36).substr(2, 9),
                                ticker: r.papel,
                                cliente: r.cliente,
                                conta: r.conta,
                                entryDate: sell.date,
                                exitDate: date,
                                entryPrice: sell.price,
                                exitPrice: price,
                                quantity: matchQty,
                                volume: (matchQty * sell.price) + (matchQty * price),
                                resultBrRL,
                                resultPercent,
                                durationDays: Math.max(0, Math.ceil(Math.abs(parseFullDate(dataHora) - parseFullDate(sell.dataHora)) / (1000 * 60 * 60 * 24))),
                                side: 'Short'
                            });

                            remainingQty -= matchQty;
                            sell.qty -= matchQty;
                            if (sell.qty <= 0) sells.shift();
                        }
                        if (remainingQty > 0) buys.push({ qty: remainingQty, price, date, dataHora });
                    } else {
                        let remainingQty = qty;
                        while (remainingQty > 0 && buys.length > 0) {
                            const buy = buys[0];
                            const matchQty = Math.min(remainingQty, buy.qty);
                            const resultBrRL = (price - buy.price) * matchQty;
                            const resultPercent = buy.price === 0 ? 0 : ((price / buy.price) - 1) * 100;

                            allOperations.push({
                                id: Math.random().toString(36).substr(2, 9),
                                ticker: r.papel,
                                cliente: r.cliente,
                                conta: r.conta,
                                entryDate: buy.date,
                                exitDate: date,
                                entryPrice: buy.price,
                                exitPrice: price,
                                quantity: matchQty,
                                volume: (matchQty * buy.price) + (matchQty * price),
                                resultBrRL,
                                resultPercent,
                                durationDays: Math.max(0, Math.ceil(Math.abs(parseFullDate(dataHora) - parseFullDate(buy.dataHora)) / (1000 * 60 * 60 * 24))),
                                side: 'Long'
                            });

                            remainingQty -= matchQty;
                            buy.qty -= matchQty;
                            if (buy.qty <= 0) buys.shift();
                        }
                        if (remainingQty > 0) sells.push({ qty: remainingQty, price, date, dataHora });
                    }
                });
            });

            const sortedOps = allOperations.sort((a, b) => parseFullDate(a.exitDate) - parseFullDate(b.exitDate));
            setOperations(sortedOps);

            // 7. Calculate Summary KPIs
            if (sortedOps.length > 0) {
                const totalResult = sortedOps.reduce((sum, op) => sum + op.resultBrRL, 0);
                const totalVolume = sortedOps.reduce((sum, op) => sum + op.volume, 0);
                const winRate = (sortedOps.filter(op => op.resultBrRL > 0).length / sortedOps.length) * 100;
                const avgReturn = sortedOps.reduce((sum, op) => sum + op.resultPercent, 0) / sortedOps.length;

                // Weighted Return: sum(resultPercent * volume) / sum(volume)
                const weightedAvg = totalVolume === 0 ? 0 : sortedOps.reduce((sum, op) => sum + (op.resultPercent * op.volume), 0) / totalVolume;

                // Drawdown Calculation
                let maxEquity = 0;
                let currentEquity = 0;
                let maxDD = 0;

                sortedOps.forEach(op => {
                    currentEquity += op.resultBrRL;
                    if (currentEquity > maxEquity) maxEquity = currentEquity;

                    // Drawdown = (Current Equity - Peak) / Peak (only if peak > 0)
                    // Simplification: if equity is below its all-time high
                    if (maxEquity > 0) {
                        const dd = (maxEquity - currentEquity) / maxEquity;
                        if (dd > maxDD) maxDD = dd;
                    }
                });

                setSummary({
                    totalResultBrRL: totalResult,
                    averageReturnPercent: avgReturn,
                    weightedAverageReturnPercent: weightedAvg,
                    totalOperations: sortedOps.length,
                    winRate,
                    totalVolume,
                    drawdown: maxDD * 100
                });
            } else {
                setSummary(null);
            }

        } catch (error) {
            console.error('Error processing data:', error);
            alert('Erro ao processar a planilha. Verifique a estrutura do arquivo.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExportPDF = () => {
        if (!reportRef.current) return;
        const element = reportRef.current;

        // @ts-ignore
        const opt = {
            margin: 10,
            filename: 'Relatorio_Performance.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        // @ts-ignore
        html2pdf().set(opt).from(element).save();
    };

    // 5. Preparação Robusta dos Dados do Gráfico
    const equityCurveData = operations.length > 0 ? (() => {
        // Agrupar por data para ter um ponto por dia e evitar labels repetitivas
        const dailyBalances: { [key: string]: number } = {};
        let currentBalance = 0;

        operations.forEach(op => {
            currentBalance += op.resultBrRL;
            dailyBalances[op.exitDate] = currentBalance;
        });

        const data = Object.keys(dailyBalances).map(date => ({
            name: date,
            balance: dailyBalances[date],
            timestamp: parseFullDate(date)
        })).sort((a, b) => a.timestamp - b.timestamp);

        // Adicionar ponto inicial zero se não houver
        if (data.length > 0) {
            return [{ name: 'Início', balance: 0, timestamp: data[0].timestamp - (1000 * 60 * 60 * 24) }, ...data];
        }
        return data;
    })() : [];

    const distData = [
        { name: 'Ganhos', value: operations.filter(op => op.resultBrRL > 0).length, color: '#10b981' },
        { name: 'Perdas', value: operations.filter(op => op.resultBrRL <= 0).length, color: '#ef4444' }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 -mt-10">
            {/* Filter & Source Header */}
            <div className="bg-white dark:bg-card-dark rounded-[3rem] p-10 shadow-2xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-primary/10 transition-all duration-700"></div>

                <div className="relative z-10 flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="h-16 w-16 rounded-[1.5rem] bg-slate-900 border border-slate-800 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                                <span className="material-symbols-outlined text-3xl">analytics</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight italic">Análise Consolidada</h2>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Filtre dados do banco ou importe uma nova planilha.</p>
                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9px] font-black text-slate-400 uppercase tracking-widest">Source: executed_orders</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isProcessing}
                                className="h-12 px-6 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2 border border-slate-100 dark:border-slate-700"
                                title="Importar arquivo manual"
                            >
                                <span className="material-symbols-outlined text-lg">upload_file</span>
                                Importar CSV
                            </button>
                        </div>
                    </div>

                    {/* Filters Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/50 dark:bg-slate-900/30 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cliente</label>
                            <ClientSearch
                                placeholder="Nome, Conta ou Bolsa..."
                                onSelect={(master) => setSelectedClient(master.Cliente)}
                                onQueryChange={setSelectedClient}
                                initialValue={selectedClient}
                                showHeaderStyle
                                className="w-full"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Ativo (Papel)</label>
                            <select
                                value={selectedTicker}
                                onChange={(e) => setSelectedTicker(e.target.value)}
                                className="w-full h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Todos os Ativos</option>
                                {tickersList.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Data Inicial</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Data Final</label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="flex-1 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                                <button
                                    onClick={fetchDataFromSupabase}
                                    disabled={isProcessing}
                                    className="h-12 px-6 rounded-xl bg-primary text-white font-black uppercase text-xs tracking-wider shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
                                >
                                    {isProcessing ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : 'Filtrar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Empty State */}
            {operations.length === 0 && !isProcessing && (
                <div className="bg-white dark:bg-card-dark rounded-[3rem] p-24 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center group transition-all">
                    <div className="h-32 w-32 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-200 dark:text-slate-700 mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                        <span className="material-symbols-outlined text-6xl">query_stats</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase mb-4 tracking-tight italic">Sua análise aparecerá aqui</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md font-medium leading-relaxed">Selecione filtros acima ou faça upload de um arquivo para visualizar métricas, rentabilidade e estatísticas.</p>

                    {(selectedClient || selectedTicker || startDate || endDate) && (
                        <button
                            onClick={() => {
                                setSelectedClient('');
                                setSelectedTicker('');
                                setStartDate('');
                                setEndDate('');
                            }}
                            className="mt-8 text-[10px] font-black text-primary uppercase tracking-[0.2em] hover:underline"
                        >
                            Limpar filtros selecionados
                        </button>
                    )}
                </div>
            )}

            {/* Performance Report */}
            {operations.length > 0 && summary && (
                <div ref={reportRef} className="space-y-8 pb-10">
                    {/* Header Actions */}
                    <div className="flex justify-between items-center bg-white dark:bg-card-dark rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none mb-4">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">Métricas de Performance</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{summary.totalOperations} Operações Identificadas</p>
                        </div>
                        <button
                            onClick={handleExportPDF}
                            className="px-8 py-4 rounded-xl bg-slate-900 dark:bg-primary text-primary dark:text-white font-black uppercase text-[10px] tracking-[0.2em] hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-2xl shadow-primary/20"
                        >
                            <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                            Exportar Relatório
                        </button>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: 'Resultado Total', value: formatCurrency(summary.totalResultBrRL), subLabel: `Volume: ${formatCurrency(summary.totalVolume)}`, icon: 'payments', pos: summary.totalResultBrRL >= 0 },
                            { label: 'Rentabilidade (Ponderada)', value: formatPercent(summary.weightedAverageReturnPercent), subLabel: `Média Simples: ${formatPercent(summary.averageReturnPercent)}`, icon: 'query_stats', pos: summary.weightedAverageReturnPercent >= 0 },
                            { label: 'Taxa de Acerto', value: formatPercent(summary.winRate), subLabel: `${operations.filter(op => op.resultBrRL > 0).length} de ${summary.totalOperations} trades`, icon: 'done_all' },
                            { label: 'Max Drawdown', value: formatPercent(summary.drawdown || 0), subLabel: 'Risco da Estratégia', icon: 'trending_down', neg: true }
                        ].map((kpi, i) => (
                            <div key={i} className="bg-white dark:bg-card-dark rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{kpi.label}</p>
                                <h3 className={`text-2xl font-black ${kpi.pos ? 'text-emerald-600' : kpi.neg ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
                                    {kpi.value}
                                </h3>
                                <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                    <span className="material-symbols-outlined text-xs">{kpi.icon}</span>
                                    {kpi.subLabel}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white dark:bg-card-dark rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-8">Evolução do Patrimônio (R$)</h4>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={equityCurveData}>
                                        <defs>
                                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                            tickFormatter={(val) => `R$ ${Math.abs(val) >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'white', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                            labelStyle={{ fontWeight: 900, fontSize: '12px', marginBottom: '8px' }}
                                            formatter={(value: number) => [formatCurrency(value), 'Resultado Acumulado']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="balance"
                                            stroke="#10b981"
                                            strokeWidth={4}
                                            fillOpacity={1}
                                            fill="url(#colorBalance)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-card-dark rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col">
                            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-8">Distribuição de Resultados</h4>
                            <div className="flex-1 flex items-center justify-center">
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={distData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={8}
                                                dataKey="value"
                                            >
                                                {distData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'white', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.1em' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Table */}
                    <div className="bg-white dark:bg-card-dark rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                            <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Detalhamento por Operação</h4>
                            <span className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-full text-[10px] font-black text-slate-500 uppercase">
                                {operations.length} Items
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-50 dark:border-slate-800">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Ativo</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Entrada / Saída</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Preços</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Quantidade</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Resultado (R$)</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Resultado (%)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {operations.map((op) => (
                                        <tr key={op.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-800 dark:text-white uppercase leading-tight">{op.ticker}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter truncate max-w-[200px]">{op.cliente} ({op.conta})</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">IN: {op.entryDate}</span>
                                                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">OUT: {op.exitDate}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Compra: {formatCurrency(op.entryPrice)}</span>
                                                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tighter">Venda: {formatCurrency(op.exitPrice)}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">{op.quantity}</span>
                                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{op.side}</p>
                                            </td>
                                            <td className={`px-8 py-5 text-right font-black text-sm ${op.resultBrRL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {formatCurrency(op.resultBrRL)}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black ${op.resultPercent >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-red-50 dark:bg-red-500/10 text-red-500'}`}>
                                                    {op.resultPercent >= 0 ? '+' : ''}{formatPercent(op.resultPercent)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerformanceAnalysis;
