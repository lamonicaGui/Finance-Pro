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
    target: number;
    stop: number;
}

interface SelectedClient {
    id: string; // Cod Bols
    nome: string;
    conta: string;
    email?: string;
    cc?: string;
}

const formatFinanceiro = (val: string | number) => {
    if (val === '' || val === undefined || val === null) return '';
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
    const [step, setStep] = useState<'config' | 'clients' | 'dispatch'>('config');
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
            target: asset.targetPrice,
            stop: asset.stopPrice
        })));
    }, [assets]);

    const updateLine = (id: string, updates: Partial<OrderLineState>, isExit: boolean = false) => {
        const setter = isExit ? setExitLines : setOrderLines;
        setter(prev => prev.map(line => {
            if (line.id !== id) return line;

            // "Preenchimento de um anula o outro" 
            // If quantity is provided, we set basis to Quantidade and clear financial input before calc
            // If financial is provided, we set basis to Financeiro and clear quantity input before calc
            const newUpdates = { ...updates };
            if (updates.quantity !== undefined) {
                newUpdates.basis = 'Quantidade';
            } else if (updates.financial !== undefined) {
                newUpdates.basis = 'Financeiro';
            }

            const updated = { ...line, ...newUpdates };
            const isBDR = line.ticker.endsWith('31') || line.ticker.endsWith('32') || line.ticker.endsWith('33');

            if (newUpdates.quantity !== undefined && updated.basis === 'Quantidade') {
                const q = parseFloat(newUpdates.quantity) || 0;
                updated.financial = formatFinanceiro(q * updated.price);
            }

            if (newUpdates.financial !== undefined && updated.basis === 'Financeiro') {
                const fRaw = parsePTBR(newUpdates.financial);
                const f = parseFloat(fRaw) || 0;
                if (updated.price > 0) {
                    if (isBDR) {
                        updated.quantity = Math.floor(f / updated.price).toString();
                    } else {
                        const qRaw = f / updated.price;
                        updated.quantity = (Math.floor(qRaw / 100) * 100).toString();
                    }
                    // Re-calculate accurate financial after rounding quantity
                    updated.financial = formatFinanceiro(parseFloat(updated.quantity) * updated.price);
                } else {
                    updated.quantity = '0';
                }
            }

            // Sync logic if basis changed but no direct value was passed (e.g. from a select)
            if (updates.basis && !updates.quantity && !updates.financial) {
                if (updated.basis === 'Quantidade' && updated.quantity) {
                    updated.financial = formatFinanceiro(parseFloat(updated.quantity) * updated.price);
                } else if (updated.basis === 'Financeiro' && updated.financial) {
                    const f = parseFloat(parsePTBR(updated.financial)) || 0;
                    if (updated.price > 0) {
                        if (isBDR) {
                            updated.quantity = Math.floor(f / updated.price).toString();
                        } else {
                            const qRaw = f / updated.price;
                            updated.quantity = (Math.floor(qRaw / 100) * 100).toString();
                        }
                        updated.financial = formatFinanceiro(parseFloat(updated.quantity) * updated.price);
                    }
                }
            }

            return updated;
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
            target: 0,
            stop: 0
        };
        setExitLines([...exitLines, newLine]);
    };

    const removeExitLine = (id: string) => {
        setExitLines(prev => prev.filter(l => l.id !== id));
    };

    const handleConfirmOrders = () => {
        setStep('dispatch');
    };

    const handleSendEmail = async (client: SelectedClient) => {
        const subject = generateOrderEmailSubject({ conta: client.conta, id: client.id });

        // Transform lines to match generator expectations (forcing price mode to Mercado)
        const mappedOrders = orderLines.map(line => ({ ...line, mode: 'Mercado' }));
        const mappedExit = exitLines.map(line => ({ ...line, mode: 'Mercado' }));

        const html = generateOrderEmailHtml({ nome: client.nome }, mappedOrders, mode === 'exchange' ? mappedExit : undefined);
        const plainText = generateOrderEmailPlainText({ nome: client.nome }, mappedOrders, mode === 'exchange' ? mappedExit : undefined);

        const ccEmail = client.cc || userEmail;
        await copyAndOpenOutlook(client.email || '', subject, html, plainText, ccEmail);
    };

    const addClient = (client: any) => {
        const mappedClient: SelectedClient = {
            id: client["Cod Bolsa"].toString(),
            nome: client["Cliente"],
            conta: client["Conta"].toString(),
            email: client["Email Cliente"] || '',
            cc: client["Email Assessor"] || ''
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
                            Passo {step === 'config' ? '1' : step === 'clients' ? '2' : '3'} de 3 - {orderLines.length} Ativos
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                    {step === 'config' ? (
                        <div className="space-y-12">
                            {/* SECTION: Ativos de Entrada */}
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-6 w-1 bg-emerald-500 rounded-full"></div>
                                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Ativos de Entrada (Novas Recomendações)</h4>
                                </div>
                                <div className="space-y-8">
                                    {orderLines.map((line) => (
                                        <div key={line.id} className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                            <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                                                <div className="col-span-1">
                                                    <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">Ativo</label>
                                                    <input type="text" readOnly value={line.ticker} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-400 focus:outline-none" />
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">Tipo</label>
                                                    <select value={line.type} onChange={(e) => updateLine(line.id, { type: e.target.value as any })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer">
                                                        <option value="Compra">Compra</option>
                                                        <option value="Venda">Venda</option>
                                                        <option value="L&S">L&S</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">Preço</label>
                                                    <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-tighter flex items-center justify-center">
                                                        A MERCADO
                                                    </div>
                                                </div>
                                                <div className="col-span-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Quantidade</label>
                                                        <input
                                                            type="radio"
                                                            name={`basis-${line.id}`}
                                                            checked={line.basis === 'Quantidade'}
                                                            onChange={() => updateLine(line.id, { basis: 'Quantidade' })}
                                                            className="w-3 h-3 accent-primary cursor-pointer"
                                                        />
                                                    </div>
                                                    <input
                                                        type="number"
                                                        placeholder="0"
                                                        value={line.quantity}
                                                        disabled={line.basis !== 'Quantidade'}
                                                        onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
                                                        className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all ${line.basis !== 'Quantidade' ? 'bg-slate-50 opacity-50 cursor-not-allowed' : 'focus:ring-2 focus:ring-primary/20 focus:border-primary'}`}
                                                    />
                                                </div>
                                                <div className="col-span-1">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Financeiro</label>
                                                        <input
                                                            type="radio"
                                                            name={`basis-${line.id}`}
                                                            checked={line.basis === 'Financeiro'}
                                                            onChange={() => updateLine(line.id, { basis: 'Financeiro' })}
                                                            className="w-3 h-3 accent-primary cursor-pointer"
                                                        />
                                                    </div>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-3.5 text-slate-400 text-xs font-bold">R$</span>
                                                        <input
                                                            type="text"
                                                            placeholder="0,00"
                                                            value={line.financial}
                                                            disabled={line.basis !== 'Financeiro'}
                                                            onChange={(e) => updateLine(line.id, { financial: formatLivePTBR(e.target.value) })}
                                                            className={`w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-700 outline-none transition-all ${line.basis !== 'Financeiro' ? 'bg-slate-50 opacity-50 cursor-not-allowed' : 'focus:ring-2 focus:ring-primary/20 focus:border-primary'}`}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="col-span-1">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">Alvo</label>
                                                            <input
                                                                type="text"
                                                                value={line.target.toString().replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                                                                onChange={(e) => updateLine(line.id, { target: parseFloat(parsePTBR(e.target.value)) || 0 })}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">Stop</label>
                                                            <input
                                                                type="text"
                                                                value={line.stop.toString().replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                                                                onChange={(e) => updateLine(line.id, { stop: parseFloat(parsePTBR(e.target.value)) || 0 })}
                                                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none"
                                                            />
                                                        </div>
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
                                            <div className="h-6 w-1 bg-red-500 rounded-full"></div>
                                            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Ativos de Saída (Encerrar Posição)</h4>
                                        </div>
                                        <button onClick={addExitLine} className="flex items-center gap-2 text-primary font-black text-[10px] uppercase hover:brightness-125 transition-all">
                                            <span className="material-symbols-outlined text-sm">add_circle</span>
                                            Adicionar Ativo de Saída
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {exitLines.length === 0 ? (
                                            <div className="py-12 bg-slate-50/30 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum ativo de saída adicionado</p>
                                                <button onClick={addExitLine} className="mt-4 text-xs font-black text-primary underline">Clique para adicionar</button>
                                            </div>
                                        ) : (
                                            exitLines.map((line) => (
                                                <div key={line.id} className="bg-red-50/10 p-6 rounded-2xl border border-red-100/50 flex items-end gap-6 animate-in slide-in-from-left-4 duration-300">
                                                    <div className="flex-1 grid grid-cols-4 gap-6">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">Ticker Saída</label>
                                                            <input type="text" placeholder="PETR4" value={line.ticker} onChange={(e) => updateLine(line.id, { ticker: e.target.value.toUpperCase() }, true)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-slate-700 focus:border-red-300 outline-none transition-all uppercase" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">Preço (Mercado)</label>
                                                            <div className="relative">
                                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase pointer-events-none bg-slate-100 px-1.5 py-0.5 rounded shadow-sm border border-slate-200">MKT</div>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Cotação Ref."
                                                                    value={line.price.toString().replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                                                                    onChange={(e) => updateLine(line.id, { price: parseFloat(parsePTBR(e.target.value)) || 0 }, true)}
                                                                    className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-xs font-bold text-slate-700 focus:border-red-300 outline-none transition-all"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">Quantidade</label>
                                                            <input type="number" placeholder="0" value={line.quantity} onChange={(e) => updateLine(line.id, { quantity: e.target.value }, true)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:border-red-300 outline-none transition-all" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">Financeiro Est.</label>
                                                            <div className="relative">
                                                                <span className="absolute left-4 top-3.5 text-slate-400 text-xs font-bold">R$</span>
                                                                <input type="text" value={line.financial} readOnly className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-400 outline-none" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeExitLine(line.id)} className="h-11 w-11 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                                                        <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            {step === 'clients' && (
                                <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Adicionar Cliente da Base Master</label>
                                    <ClientSearch
                                        placeholder="Buscar por Nome, Sinacor ou Conta..."
                                        onSelect={addClient}
                                        className="max-w-md"
                                    />
                                </div>
                            )}

                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clientes Selecionados ({selectedClients.length})</h4>
                                {selectedClients.length === 0 ? (
                                    <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl text-center text-slate-400 text-xs italic">
                                        Nenhum cliente selecionado. Use a busca acima.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {selectedClients.map(client => (
                                            <div key={client.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-primary transition-all group">
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm uppercase">{client.nome}</p>
                                                    <p className="text-[10px] font-bold text-slate-400">Conta: {client.conta}</p>
                                                </div>
                                                {step === 'clients' && (
                                                    <button
                                                        onClick={() => setSelectedClients(selectedClients.filter(c => c.id !== client.id))}
                                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}{step === 'dispatch' && (
                                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex items-center gap-4">
                                            <span className="material-symbols-outlined text-emerald-600">info</span>
                                            <p className="text-xs font-bold text-emerald-800">Clique em cada cliente abaixo para abrir o Outlook com a mensagem formatada pronta para o envio.</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4">
                                            {selectedClients.map(client => (
                                                <div key={client.id} className="flex items-center justify-between p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all">
                                                    <div>
                                                        <h5 className="font-black text-slate-900 uppercase">{client.nome}</h5>
                                                        <div className="flex gap-4 mt-1">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Conta: {client.conta}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Bolsa: {client.id}</span>
                                                            <span className="text-[10px] font-bold text-blue-500 truncate">{client.email}</span>
                                                            {client.cc && (
                                                                <span className="text-[10px] font-bold text-slate-400 truncate">CC: {client.cc}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleSendEmail(client)}
                                                        className="bg-slate-900 text-primary px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:brightness-125 transition-all shadow-lg"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">mail</span>
                                                        Abrir Outlook
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-4 pt-8 bg-white border-t border-slate-50 mt-4">
                    {step === 'config' ? (
                        <button
                            onClick={() => setStep('clients')}
                            className="bg-[#27a673] px-10 py-4 rounded-xl text-white text-[12px] font-black uppercase tracking-widest flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-emerald-100"
                        >
                            <span className="material-symbols-outlined text-[20px]">search</span>
                            Selecionar Clientes
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => setStep(step === 'clients' ? 'config' : 'clients')}
                                className="bg-white border border-slate-200 px-8 py-4 rounded-xl text-slate-600 text-[12px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all"
                            >
                                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                                Voltar
                            </button>
                            {step === 'clients' ? (
                                <button
                                    onClick={handleConfirmOrders}
                                    disabled={selectedClients.length === 0}
                                    className="flex-1 bg-[#102218] px-10 py-4 rounded-xl text-primary text-[12px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-125 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-200"
                                >
                                    <span className="material-symbols-outlined text-[20px]">send_and_archive</span>
                                    Preparar {selectedClients.length} E-mails
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
