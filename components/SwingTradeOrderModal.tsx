import React, { useState, useEffect } from 'react';
import { SwingTradeAsset } from '../types.ts';
import ClientSearch from './ClientSearch.tsx';
import { copyAndOpenOutlook, generateOrderEmailHtml, generateOrderEmailSubject, generateOrderEmailPlainText } from '../utils/emailGenerator.ts';

interface SwingTradeOrderModalProps {
    assets: SwingTradeAsset[];
    mode?: 'entry' | 'exchange';
    userEmail?: string;
    onClose: () => void;
    onConfirm: (ordersData: any[]) => void;
}

interface OrderLineState {
    id: string;
    ticker: string;
    type: 'Compra' | 'Venda' | 'L&S';
    price: number; // For internal calculations
    basis: 'Quantidade' | 'Financeiro';
    quantity: string;
    financial: string;
    target: string;
    stop: string;
}

interface SelectedClient {
    id: string; // Cod Bols
    nome: string;
    conta: string;
    email?: string;
    cc?: string;
    orders: OrderLineState[];
    exitLines: OrderLineState[];
}

const formatFinanceiro = (val: string | number) => {
    if (val === '' || val === undefined || val === null || val === 0) return '';
    const num = typeof val === 'string' ? parseFloat(val.replace(/\./g, '').replace(',', '.')) : val;
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

const formatLivePTBR = (val: string) => {
    // Remove previous dots
    let clean = val.replace(/\./g, '');
    // Allow only digits and one comma
    clean = clean.replace(/[^\d,]/g, '');
    const parts = clean.split(',');
    if (parts.length > 2) parts.splice(2); // Keep only first comma

    // Format thousand separators
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.join(',');
};

const parsePTBR = (val: string) => {
    return val.replace(/\./g, '').replace(',', '.');
};

const SwingTradeOrderModal: React.FC<SwingTradeOrderModalProps> = ({ assets, mode = 'entry', userEmail, onClose, onConfirm }) => {
    const [step, setStep] = useState<'clients' | 'config' | 'dispatch'>('clients');
    const [orderLines, setOrderLines] = useState<OrderLineState[]>([]);
    const [exitLines, setExitLines] = useState<OrderLineState[]>([]);
    const [selectedClients, setSelectedClients] = useState<SelectedClient[]>([]);

    useEffect(() => {
        setOrderLines(assets.map(asset => ({
            id: asset.id,
            ticker: asset.ticker,
            type: asset.type as any,
            price: asset.currentPrice || asset.entryPrice,
            basis: 'Quantidade' as const,
            quantity: '',
            financial: '',
            target: asset.targetPrice?.toString().replace('.', ',') || '',
            stop: asset.stopPrice?.toString().replace('.', ',') || ''
        })));
    }, [assets]);

    const updateLine = (id: string, updates: Partial<OrderLineState>, isExit: boolean = false) => {
        const setter = isExit ? setExitLines : setOrderLines;
        setter(prev => prev.map(line => {
            if (line.id !== id) return line;
            return { ...line, ...updates };
        }));

        // Propagate global changes (Ticker, Target, Stop, Price) to all existing clients
        setSelectedClients(prev => prev.map(client => {
            const field = isExit ? 'exitLines' : 'orders';
            const updatedLines = client[field as 'orders' | 'exitLines'].map(line => {
                if (line.id !== id) return line;

                const updated = { ...line, ...updates };

                // Recalculate calculations if price changed (unlikely in entry but possible in exit)
                if (updates.price !== undefined) {
                    if (updated.basis === 'Quantidade' && updated.quantity !== '') {
                        updated.financial = formatFinanceiro((parseFloat(updated.quantity) || 0) * updated.price);
                    } else if (updated.basis === 'Financeiro' && updated.financial !== '') {
                        const f = parseFloat(parsePTBR(updated.financial)) || 0;
                        const isBDR = updated.ticker.endsWith('31') || updated.ticker.endsWith('32') || updated.ticker.endsWith('33');
                        if (updated.price > 0) {
                            if (isBDR) updated.quantity = Math.floor(f / updated.price).toString();
                            else updated.quantity = (Math.floor((f / updated.price) / 100) * 100).toString();
                        }
                    }
                }
                return updated;
            });

            return { ...client, [field]: updatedLines };
        }));
    };

    const updateClientLine = (clientId: string, lineId: string, updates: Partial<OrderLineState>, isExit: boolean = false) => {
        setSelectedClients(prev => prev.map(client => {
            if (client.id !== clientId) return client;

            const field = isExit ? 'exitLines' : 'orders';
            const updatedLines = client[field as 'orders' | 'exitLines'].map(line => {
                if (line.id !== lineId) return line;

                const newUpdates = { ...updates };
                if (updates.quantity !== undefined) newUpdates.basis = 'Quantidade' as const;
                else if (updates.financial !== undefined) newUpdates.basis = 'Financeiro' as const;

                const updated = { ...line, ...newUpdates };
                const isBDR = line.ticker.endsWith('31') || line.ticker.endsWith('32') || line.ticker.endsWith('33');

                if (newUpdates.quantity !== undefined && updated.basis === 'Quantidade') {
                    if (newUpdates.quantity === '') updated.financial = '';
                    else updated.financial = formatFinanceiro((parseFloat(newUpdates.quantity) || 0) * updated.price);
                }

                if (newUpdates.financial !== undefined && updated.basis === 'Financeiro') {
                    const fRaw = parsePTBR(newUpdates.financial);
                    if (fRaw === '') updated.quantity = '';
                    else {
                        const f = parseFloat(fRaw) || 0;
                        if (updated.price > 0) {
                            if (isBDR) updated.quantity = Math.floor(f / updated.price).toString();
                            else updated.quantity = (Math.floor((f / updated.price) / 100) * 100).toString();
                        }
                    }
                }
                return updated;
            });

            return { ...client, [field]: updatedLines };
        }));
    };

    const addExitLine = () => {
        const newLine: OrderLineState = {
            id: Math.random().toString(36).substr(2, 9),
            ticker: '',
            type: 'Venda',
            price: 0,
            basis: 'Quantidade',
            quantity: '',
            financial: '',
            target: '',
            stop: ''
        };
        setExitLines(prev => [...prev, newLine]);

        // Propagate new line to all selected clients
        setSelectedClients(prev => prev.map(client => ({
            ...client,
            exitLines: [...client.exitLines, { ...newLine }]
        })));
    };

    const removeExitLine = (id: string) => {
        setExitLines(prev => prev.filter(l => l.id !== id));
        // Remove from all clients too
        setSelectedClients(prev => prev.map(client => ({
            ...client,
            exitLines: client.exitLines.filter(l => l.id !== id)
        })));
    };

    const handleConfirmOrders = () => {
        setStep('config');
    };

    const handleSendEmail = async (client: SelectedClient) => {
        const subject = generateOrderEmailSubject({ conta: client.conta, id: client.id });

        // Transform lines to match generator expectations (using client-specific orders)
        const mappedOrders = client.orders.map(line => ({ ...line, mode: 'Mercado' }));
        const mappedExit = client.exitLines.map(line => ({ ...line, mode: 'Mercado' }));

        const html = generateOrderEmailHtml({ nome: client.nome }, mappedOrders, mode === 'exchange' ? mappedExit : undefined);
        const plainText = generateOrderEmailPlainText({ nome: client.nome }, mappedOrders, mode === 'exchange' ? mappedExit : undefined);

        const ccEmail = client.cc || userEmail;
        await copyAndOpenOutlook(client.email || '', subject, html, plainText, ccEmail);
    };

    const addClient = (client: any) => {
        const mappedClient: SelectedClient = {
            id: client["Cod Bols"].toString(),
            nome: client["Cliente"],
            conta: client["Conta"].toString(),
            email: client["Email Cliente"] || '',
            cc: client["Email Assessor"] || '',
            orders: orderLines.map(line => ({ ...line })), // Initialize with current templates
            exitLines: exitLines.map(line => ({ ...line }))
        };
        if (!selectedClients.find(c => c.id === mappedClient.id)) {
            setSelectedClients([...selectedClients, mappedClient]);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-6xl rounded-[1.5rem] shadow-2xl p-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
                            {mode === 'exchange' ? 'Troca de Ativo(s)' : 'Nova Entrada Swing Trade'}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                            Passo {step === 'clients' ? '1' : step === 'config' ? '2' : '3'} de 3 - {orderLines.length} Ativos
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                    {step === 'clients' ? (
                        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="bg-slate-50 p-10 rounded-[2rem] border border-slate-100 shadow-inner relative group">
                                {/* Decoration Container - handles clipping of blur circles without affecting dropdowns */}
                                <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl transition-all group-hover:bg-primary/10"></div>
                                </div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                                            <span className="material-symbols-outlined text-xl">person_search</span>
                                        </div>
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Base de Clientes Master</h4>
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-bold mb-6 max-w-lg leading-relaxed">
                                        Selecione os clientes que receberão esta recomendação. Você poderá ajustar as alocações individuais no próximo passo.
                                    </p>
                                    <ClientSearch
                                        placeholder="Busque por Nome, Conta ou Sinacor..."
                                        onSelect={addClient}
                                        className="max-w-xl scale-105 origin-left ml-2"
                                    />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">group</span>
                                        Clientes Selecionados ({selectedClients.length})
                                    </h4>
                                    {selectedClients.length > 0 && (
                                        <button onClick={() => setSelectedClients([])} className="text-[9px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">delete_sweep</span>
                                            Remover Todos
                                        </button>
                                    )}
                                </div>

                                {selectedClients.length === 0 ? (
                                    <div className="py-20 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 gap-4 bg-slate-50/20">
                                        <span className="material-symbols-outlined text-5xl">group_add</span>
                                        <p className="text-xs font-bold italic uppercase tracking-widest">Nenhum cliente selecionado</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {selectedClients.map(client => (
                                            <div key={client.id} className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-[1.25rem] shadow-sm hover:shadow-md hover:border-primary/50 transition-all group animate-in zoom-in-95">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                        <span className="material-symbols-outlined text-xl">person</span>
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm uppercase leading-tight">{client.nome}</p>
                                                        <p className="text-[9px] font-black text-slate-400 mt-0.5 tracking-wider uppercase">
                                                            {client.conta} <span className="mx-1 text-slate-200">•</span> {client.id}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedClients(selectedClients.filter(c => c.id !== client.id))}
                                                    className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-lg">close</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Step 2 Only: Global Parameters Surface */}
                            {step === 'config' && (
                                <div className="space-y-10">
                                    {/* SECTION: Ativos de Entrada */}
                                    <div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                                                <span className="material-symbols-outlined text-xl">login</span>
                                            </div>
                                            <div>
                                                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest text-left">Configuração Global de Entrada</h4>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Parâmetros aplicados a todos os clientes</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {orderLines.map((line) => (
                                                <div key={line.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                                                        <div className="col-span-1">
                                                            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest text-left">Ativo</label>
                                                            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-black text-slate-800 flex items-center gap-2">
                                                                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                                                                {line.ticker}
                                                            </div>
                                                        </div>
                                                        <div className="col-span-1">
                                                            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest text-left">Tipo</label>
                                                            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-black text-slate-500 uppercase">{line.type}</div>
                                                        </div>
                                                        <div className="col-span-1">
                                                            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest text-left">Preço Execução</label>
                                                            <div className="w-full bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-tighter flex items-center justify-center gap-2">
                                                                <span className="material-symbols-outlined text-sm">bolt</span>
                                                                A MERCADO
                                                            </div>
                                                        </div>
                                                        <div className="col-span-1">
                                                            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest text-left">Preço Alvo</label>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-3.5 text-slate-300 text-[10px] font-bold">R$</span>
                                                                <input
                                                                    type="text"
                                                                    value={line.target.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                                                                    onChange={(e) => updateLine(line.id, { target: formatLivePTBR(e.target.value) })}
                                                                    className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-primary transition-all shadow-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="col-span-1">
                                                            <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest text-left">Preço Stop</label>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-3.5 text-slate-300 text-[10px] font-bold">R$</span>
                                                                <input
                                                                    type="text"
                                                                    value={line.stop.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                                                                    onChange={(e) => updateLine(line.id, { stop: formatLivePTBR(e.target.value) })}
                                                                    className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-red-400 transition-all shadow-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* SECTION: Ativos de Saída (Only for Exchange Mode) */}
                                    {mode === 'exchange' && (
                                        <div className="pt-8 border-t border-slate-100">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-xl">logout</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest text-left">Configuração Global de Saída</h4>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Ativos que serão liquidados antes da entrada</p>
                                                    </div>
                                                </div>
                                                <button onClick={addExitLine} className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl border border-red-100 font-black text-[10px] uppercase hover:bg-red-500 hover:text-white transition-all group">
                                                    <span className="material-symbols-outlined text-sm group-hover:scale-110">add_circle</span>
                                                    Adicionar Ativo de Saída
                                                </button>
                                            </div>

                                            <div className="space-y-4">
                                                {exitLines.length === 0 ? (
                                                    <div className="py-16 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 gap-3">
                                                        <span className="material-symbols-outlined text-4xl">inventory_2</span>
                                                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhum ativo de saída configurado</p>
                                                    </div>
                                                ) : (
                                                    exitLines.map((line) => (
                                                        <div key={line.id} className="bg-white p-6 rounded-2xl border border-red-100/50 flex items-end gap-8 animate-in slide-in-from-left-4 duration-300 shadow-sm hover:shadow-md">
                                                            <div className="flex-1 grid grid-cols-2 gap-8 text-left">
                                                                <div>
                                                                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest leading-none">Ticker do Ativo</label>
                                                                    <input type="text" placeholder="EX: PETR4" value={line.ticker} onChange={(e) => updateLine(line.id, { ticker: e.target.value.toUpperCase() }, true)} className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-800 focus:border-red-400 focus:bg-white outline-none transition-all uppercase" />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest leading-none">Cotação de Referência</label>
                                                                    <div className="relative">
                                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-white uppercase bg-slate-800 px-2 py-0.5 rounded shadow-sm border border-slate-700">MKT</div>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="0,00"
                                                                            value={line.price === 0 ? '' : line.price.toString().replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                                                                            onChange={(e) => updateLine(line.id, { price: parseFloat(parsePTBR(e.target.value)) || 0 }, true)}
                                                                            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-16 pr-4 py-3 text-sm font-black text-slate-800 focus:border-red-400 focus:bg-white outline-none transition-all"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <button onClick={() => removeExitLine(line.id)} className="h-12 w-12 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-sm">
                                                                <span className="material-symbols-outlined">delete</span>
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Section for Dispatch Info */}
                            {step === 'dispatch' && (
                                <div className="bg-primary/10 border border-primary/20 p-8 rounded-[1.5rem] flex items-center gap-6 animate-in slide-in-from-top-4 duration-300 shadow-lg shadow-emerald-50 text-left">
                                    <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100">
                                        <span className="material-symbols-outlined text-3xl">mark_email_unread</span>
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-1">Pronto para o Disparo</h5>
                                        <p className="text-[11px] font-bold text-slate-500 uppercase leading-relaxed max-w-2xl">
                                            Revise os dados de cada cliente abaixo. Clique em <span className="text-primary font-black">"Abrir Outlook"</span> para gerar o corpo do e-mail de aprovação automaticamente para cada conta selecionada.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Section for Individual Client Cards (Step 2 and 3) */}
                            <div className="space-y-6 pt-8 border-t border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Alocação Individual por Cliente ({selectedClients.length})</h4>
                                <div className="space-y-6">
                                    {selectedClients.map(client => (
                                        <div key={client.id} className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all text-left group/card animate-in zoom-in-95">
                                            {/* Card Header */}
                                            <div className="bg-slate-50/80 px-8 py-6 border-b border-slate-100 flex justify-between items-center group-hover/card:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm group-hover/card:text-primary transition-colors">
                                                        <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
                                                    </div>
                                                    <div>
                                                        <h5 className="font-black text-slate-900 uppercase tracking-tight text-base leading-none mb-1.5">{client.nome}</h5>
                                                        <div className="flex items-center gap-3">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">CC: {client.conta}</p>
                                                            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Bolsa: {client.id}</p>
                                                            {client.email && (
                                                                <>
                                                                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                                    <p className="text-[10px] font-bold text-primary lowercase truncate max-w-[150px]">{client.email}</p>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {step === 'dispatch' ? (
                                                        <button
                                                            onClick={() => handleSendEmail(client)}
                                                            className="bg-[#102218] text-primary px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:brightness-125 transition-all shadow-lg active:scale-95"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">mail</span>
                                                            Abrir Outlook
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setSelectedClients(selectedClients.filter(c => c.id !== client.id))}
                                                            className="text-slate-300 hover:text-red-500 transition-colors p-2"
                                                        >
                                                            <span className="material-symbols-outlined text-2xl">delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Card Content - Allocations */}
                                            <div className="p-8 space-y-10">
                                                {/* Entry Allocations */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-6">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                                                            <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Alocação de Entrada</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        {client.orders.map(line => (
                                                            <div key={line.id} className="grid grid-cols-1 lg:grid-cols-4 gap-8 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 items-center">
                                                                <div className="col-span-1">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-emerald-500 font-black text-xs border border-slate-100">{line.ticker.charAt(0)}</div>
                                                                        <div>
                                                                            <p className="text-sm font-black text-slate-800 tracking-tight">{line.ticker}</p>
                                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">A Mercado</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="col-span-1">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantidade</label>
                                                                        <input type="radio" name={`basis-entry-${client.id}-${line.id}`} checked={line.basis === 'Quantidade'} onChange={() => updateClientLine(client.id, line.id, { basis: 'Quantidade' })} className="w-4 h-4 accent-primary cursor-pointer" />
                                                                    </div>
                                                                    <input type="number" placeholder="0" value={line.quantity} disabled={line.basis !== 'Quantidade'} onChange={(e) => updateClientLine(client.id, line.id, { quantity: e.target.value })} className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-700 outline-none transition-all ${line.basis !== 'Quantidade' ? 'opacity-30 bg-slate-100/50' : 'focus:ring-4 focus:ring-primary/10 focus:border-primary shadow-sm'}`} />
                                                                </div>
                                                                <div className="col-span-1">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financeiro</label>
                                                                        <input type="radio" name={`basis-entry-${client.id}-${line.id}`} checked={line.basis === 'Financeiro'} onChange={() => updateClientLine(client.id, line.id, { basis: 'Financeiro' })} className="w-4 h-4 accent-primary cursor-pointer" />
                                                                    </div>
                                                                    <div className="relative">
                                                                        <span className="absolute left-4 top-3.5 text-slate-300 text-[10px] font-black">R$</span>
                                                                        <input type="text" placeholder="0,00" value={line.financial} disabled={line.basis !== 'Financeiro'} onChange={(e) => updateClientLine(client.id, line.id, { financial: formatLivePTBR(e.target.value) })} className={`w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-black text-slate-700 outline-none transition-all ${line.basis !== 'Financeiro' ? 'opacity-30 bg-slate-100/50' : 'focus:ring-4 focus:ring-primary/10 focus:border-primary shadow-sm'}`} />
                                                                    </div>
                                                                </div>
                                                                <div className="col-span-1 border-l border-slate-100 pl-8">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Alvo / Stop</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[13px] font-black text-emerald-600">{line.target || '---'}</span>
                                                                        <span className="text-slate-200 text-xs">/</span>
                                                                        <span className="text-[13px] font-black text-red-500">{line.stop || '---'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Exit Allocations (if exchange) */}
                                                {mode === 'exchange' && client.exitLines.length > 0 && (
                                                    <div className="pt-2">
                                                        <div className="flex items-center gap-2 mb-6">
                                                            <div className="w-1.5 h-4 bg-red-400 rounded-full"></div>
                                                            <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Alocação de Saída</p>
                                                        </div>
                                                        <div className="space-y-4">
                                                            {client.exitLines.map(line => (
                                                                <div key={line.id} className="grid grid-cols-1 lg:grid-cols-4 gap-8 bg-red-50/10 p-6 rounded-2xl border border-red-100/30 items-center">
                                                                    <div className="col-span-1">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center text-red-500 font-black text-xs border border-red-100/50">{line.ticker.charAt(0)}</div>
                                                                            <div>
                                                                                <p className="text-sm font-black text-slate-800 tracking-tight">{line.ticker || '---'}</p>
                                                                                <p className="text-[10px] font-bold text-slate-400 uppercase">Venda</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-span-1">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantidade</label>
                                                                            <input type="radio" name={`basis-exit-${client.id}-${line.id}`} checked={line.basis === 'Quantidade'} onChange={() => updateClientLine(client.id, line.id, { basis: 'Quantidade' }, true)} className="w-4 h-4 accent-red-500 cursor-pointer" />
                                                                        </div>
                                                                        <input type="number" placeholder="0" value={line.quantity} disabled={line.basis !== 'Quantidade'} onChange={(e) => updateClientLine(client.id, line.id, { quantity: e.target.value }, true)} className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-700 outline-none transition-all ${line.basis !== 'Quantidade' ? 'opacity-30 bg-slate-100/50' : 'focus:ring-4 focus:ring-red-400/10 focus:border-red-400 shadow-sm'}`} />
                                                                    </div>
                                                                    <div className="col-span-1">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financeiro</label>
                                                                            <input type="radio" name={`basis-exit-${client.id}-${line.id}`} checked={line.basis === 'Financeiro'} onChange={() => updateClientLine(client.id, line.id, { basis: 'Financeiro' }, true)} className="w-4 h-4 accent-red-500 cursor-pointer" />
                                                                        </div>
                                                                        <div className="relative">
                                                                            <span className="absolute left-4 top-3.5 text-red-300 text-[10px] font-black">R$</span>
                                                                            <input type="text" placeholder="0,00" value={line.financial} disabled={line.basis !== 'Financeiro'} onChange={(e) => updateClientLine(client.id, line.id, { financial: formatLivePTBR(e.target.value) }, true)} className={`w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-black text-slate-700 outline-none transition-all ${line.basis !== 'Financeiro' ? 'opacity-30 bg-slate-100/50' : 'focus:ring-4 focus:ring-red-400/10 focus:border-red-400 shadow-sm'}`} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-span-1 border-l border-red-50 pl-8">
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">Preço Ref.</p>
                                                                        <p className="text-[13px] font-black text-slate-800">R$ {line.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-4 pt-8 bg-white border-t border-slate-50 mt-4">
                    {step === 'clients' ? (
                        <button
                            onClick={() => setStep('config')}
                            disabled={selectedClients.length === 0}
                            className="bg-[#27a673] px-10 py-4 rounded-xl text-white text-[12px] font-black uppercase tracking-widest flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-emerald-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-[20px]">settings_accessibility</span>
                            Avançar para Configuração
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => setStep(step === 'config' ? 'clients' : 'config')}
                                className="bg-white border border-slate-200 px-8 py-4 rounded-xl text-slate-600 text-[12px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all"
                            >
                                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                                Voltar
                            </button>
                            {step === 'config' ? (
                                <button
                                    onClick={() => setStep('dispatch')}
                                    className="flex-1 bg-[#102218] px-10 py-4 rounded-xl text-primary text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-125 transition-all shadow-xl shadow-slate-200"
                                >
                                    <span className="material-symbols-outlined text-[20px]">send_and_archive</span>
                                    Revisar Envio
                                </button>
                            ) : (
                                <button
                                    onClick={() => onConfirm(selectedClients)}
                                    className="flex-1 bg-emerald-600 px-10 py-4 rounded-xl text-white text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-xl"
                                >
                                    <span className="material-symbols-outlined text-[20px]">done_all</span>
                                    Concluir Processo
                                </button>
                            )}
                        </>
                    )}
                    <button
                        onClick={onClose}
                        className="bg-slate-50 border border-slate-100 px-8 py-4 rounded-xl text-slate-500 text-[12px] font-black uppercase tracking-widest hover:bg-slate-100 active:scale-95 transition-all"
                    >
                        {step === 'dispatch' ? 'Sair' : 'Cancelar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SwingTradeOrderModal;
