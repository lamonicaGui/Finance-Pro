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
        <div className="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 min-h-screen flex overflow-hidden w-full font-display">
            {/* Sidebar V2 */}
            <aside className="w-80 bg-card-light dark:bg-card-dark border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-tight italic">
                            Painel de<br />Aprovações
                        </h1>
                        <button
                            onClick={onLogout}
                            className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                            title="Sair"
                        >
                            <span className="material-icons-outlined text-sm">logout</span>
                        </button>
                    </div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Disparo de ordens estruturadas</p>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
                    {/* Quick Actions */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Ações Rápidas</h3>
                        <button
                            onClick={onAddClient}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-primary/[0.02] transition-all text-left group shadow-sm"
                        >
                            <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl group-hover:bg-primary/10 transition-all">
                                <span className="material-icons-outlined text-slate-500 dark:text-slate-400 group-hover:text-primary">person_add</span>
                            </div>
                            <div>
                                <div className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Novo Cliente</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Carteira Vazia</div>
                            </div>
                        </button>

                        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 shadow-inner">
                            <h4 className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase mb-4 tracking-widest">Importar Cadastro</h4>
                            <ClientSearch
                                onSelect={onAddClientFromMaster}
                                placeholder="Nome, Sinacor ou Conta..."
                                className="[&_input]:h-11 [&_input]:rounded-xl [&_input]:border-slate-200 dark:[&_input]:border-slate-700 dark:[&_input]:bg-slate-900 [&_input]:text-xs"
                            />
                        </div>
                    </div>

                    {/* Shooting Queue */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 flex justify-between">
                            Fila de Disparo
                            <span className="text-primary">{clients.length} Grupos</span>
                        </h3>

                        <div className="space-y-2">
                            {clients.map(client => (
                                <button
                                    key={client.id}
                                    onClick={() => onSelectClient(client.id)}
                                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left shadow-sm ${selectedClientId === client.id
                                            ? 'bg-primary/10 border-primary text-primary shadow-primary/5'
                                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="material-icons-outlined text-[18px]">
                                            {client.orders.length > 0 ? 'layers' : 'person'}
                                        </span>
                                        <div>
                                            <div className={`text-[11px] font-black uppercase tracking-tighter line-clamp-1 ${selectedClientId === client.id ? 'text-primary' : 'text-slate-800 dark:text-slate-200'}`}>
                                                {client.name || 'Sem Nome'}
                                            </div>
                                            <div className="text-[9px] font-bold opacity-70 uppercase tracking-widest">
                                                {client.account || '---'} {client.orders.length > 0 && `| ${client.orders.length} ordens`}
                                            </div>
                                        </div>
                                    </div>
                                    {client.orders.length > 0 && (
                                        <span className={`h-1.5 w-1.5 rounded-full ${selectedClientId === client.id ? 'bg-primary animate-pulse' : 'bg-emerald-500'}`}></span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Navigation Sub-menu */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 mb-2">Outros Módulos</h3>
                        <button onClick={() => onSwitchTab('laminas')} className="w-full flex items-center gap-3 p-2.5 rounded-xl text-slate-500 hover:text-primary hover:bg-primary/5 transition-all text-left">
                            <span className="material-icons-outlined text-lg">description</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Gerador de Lâminas</span>
                        </button>
                        <button onClick={() => onSwitchTab('swing-trade')} className="w-full flex items-center gap-3 p-2.5 rounded-xl text-slate-500 hover:text-primary hover:bg-primary/5 transition-all text-left">
                            <span className="material-icons-outlined text-lg">trending_up</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Swing Trade</span>
                        </button>
                        {userProfile?.role === 'adm' && (
                            <button onClick={() => onSwitchTab('gestao-usuarios')} className="w-full flex items-center gap-3 p-2.5 rounded-xl text-slate-500 hover:text-primary hover:bg-primary/5 transition-all text-left">
                                <span className="material-icons-outlined text-lg">admin_panel_settings</span>
                                <span className="text-[10px] font-black uppercase tracking-widest">Gestão de Usuários</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                    <button
                        onClick={onSendAll}
                        className="w-full bg-slate-900 border border-slate-800 dark:bg-primary hover:bg-black dark:hover:bg-primary-dark text-primary dark:text-white font-black py-4 px-6 rounded-[1.25rem] flex items-center justify-center gap-3 transition-all shadow-xl shadow-primary/10 active:scale-95 group"
                    >
                        <span className="material-icons-outlined text-lg group-hover:rotate-12 transition-transform">rocket_launch</span>
                        <span className="text-xs uppercase tracking-[0.2em]">Disparar Lote (API)</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-[#fdfdfd] dark:bg-background-dark">
                {selectedClient ? (
                    <>
                        <header className="bg-white/80 dark:bg-card-dark/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 p-8 sticky top-0 z-10 shadow-sm transition-all duration-300">
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
                        </header>

                        <section className="flex-1 p-8">
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
                    <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                        <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-8">
                            <span className="material-icons-outlined text-slate-200 dark:text-slate-800 text-[60px]">group_work</span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-4">Bem-vindo à Fila de Disparo</h2>
                        <p className="text-slate-400 dark:text-slate-500 max-w-md font-medium">
                            Selecione um cliente na barra lateral para carregar a carteira e gerenciar as aprovações de ordens estruturadas.
                        </p>
                    </div>
                )}

                <footer className="p-8 pt-0">
                    <div className="max-w-[1400px] mx-auto bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-2xl p-5 flex items-center gap-4 animate-pulse">
                        <span className="material-icons-outlined text-primary text-xl">info</span>
                        <p className="text-[11px] font-black text-emerald-800 dark:text-primary uppercase tracking-widest leading-relaxed">
                            DICA: Para lotes volumosos (50+ ordens), utilize o <strong>Disparo via API</strong> para maior velocidade de execução.
                        </p>
                    </div>
                </footer>
            </main>

            {/* Dark Mode Toggle */}
            <button
                className="fixed bottom-10 right-10 h-12 w-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 transition-all active:scale-95 group z-50"
                onClick={() => document.documentElement.classList.toggle('dark')}
            >
                <span className="material-icons-outlined text-slate-600 dark:text-slate-400 group-hover:text-primary">dark_mode</span>
            </button>
        </div>
    );
};

export default ApprovalsLayout;
