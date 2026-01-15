import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { TradeRecord, Operation, PerformanceSummary } from '../types';

// Helper to format currency
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

// Helper to format percentage
const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
};

const PerformanceAnalysis: React.FC = () => {
    const [operations, setOperations] = useState<Operation[]>([]);
    const [summary, setSummary] = useState<PerformanceSummary | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        const reader = new FileReader();

        if (file.name.endsWith('.csv')) {
            reader.onload = (event) => {
                const text = event.target?.result as string;
                Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        processRawData(results.data);
                    }
                });
            };
            reader.readAsText(file);
        } else {
            reader.onload = (event) => {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                processRawData(jsonData);
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const processRawData = (data: any[]) => {
        console.log("Iniciando processamento de dados:", data.length, "linhas");
        try {
            // Normalize data
            const normalizedData: TradeRecord[] = data.map((item) => {
                const getRaw = (keys: string[]) => {
                    for (const k of keys) {
                        if (item[k] !== undefined && item[k] !== null) return item[k];
                    }
                    return undefined;
                };

                const parseNum = (val: any) => {
                    if (typeof val === 'number') return val;
                    if (!val) return 0;
                    const clean = String(val).replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
                    const parsed = parseFloat(clean);
                    return isNaN(parsed) ? 0 : parsed;
                };

                const rawData = getRaw(['Data']);
                const rawPapel = getRaw(['Papel', 'Ativo']);
                const rawCV = getRaw(['C/V', 'CV', 'Operacao']);
                const rawQtd = getRaw(['Qtd. Exec.', 'Quantidade Executada', 'Quantidade']);
                const rawPreco = getRaw(['Prc. Médio', 'Preço Médio', 'Preco']);
                const rawStatus = getRaw(['Status', 'Status da Ordem']);
                const rawDataHora = getRaw(['Data / Hora', 'Data/Hora']);
                const rawVolume = getRaw(['Volume', 'Volume Financeiro']);
                const rawConta = getRaw(['Conta']);

                return {
                    data: String(rawData || ''),
                    codBolsa: String(getRaw(['Cod Bolsa', 'Código da Bolsa', 'CodBolsa']) || ''),
                    cliente: String(getRaw(['Cliente']) || ''),
                    papel: String(rawPapel || ''),
                    cv: (String(rawCV).startsWith('V') || rawCV === 'Venda') ? 'V' : 'C',
                    quantidade: parseNum(rawQtd),
                    precoMedio: parseNum(rawPreco),
                    status: String(rawStatus || ''),
                    dataHora: String(rawDataHora || rawData || ''),
                    volume: parseNum(rawVolume),
                    liquidacao: String(getRaw(['Liquidação', 'Data de Liquidação']) || ''),
                    assessor: String(getRaw(['Assessor']) || ''),
                    especialista: String(getRaw(['Especialista']) || ''),
                    conta: String(rawConta || '')
                } as TradeRecord;
            }).filter(item => {
                if (!item.papel || item.papel === 'Papel' || item.papel === 'Ativo') return false;
                return item.status === 'Executada' || !item.status || item.status === 'undefined' || item.status === '';
            });

            console.log("Dados normalizados:", normalizedData.length, "registros válidos");

            const parseFullDate = (dStr: string) => {
                if (!dStr) return 0;
                try {
                    const parts = dStr.split(' ');
                    const dateParts = parts[0].split('/');
                    if (dateParts.length < 3) return 0;

                    const timeParts = parts[1] ? parts[1].split(':') : ['00', '00'];
                    const d = new Date(
                        parseInt(dateParts[2]),
                        parseInt(dateParts[1]) - 1,
                        parseInt(dateParts[0]),
                        parseInt(timeParts[0] || '0'),
                        parseInt(timeParts[1] || '0')
                    );
                    return d.getTime();
                } catch (e) {
                    return 0;
                }
            };

            // Group by Client + Account + Ticker
            const groups: { [key: string]: TradeRecord[] } = {};
            normalizedData.forEach(record => {
                const key = `${record.conta}-${record.papel}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(record);
            });

            const allOperations: Operation[] = [];

            // FIFO Logic for each group
            Object.keys(groups).forEach(key => {
                const records = groups[key].sort((a, b) => parseFullDate(a.dataHora) - parseFullDate(b.dataHora));

                const buys: { qty: number, price: number, date: string, dataHora: string }[] = [];
                const sells: { qty: number, price: number, date: string, dataHora: string }[] = [];

                records.forEach(r => {
                    const qty = r.quantidade;
                    const price = r.precoMedio;
                    const date = r.data;
                    const dataHora = r.dataHora;

                    if (qty <= 0) return;

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
                                exitDate: r.data,
                                entryPrice: sell.price,
                                exitPrice: price,
                                quantity: matchQty,
                                volume: matchQty * sell.price,
                                resultBrRL,
                                resultPercent,
                                durationDays: Math.max(0, Math.ceil(Math.abs(parseFullDate(r.dataHora) - parseFullDate(sell.dataHora)) / (1000 * 60 * 60 * 24))),
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
                                exitDate: r.data,
                                entryPrice: buy.price,
                                exitPrice: price,
                                quantity: matchQty,
                                volume: matchQty * buy.price,
                                resultBrRL,
                                resultPercent,
                                durationDays: Math.max(0, Math.ceil(Math.abs(parseFullDate(r.dataHora) - parseFullDate(buy.dataHora)) / (1000 * 60 * 60 * 24))),
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

            setOperations(allOperations);

            // Calculate Summary
            if (allOperations.length > 0) {
                const totalResult = allOperations.reduce((sum, op) => sum + op.resultBrRL, 0);
                const totalVolume = allOperations.reduce((sum, op) => sum + op.volume, 0);
                const winRate = (allOperations.filter(op => op.resultBrRL > 0).length / allOperations.length) * 100;
                const avgReturn = allOperations.reduce((sum, op) => sum + op.resultPercent, 0) / allOperations.length;

                // Weighted Average
                const weightedAvg = allOperations.reduce((sum, op) => sum + (op.resultPercent * op.volume), 0) / totalVolume;

                // Drawdown
                let maxBalance = 0;
                let maxDD = 0;
                let currentBalance = 0;
                allOperations.forEach(op => {
                    currentBalance += op.resultBrRL;
                    if (currentBalance > maxBalance) maxBalance = currentBalance;
                    const dd = maxBalance <= 0 ? 0 : (maxBalance - currentBalance) / maxBalance;
                    if (dd > maxDD) maxDD = dd;
                });

                setSummary({
                    totalResultBrRL: totalResult,
                    averageReturnPercent: avgReturn,
                    weightedAverageReturnPercent: weightedAvg,
                    totalOperations: allOperations.length,
                    winRate,
                    totalVolume,
                    drawdown: maxDD * 100
                });
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

    // Chart Data Preparation
    const equityCurveData = operations.reduce((acc: any[], op, index) => {
        const prevBalance = index === 0 ? 0 : acc[index - 1].balance;
        acc.push({
            name: op.exitDate,
            balance: prevBalance + op.resultBrRL
        });
        return acc;
    }, []);

    const distData = [
        { name: 'Ganhos', value: operations.filter(op => op.resultBrRL > 0).length, color: '#10b981' },
        { name: 'Perdas', value: operations.filter(op => op.resultBrRL <= 0).length, color: '#ef4444' }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Upload Header */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-4xl">upload_file</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Importar Operações</h2>
                        <p className="text-sm text-slate-500 font-medium">Selecione uma planilha (XLSX ou CSV) para iniciar a análise.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
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
                        className="px-8 py-3 rounded-xl bg-secondary text-primary font-black uppercase text-xs tracking-wider hover:brightness-125 transition-all flex items-center gap-2"
                    >
                        {isProcessing ? (
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        ) : (
                            <span className="material-symbols-outlined">add_circle</span>
                        )}
                        Selecionar Arquivo
                    </button>

                    {operations.length > 0 && (
                        <button
                            onClick={handleExportPDF}
                            className="px-8 py-3 rounded-xl bg-primary text-secondary font-black uppercase text-xs tracking-wider hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                        >
                            <span className="material-symbols-outlined">picture_as_pdf</span>
                            Exportar PDF
                        </button>
                    )}
                </div>
            </div>

            {operations.length > 0 && summary && (
                <div ref={reportRef} className="space-y-8 pb-10">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resultado Total</p>
                            <h3 className={`text-2xl font-black ${summary.totalResultBrRL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {formatCurrency(summary.totalResultBrRL)}
                            </h3>
                            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                <span className="material-symbols-outlined text-xs">payments</span>
                                Volume: {formatCurrency(summary.totalVolume)}
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rentabilidade (Ponderada)</p>
                            <h3 className={`text-2xl font-black ${summary.weightedAverageReturnPercent >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {formatPercent(summary.weightedAverageReturnPercent)}
                            </h3>
                            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                <span className="material-symbols-outlined text-xs">query_stats</span>
                                Média Simples: {formatPercent(summary.averageReturnPercent)}
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Taxa de Acerto</p>
                            <h3 className="text-2xl font-black text-slate-800">
                                {formatPercent(summary.winRate)}
                            </h3>
                            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                <span className="material-symbols-outlined text-xs">done_all</span>
                                {operations.filter(op => op.resultBrRL > 0).length} de {summary.totalOperations} Trades
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Max Drawdown</p>
                            <h3 className="text-2xl font-black text-red-500">
                                {formatPercent(summary.drawdown || 0)}
                            </h3>
                            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                <span className="material-symbols-outlined text-xs">trending_down</span>
                                Risco da Estratégia
                            </div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Evolução do Patrimônio (R$)</h4>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={equityCurveData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
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
                                            tickFormatter={(val) => `R$ ${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: number) => [formatCurrency(value), 'Resultado Acumulado']}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="balance"
                                            stroke="#10b981"
                                            strokeWidth={3}
                                            dot={false}
                                            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Distribuição de Resultados</h4>
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
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {distData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Table */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Detalhamento por Operação</h4>
                            <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase">
                                {operations.length} Items
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ativo</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrada / Saída</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Preços</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Quantidade</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Resultado (R$)</th>
                                        <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Resultado (%)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {operations.map((op) => (
                                        <tr key={op.id} className="hover:bg-slate-50/30 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-800">{op.ticker}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{op.cliente} ({op.conta})</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-slate-600">IN: {op.entryDate}</span>
                                                    <span className="text-[11px] font-bold text-slate-600">OUT: {op.exitDate}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-slate-600">Compra: {formatCurrency(op.entryPrice)}</span>
                                                    <span className="text-[11px] font-bold text-slate-600">Venda: {formatCurrency(op.exitPrice)}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="text-[11px] font-black text-slate-700">{op.quantity}</span>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{op.side}</p>
                                            </td>
                                            <td className={`px-8 py-5 text-right font-black text-sm ${op.resultBrRL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {formatCurrency(op.resultBrRL)}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black ${op.resultPercent >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
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

            {!operations.length && !isProcessing && (
                <div className="bg-white rounded-3xl p-16 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="h-24 w-24 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-5xl text-slate-300">analytics</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 uppercase mb-2">Sua análise aparecerá aqui</h3>
                    <p className="text-slate-400 max-w-md font-medium">Faça o upload de uma planilha de operações para visualizar métricas de performance, rentabilidade e estatísticas detalhadas.</p>
                </div>
            )}
        </div>
    );
};

export default PerformanceAnalysis;
