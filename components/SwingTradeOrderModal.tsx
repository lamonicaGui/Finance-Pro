import React, { useState, useEffect } from 'react';
import { SwingTradeAsset } from '../types.ts';
import ClientSearch from './ClientSearch.tsx';
import { copyAndOpenOutlook, generateOrderEmailHtml, generateOrderEmailSubject, generateOrderEmailPlainText } from '../utils/emailGenerator.ts';

interface SwingTradeOrderModalProps {
    assets: SwingTradeAsset[];
    userEmail?: string;
    onClose: () => void;
    onConfirm: (ordersData: any[]) => void;
}

interface OrderLineState {
    id: string;
    ticker: string;
    type: 'Compra' | 'Venda' | 'L&S';
    price: number;
    mode: 'Quantidade' | 'Financeiro';
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

const SwingTradeOrderModal: React.FC<SwingTradeOrderModalProps> = ({ assets, userEmail, onClose, onConfirm }) => {
    const [step, setStep] = useState<'config' | 'clients' | 'dispatch'>('config');
    const [orderLines, setOrderLines] = useState<OrderLineState[]>([]);
    const [selectedClients, setSelectedClients] = useState<SelectedClient[]>([]);

    useEffect(() => {
        setOrderLines(assets.map(asset => ({
            id: asset.id,
            ticker: asset.ticker,
            type: asset.type as any,
            price: asset.currentPrice || asset.entryPrice,
            mode: 'Quantidade' as const,
            quantity: '',
            financial: '',
            target: asset.targetPrice,
            stop: asset.stopPrice
        })));
    }, [assets]);

    const updateLine = (id: string, updates: Partial<OrderLineState>) => {
        setOrderLines(prev => prev.map(line => {
            if (line.id !== id) return line;
            const updated = { ...line, ...updates };

            if (updates.quantity !== undefined && updated.mode === 'Quantidade') {
                const q = parseFloat(updates.quantity) || 0;
                updated.financial = (q * updated.price).toFixed(2);
            }

            if (updates.financial !== undefined && updated.mode === 'Financeiro') {
                const f = parseFloat(updates.financial) || 0;
                if (updated.price > 0) {
                    updated.quantity = Math.floor(f / updated.price).toString();
                }
            }

            if (updates.mode) {
                if (updated.mode === 'Quantidade' && updated.quantity) {
                    updated.financial = (parseFloat(updated.quantity) * updated.price).toFixed(2);
                } else if (updated.mode === 'Financeiro' && updated.financial) {
                    updated.quantity = Math.floor(parseFloat(updated.financial) / updated.price).toString();
                }
            }

            return updated;
        }));
    };

    const handleConfirmOrders = () => {
        setStep('dispatch');
    };

    const handleSendEmail = async (client: SelectedClient) => {
        const subject = generateOrderEmailSubject({ conta: client.conta, id: client.id });
        const html = generateOrderEmailHtml({ nome: client.nome }, orderLines);
        const plainText = generateOrderEmailPlainText({ nome: client.nome }, orderLines);

        // Use client.cc if available, otherwise fallback to userEmail (assessor email)
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
                            {step === 'config' ? `Configurar Swing Trade (${assets.length} Ativos)` :
                                step === 'clients' ? 'Selecionar Clientes para Disparo' : 'Finalizar e Enviar para Outlook'}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                            Passo {step === 'config' ? '1' : step === 'clients' ? '2' : '3'} de 3
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                    {step === 'config' ? (
                        <div className="space-y-12">
                            {orderLines.map((line) => (
                                <div key={line.id} className="border-b border-slate-100 pb-12 last:border-0">
                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
                                        <div className="col-span-1">
                                            <label className="block text-[11px] font-bold text-slate-700 mb-2">Ativo</label>
                                            <input type="text" readOnly value={line.ticker} className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-slate-400 focus:outline-none" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-[11px] font-bold text-slate-700 mb-2">Tipo</label>
                                            <select value={line.type} onChange={(e) => updateLine(line.id, { type: e.target.value as any })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer">
                                                <option value="Compra">Compra</option>
                                                <option value="Venda">Venda</option>
                                                <option value="L&S">L&S</option>
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-[11px] font-bold text-slate-700 mb-2">Cotação</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-3.5 text-slate-400 text-xs font-bold">R$</span>
                                                <input type="number" value={line.price} onChange={(e) => updateLine(line.id, { price: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-700 outline-none" />
                                            </div>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-[11px] font-bold text-slate-700 mb-2">Modo</label>
                                            <select value={line.mode} onChange={(e) => updateLine(line.id, { mode: e.target.value as any })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer">
                                                <option value="Quantidade">Quantidade</option>
                                                <option value="Financeiro">Financeiro</option>
                                            </select>
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-[11px] font-bold text-slate-700 mb-2">Quantidade</label>
                                            <input type="number" disabled={line.mode === 'Financeiro'} placeholder="0" value={line.quantity} onChange={(e) => updateLine(line.id, { quantity: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="block text-[11px] font-bold text-slate-700 mb-2">Financeiro</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-3.5 text-slate-400 text-xs font-bold">R$</span>
                                                <input type="number" disabled={line.mode === 'Quantidade'} placeholder="0,00" value={line.financial} onChange={(e) => updateLine(line.id, { financial: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                                        <div className="col-span-2">
                                            <label className="block text-[11px] font-bold text-slate-700 mb-2">Alvo</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-3.5 text-slate-400 text-xs font-bold">Ex: R$</span>
                                                <input type="number" value={line.target} onChange={(e) => updateLine(line.id, { target: parseFloat(e.target.value) || 0 })} className="w-full bg-white border border-slate-200 rounded-xl pl-16 pr-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[11px] font-bold text-slate-700 mb-2">Stop</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-3.5 text-slate-400 text-xs font-bold">Ex: R$</span>
                                                <input type="number" value={line.stop} onChange={(e) => updateLine(line.id, { stop: parseFloat(e.target.value) || 0 })} className="w-full bg-white border border-slate-200 rounded-xl pl-16 pr-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
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
