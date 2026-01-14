
import React from 'react';
import { ClientGroup as ClientGroupType, OrderItem } from '../types.ts';
import OrderRow from './OrderRow.tsx';
import ClientSearch from './ClientSearch.tsx';

interface ClientGroupProps {
  client: ClientGroupType;
  onUpdateClient: (updates: Partial<ClientGroupType>) => void;
  onRemoveClient: () => void;
  onAddOrder: () => void;
  onUpdateOrder: (orderId: string, updates: Partial<OrderItem>) => void;
  onRemoveOrder: (orderId: string) => void;
  onSendEmail: () => void;
}

const ClientGroup: React.FC<ClientGroupProps> = ({
  client,
  onUpdateClient,
  onRemoveClient,
  onAddOrder,
  onUpdateOrder,
  onRemoveOrder,
  onSendEmail
}) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
      <div className="flex flex-col justify-between gap-4 bg-slate-50/50 px-6 py-4 border-b border-slate-100">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary-dark font-bold">
              <span className="material-symbols-outlined">person</span>
            </div>
            <div className="relative w-full md:w-48">
              <label className="text-[10px] uppercase font-black text-slate-400 block mb-1 tracking-tighter">Busca Rápida (Nome, Sinacor ou Conta)</label>
              <ClientSearch
                placeholder="Pesquisar..."
                onSelect={(selected) => {
                  onUpdateClient({
                    account: selected["Conta"].toString(),
                    name: selected["Cliente"],
                    email: selected["Email Cliente"] || '',
                    cc: selected["Email Assessor"] || ''
                  });
                }}
              />
            </div>
            <div className="relative w-full md:w-32">
              <label className="text-[10px] uppercase font-black text-slate-400 block mb-1 tracking-tighter">Conta</label>
              <input
                className="block w-full rounded-lg border-slate-300 py-1.5 px-3 text-slate-900 shadow-sm focus:ring-2 focus:ring-primary sm:text-sm font-mono font-medium"
                placeholder="Ex: 310738"
                type="text"
                value={client.account}
                onChange={(e) => onUpdateClient({ account: e.target.value })}
              />
            </div>
            <div className="relative w-full md:flex-1 md:max-w-xs">
              <label className="text-[10px] uppercase font-black text-slate-400 block mb-1 tracking-tighter">Nome do Cliente</label>
              <input
                className="block w-full rounded-lg border-slate-300 py-1.5 px-3 text-slate-900 shadow-sm focus:ring-2 focus:ring-primary sm:text-sm font-medium"
                placeholder="Ex: Alberto Khafif"
                type="text"
                value={client.name}
                onChange={(e) => onUpdateClient({ name: e.target.value })}
              />
            </div>
            <div className="relative w-full md:flex-1 md:max-w-xs">
              <label className="text-[10px] uppercase font-black text-slate-400 block mb-1 tracking-tighter">Para (E-mail)</label>
              <input
                className="block w-full rounded-lg border-slate-300 py-1.5 px-3 text-slate-900 shadow-sm focus:ring-2 focus:ring-primary sm:text-sm"
                placeholder="email@exemplo.com"
                type="email"
                value={client.email || ''}
                onChange={(e) => onUpdateClient({ email: e.target.value })}
              />
            </div>
            <div className="relative w-full md:flex-1 md:max-w-xs">
              <label className="text-[10px] uppercase font-black text-slate-400 block mb-1 tracking-tighter">Cc (Cópia)</label>
              <input
                className="block w-full rounded-lg border-slate-300 py-1.5 px-3 text-slate-900 shadow-sm focus:ring-2 focus:ring-primary sm:text-sm"
                placeholder="copia@exemplo.com"
                type="text"
                value={client.cc || ''}
                onChange={(e) => onUpdateClient({ cc: e.target.value })}
              />
            </div>
            <div className="flex items-end gap-2 self-end h-[54px] pb-1">
              <button
                onClick={onSendEmail}
                title="Gerar e-mail para este cliente"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-dark px-4 py-2 text-sm font-black text-white shadow-sm hover:brightness-110 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">mail</span>
                Enviar
              </button>
              <button
                onClick={onAddOrder}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-black text-primary-dark shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Ordem
              </button>
              <button
                onClick={onRemoveClient}
                className="rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50/80 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-6 py-4 min-w-[120px]">Ativo</th>
              <th className="px-6 py-4 min-w-[130px]">Tipo</th>
              <th className="px-6 py-4 min-w-[100px]">Cotação</th>
              <th className="px-6 py-4 min-w-[120px]">Preço</th>
              <th className="px-6 py-4 min-w-[180px]">Modo</th>
              <th className="px-6 py-4 min-w-[140px]">Qtd / Base</th>
              <th className="px-6 py-4 min-w-[120px]">Valor</th>
              <th className="px-6 py-4 min-w-[140px]">Financeiro</th>
              <th className="px-6 py-4 min-w-[120px] text-center">Stop</th>
              <th className="px-6 py-4 w-[60px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {client.orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                onUpdate={(updates) => onUpdateOrder(order.id, updates)}
                onRemove={() => onRemoveOrder(order.id)}
              />
            ))}
            {client.orders.length === 0 && (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-slate-400 italic">
                  Nenhuma ordem adicionada para este cliente.
                </td>
              </tr>
            )}
            <tr
              onClick={onAddOrder}
              className="group cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <td className="px-6 py-4" colSpan={10}>
                <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-wider group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                  <span>Adicionar Novo Ativo</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientGroup;
