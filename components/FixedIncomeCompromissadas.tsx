
import React, { useState } from 'react';
import ClientSearch from './ClientSearch';
import {
    generateFixedIncomeEmailHtml,
    generateFixedIncomeEmailSubject,
    generateFixedIncomeEmailPlainText,
    copyAndOpenOutlook
} from '../utils/emailGenerator';

interface ClientEntry {
    id: string;
    nome: string;
    conta: string;
    email: string;
    advisorEmail: string;
    movementType: string;
    assetType: string;
    issuer: string;
    rate: string;
    maturity: string;
    value: number;
}

interface FixedIncomeCompromissadasProps {
    advisorEmail?: string;
}

const FixedIncomeCompromissadas: React.FC<FixedIncomeCompromissadasProps> = ({ advisorEmail }) => {
    const [selectedClients, setSelectedClients] = useState<ClientEntry[]>([]);
    const [isSending, setIsSending] = useState(false);

    const addClient = (master: any) => {
        if (selectedClients.find(c => c.id === master["Cod Bolsa"])) return;
        const newClient: ClientEntry = {
            id: master["Cod Bolsa"],
            nome: master.Cliente,
            conta: master.Conta,
            email: master["Email Cliente"] || '',
            advisorEmail: master.Assessor || '',
            movementType: 'Aplicação',
            assetType: 'CDB',
            issuer: 'SAFRA',
            rate: '100',
            maturity: '',
            value: 0
        };
        setSelectedClients([...selectedClients, newClient]);
    };

    const updateClientData = (id: string, field: keyof ClientEntry, val: any) => {
        setSelectedClients(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
    };

    const removeClient = (id: string) => {
        setSelectedClients(selectedClients.filter(c => c.id !== id));
    };

    const handleSendEmails = async () => {
        if (selectedClients.length === 0) {
            alert('Selecione ao menos um cliente.');
            return;
        }

        const invalid = selectedClients.find(c => !c.maturity || c.value <= 0);
        if (invalid) {
            alert(`Por favor, preencha o vencimento e o valor para o cliente: ${invalid.nome}`);
            return;
        }

        setIsSending(true);

        try {
            for (const client of selectedClients) {
                const subject = generateFixedIncomeEmailSubject(client.movementType, client.conta);
                const html = generateFixedIncomeEmailHtml({
                    clientName: client.nome,
                    account: client.conta,
                    movementType: client.movementType,
                    asset: client.assetType,
                    issuer: client.issuer,
                    rate: client.rate,
                    maturity: client.maturity.split('-').reverse().join('/'),
                    value: client.value
                });
                const plainText = generateFixedIncomeEmailPlainText({
                    account: client.conta,
                    movementType: client.movementType,
                    asset: client.assetType,
                    issuer: client.issuer,
                    rate: client.rate,
                    maturity: client.maturity.split('-').reverse().join('/'),
                    value: client.value
                });

                await copyAndOpenOutlook(client.email, subject, html, plainText, client.advisorEmail);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } finally {
            setIsSending(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header & Search Section */}
            <div className="bg-white dark:bg-card-dark rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">Investimentos RF</h2>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Compromissadas e CDBs Personalizados</p>
                        </div>
                    </div>

                    <div className="w-full md:w-[450px]">
                        <ClientSearch
                            placeholder="Buscar por Nome, Conta ou Cod. Bolsa..."
                            onSelect={addClient}
                            showHeaderStyle
                            className="w-full"
                        />
                    </div>
                </div>

                {selectedClients.length > 0 ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center px-2">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedClients.length} Clientes em Preparação</h3>
                            <button
                                onClick={handleSendEmails}
                                disabled={isSending}
                                className="px-8 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">send</span>
                                {isSending ? 'Processando...' : 'Disparar E-mails de Aprovação'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {selectedClients.map((client) => (
                                <div key={client.id} className="relative bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:bg-white dark:hover:bg-slate-900 group">
                                    <button
                                        onClick={() => removeClient(client.id)}
                                        className="absolute top-6 right-6 h-10 w-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-300 hover:text-red-500 hover:border-red-500/30 transition-all flex items-center justify-center shadow-sm"
                                    >
                                        <span className="material-symbols-outlined text-xl">delete</span>
                                    </button>

                                    <div className="flex flex-col xl:flex-row gap-10">
                                        {/* Client Summary Header */}
                                        <div className="xl:w-[300px] shrink-0 space-y-4">
                                            <div className="space-y-2">
                                                <div className="px-3 py-1 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest rounded-full inline-block">Cliente Vinculado</div>
                                                <h4 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic truncate">{client.nome}</h4>
                                                <div className="flex flex-col gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    <span>Conta: {client.conta}</span>
                                                    <span>Código: {client.id}</span>
                                                    <span className="text-primary/70">{client.email || 'Sem e-mail cadastrado'}</span>
                                                </div>
                                            </div>

                                            {/* Preview in the card */}
                                            <div className="pt-4 border-t border-dashed border-slate-200 dark:border-slate-700">
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Resumo da Ordem</div>
                                                <div className="text-xs font-black text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                    {client.movementType.toUpperCase()} {client.assetType} <br />
                                                    {client.rate}% CDI | {client.maturity ? client.maturity.split('-').reverse().join('/') : '---'} <br />
                                                    <span className="text-primary text-sm mt-1 block">{formatCurrency(client.value)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Individual Form Fields */}
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Movimentação</label>
                                                <select
                                                    value={client.movementType}
                                                    onChange={(e) => updateClientData(client.id, 'movementType', e.target.value)}
                                                    className="w-full h-12 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-primary/10 transition-all"
                                                >
                                                    <option value="Aplicação">APLICAÇÃO</option>
                                                    <option value="Resgate">RESGATE</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Ativo</label>
                                                <select
                                                    value={client.assetType}
                                                    onChange={(e) => updateClientData(client.id, 'assetType', e.target.value)}
                                                    className="w-full h-12 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-primary/10 transition-all"
                                                >
                                                    <option value="CDB">CDB</option>
                                                    <option value="Compromissada">COMPROMISSADA</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Emissor</label>
                                                <input
                                                    type="text"
                                                    value={client.issuer}
                                                    onChange={(e) => updateClientData(client.id, 'issuer', e.target.value.toUpperCase())}
                                                    className="w-full h-12 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-primary/10 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Rentabilidade (% CDI)</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={client.rate}
                                                        onChange={(e) => updateClientData(client.id, 'rate', e.target.value)}
                                                        className="w-full h-12 px-4 pr-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-primary/10 transition-all"
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">%</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Vencimento</label>
                                                <input
                                                    type="date"
                                                    value={client.maturity}
                                                    onChange={(e) => updateClientData(client.id, 'maturity', e.target.value)}
                                                    className="w-full h-12 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-primary/10 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Valor (R$)</label>
                                                <input
                                                    type="number"
                                                    value={client.value || ''}
                                                    onChange={(e) => updateClientData(client.id, 'value', parseFloat(e.target.value) || 0)}
                                                    placeholder="0,00"
                                                    className="w-full h-12 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-black text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="h-20 w-20 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-200 dark:text-slate-800">
                            <span className="material-symbols-outlined text-5xl">group_add</span>
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-lg font-black text-slate-400 uppercase tracking-tighter italic">Nenhum cliente selecionado</h4>
                            <p className="text-slate-300 dark:text-slate-700 text-xs font-bold uppercase tracking-widest">Utilize a busca acima para adicionar os destinatários</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Global Actions Bar (Fixed bottom or just visible) */}
            {selectedClients.length > 0 && (
                <div className="flex justify-center pt-2">
                    <div className="max-w-md w-full bg-slate-900 border border-slate-800 dark:bg-primary p-6 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-4 animate-in slide-in-from-bottom-8 duration-500">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary dark:text-white text-3xl animate-pulse">forward_to_inbox</span>
                            <div className="text-center">
                                <p className="text-[11px] font-black text-white dark:text-slate-900 uppercase tracking-[0.2em] leading-none">Pronto para Disparo</p>
                                <p className="text-[9px] font-bold text-slate-500 dark:text-slate-800 uppercase tracking-widest mt-1 italic">CC: {selectedClients[0]?.advisorEmail || 'assessor@safra.com.br'}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSendEmails}
                            disabled={isSending}
                            className="w-full h-14 bg-white dark:bg-slate-900 text-slate-900 dark:text-primary rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            {isSending ? 'Processando Lote...' : `Enviar Aprovações (${selectedClients.length})`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FixedIncomeCompromissadas;
