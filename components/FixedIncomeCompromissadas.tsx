
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
}

const FixedIncomeCompromissadas: React.FC = () => {
    const [selectedClients, setSelectedClients] = useState<ClientEntry[]>([]);
    const [movementType, setMovementType] = useState('Aplicação');
    const [assetType, setAssetType] = useState('CDB');
    const [issuer, setIssuer] = useState('SAFRA');
    const [rate, setRate] = useState('100');
    const [maturity, setMaturity] = useState('');
    const [value, setValue] = useState<number>(0);
    const [isSending, setIsSending] = useState(false);

    const addClient = (master: any) => {
        if (selectedClients.find(c => c.id === master["Cod Bolsa"])) return;
        const newClient: ClientEntry = {
            id: master["Cod Bolsa"],
            nome: master.Cliente,
            conta: master.Conta,
            email: master["Email Cliente"] || ''
        };
        setSelectedClients([...selectedClients, newClient]);
    };

    const removeClient = (id: string) => {
        setSelectedClients(selectedClients.filter(c => c.id !== id));
    };

    const handleSendEmails = async () => {
        if (selectedClients.length === 0) {
            alert('Selecione ao menos um cliente.');
            return;
        }
        if (!maturity || value <= 0) {
            alert('Preencha o vencimento e o valor.');
            return;
        }

        setIsSending(true);

        try {
            // If multiple clients, we'll open them one by one (or most browser will block after the first one)
            // For now, let's process them. If it's more than one, we might need a queue like in ApprovalsLayout.
            for (const client of selectedClients) {
                const subject = generateFixedIncomeEmailSubject(movementType, client.conta);
                const html = generateFixedIncomeEmailHtml({
                    clientName: client.nome,
                    account: client.conta,
                    movementType,
                    asset: assetType,
                    issuer,
                    rate,
                    maturity: maturity.split('-').reverse().join('/'), // YYY-MM-DD to DD/MM/YYYY
                    value
                });
                const plainText = generateFixedIncomeEmailPlainText({
                    account: client.conta,
                    movementType,
                    asset: assetType,
                    issuer,
                    rate,
                    maturity: maturity.split('-').reverse().join('/'),
                    value
                });

                await copyAndOpenOutlook(client.email, subject, html, plainText);
                // Mini delay to avoid browser blocks if possible, though mailto usually stops execution anyway
                await new Promise(resolve => setTimeout(resolve, 500));
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
            {/* Header Section */}
            <div className="bg-white dark:bg-card-dark rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none">
                <div className="flex flex-col lg:flex-row gap-10">
                    {/* Left: Client Selection */}
                    <div className="flex-1 space-y-6">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined text-2xl">person_add</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">Seleção de Clientes</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Adicione os destinatários da aprovação</p>
                            </div>
                        </div>

                        <ClientSearch
                            placeholder="Buscar por Nome, Conta ou Cod. Bolsa..."
                            onSelect={addClient}
                            showHeaderStyle
                            className="w-full"
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {selectedClients.map(client => (
                                <div key={client.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 group">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase truncate max-w-[150px]">{client.nome}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{client.conta} | {client.id}</span>
                                    </div>
                                    <button
                                        onClick={() => removeClient(client.id)}
                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-lg">close</span>
                                    </button>
                                </div>
                            ))}
                            {selectedClients.length === 0 && (
                                <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum cliente selecionado</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Operation Details */}
                    <div className="flex-1 space-y-6 border-l border-slate-100 dark:border-slate-800 pl-10">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <span className="material-symbols-outlined text-2xl">receipt_long</span>
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic">Dados da Operação</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configure os detalhes do ativo</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Movimentação</label>
                                <select
                                    value={movementType}
                                    onChange={(e) => setMovementType(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-primary/10 transition-all"
                                >
                                    <option value="Aplicação">APLICAÇÃO</option>
                                    <option value="Resgate">RESGATE</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Ativo</label>
                                <select
                                    value={assetType}
                                    onChange={(e) => setAssetType(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-primary/10 transition-all"
                                >
                                    <option value="CDB">CDB</option>
                                    <option value="Compromissada">COMPROMISSADA</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Emissor</label>
                                <input
                                    type="text"
                                    value={issuer}
                                    onChange={(e) => setIssuer(e.target.value.toUpperCase())}
                                    className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-primary/10 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Rentabilidade (% CDI)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={rate}
                                        onChange={(e) => setRate(e.target.value)}
                                        className="w-full h-12 px-4 pr-12 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-black text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-primary/10 transition-all"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">%</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Vencimento</label>
                                <input
                                    type="date"
                                    value={maturity}
                                    onChange={(e) => setMaturity(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-primary/10 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Valor (R$)</label>
                                <input
                                    type="number"
                                    value={value || ''}
                                    onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                                    placeholder="0,00"
                                    className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-black text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={handleSendEmails}
                                disabled={isSending}
                                className="w-full h-14 bg-primary hover:bg-primary-dark text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-xl">send</span>
                                {isSending ? 'Processando...' : 'Enviar E-mails de Aprovação'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Template Preview Section */}
            <div className="bg-slate-50 dark:bg-slate-900/30 rounded-[2rem] p-8 border border-slate-200/50 dark:border-slate-800/50">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">visibility</span>
                    Prévia do Conteúdo (Modelo Outlook)
                </h3>

                <div className="bg-white dark:bg-card-dark rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm font-medium text-sm text-slate-600 dark:text-slate-400 space-y-4">
                    <p>Prezado, bom dia.</p>
                    <p>Conforme conversado com o seu assessor, gostaria de confirmar sua solicitação na realização da ordem abaixo discriminada, cuja liquidação financeira ocorrerá em sua conta SAFRA:</p>

                    <div className="space-y-1 text-slate-800 dark:text-slate-200 font-bold">
                        <p>Agência 0288 / Conta Corrente: <span className="text-primary">{selectedClients[0]?.conta || '---'}</span></p>
                        <p>Tipo de Movimentação: <span className="text-primary">{movementType.toUpperCase()}</span></p>
                        <p>Ativo: {assetType}</p>
                        <p>Emissor: {issuer}</p>
                        <p>Taxa de rentabilidade (%a.a): {rate}% do CDI</p>
                        <p>Carência: Liquidez Diária</p>
                        <p>Vencimento: {maturity ? maturity.split('-').reverse().join('/') : '---'}</p>
                        <p>Valor: {formatCurrency(value)}</p>
                    </div>

                    <p className="pt-4">Atenciosamente,<br /><span className="font-black text-slate-900 dark:text-white">FinancePro Team</span></p>
                </div>
            </div>
        </div>
    );
};

export default FixedIncomeCompromissadas;
