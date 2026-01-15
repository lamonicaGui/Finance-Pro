import React, { useState } from 'react';
import { ClientGroup as ClientGroupType, OrderItem } from '../types.ts';
import OrderRow from './OrderRow.tsx';
import ClientSearch from './ClientSearch.tsx';

interface ApprovalsLayoutProps {
    clients: ClientGroupType[];
    selectedClientId: string | null;
    onSelectClient: (id: string) => void;
    onAddClient: () => void;
    onAddClientFromMaster: (masterClient: any) => void;
    onUpdateClient: (id: string, updates: Partial<ClientGroupType>) => void;
    onRemoveClient: (id: string) => void;
    onAddOrder: (clientId: string) => void;
    onUpdateOrder: (clientId: string, orderId: string, updates: Partial<OrderItem>) => void;
    onRemoveOrder: (clientId: string, orderId: string) => void;
    onSendEmail: (client: ClientGroupType) => void;
    onSendAll: () => void;
    onLogout: () => void;
    userProfile: any;
    onSwitchTab: (tab: any) => void;
}

const ApprovalsLayout: React.FC<ApprovalsLayoutProps> = ({
    clients,
    selectedClientId,
    onSelectClient,
    onAddClient,
    onAddClientFromMaster,
    onUpdateClient,
    onRemoveClient,
    onAddOrder,
    onUpdateOrder,
    onRemoveOrder,
    onSendEmail,
    onSendAll,
    onLogout,
    userProfile,
    onSwitchTab
}) => {
    const selectedClient = clients.find(c => c.id === selectedClientId);

    return (
        <div className="flex flex-col gap-8 -mt-10">
            {selectedClient ? (
                <>
                    <div className="bg-white/80 dark:bg-card-dark/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 p-8 sticky top-[104px] z-30 shadow-sm transition-all duration-300 -mx-10 rounded-b-[2.5rem]">
                        <div className="max-w-[1400px] mx-auto flex flex-col xl:flex-row gap-8 items-end">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2 tracking-widest">Conta / Sinacor</label>
                                    <input
                                        disabled
                                        className="w-full h-12 px-5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl font-mono font-black text-slate-400"
                                        type="text"
                                        value={selectedClient.account}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2 tracking-widest">Nome do Cliente</label>
                                    <input
                                        className="w-full h-12 px-5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black uppercase text-slate-800 dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                                        type="text"
                                        value={selectedClient.name}
                                        onChange={(e) => onUpdateClient(selectedClient.id, { name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2 tracking-widest">E-mail (Para)</label>
                                    <input
                                        className="w-full h-12 px-5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-medium text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                                        type="email"
                                        value={selectedClient.email || ''}
                                        onChange={(e) => onUpdateClient(selectedClient.id, { email: e.target.value })}
                                        placeholder="usuario@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2 tracking-widest">CC (Cópia)</label>
                                    <input
                                        className="w-full h-12 px-5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-medium text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                                        type="email"
                                        value={selectedClient.cc || ''}
                                        onChange={(e) => onUpdateClient(selectedClient.id, { cc: e.target.value })}
                                        placeholder="assessor@katinvest.com.br"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <button
                                    onClick={() => onSendEmail(selectedClient)}
                                    className="h-12 px-8 bg-primary hover:bg-primary-dark text-white font-black rounded-[0.85rem] flex items-center gap-3 transition-all text-xs uppercase shadow-xl shadow-primary/20 active:scale-95"
                                >
                                    <span className="material-icons-outlined text-lg">send</span>
                                    Enviar E-mail
                                </button>
                                <button
                                    onClick={() => onAddOrder(selectedClient.id)}
                                    className="h-12 px-8 bg-white dark:bg-slate-800 border-2 border-primary text-primary hover:bg-primary hover:text-white font-black rounded-[0.85rem] flex items-center gap-3 transition-all text-xs uppercase active:scale-95"
                                >
                                    <span className="material-icons-outlined text-xl">add</span>
                                    Nova Ordem
                                </button>
                                <button
                                    onClick={() => onRemoveClient(selectedClient.id)}
                                    className="h-12 w-12 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all"
                                    title="Excluir Grupo"
                                >
                                    <span className="material-icons-outlined">delete</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <section className="flex-1 animate-in fade-in zoom-in-95 duration-500">
                        <div className="max-w-[1400px] mx-auto bg-white dark:bg-card-dark rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden flex flex-col min-h-[400px]">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Ativo</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Operação</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Cotação</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Preço</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Modo</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Qtd / Base</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Valor</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Financeiro Est.</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Stop</th>
                                            <th className="px-6 py-5 w-14"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {selectedClient.orders.map((order) => (
                                            <OrderRow
                                                key={order.id}
                                                order={order}
                                                onUpdate={(updates) => onUpdateOrder(selectedClient.id, order.id, updates)}
                                                onRemove={() => onRemoveOrder(selectedClient.id, order.id)}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {selectedClient.orders.length === 0 && (
                                <div className="flex-1 flex flex-col items-center justify-center py-24 px-8 text-center bg-gradient-to-b from-white to-slate-50/30 dark:from-card-dark dark:to-background-dark/20">
                                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-inner rotate-3">
                                        <span className="material-icons-outlined text-slate-300 dark:text-slate-600 text-[40px]">assignment_late</span>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 italic text-sm font-black uppercase tracking-widest">
                                        Nenhuma ordem para este cliente.
                                    </p>
                                    <button
                                        onClick={() => onAddOrder(selectedClient.id)}
                                        className="mt-6 flex items-center gap-3 text-primary hover:text-primary-dark font-black text-[11px] transition-all group uppercase tracking-[0.2em] border-b border-primary/20 pb-1"
                                    >
                                        <span className="material-icons-outlined text-lg group-hover:scale-125 transition-transform">add_circle</span>
                                        Adicionar Nova Ordem
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-700">
                    <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-8">
                        <span className="material-icons-outlined text-slate-200 dark:text-slate-800 text-[60px]">group_work</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-4 italic">Bem-vindo à Fila de Disparo</h2>
                    <p className="text-slate-400 dark:text-slate-500 max-w-md font-medium mb-10">
                        Selecione um cliente na barra lateral ou utilize a busca mestre abaixo para carregar a carteira e gerenciar as aprovações.
                    </p>
                    <div className="w-full max-w-lg bg-white dark:bg-card-dark p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl dark:shadow-none">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-4 tracking-[0.2em]">Busca Master no Cadastro</label>
                        <ClientSearch
                            placeholder="Pesquisar por Nome, Conta ou Cod Bolsa..."
                            onSelect={onAddClientFromMaster}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApprovalsLayout;
