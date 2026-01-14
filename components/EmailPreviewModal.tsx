
import React from 'react';
import { ClientGroup } from '../types';

interface EmailPreviewModalProps {
  client: ClientGroup;
  onClose: () => void;
  onCopyAndOpen: () => void;
  onSendAPI: () => void;
  isBulk?: boolean;
  isSending?: boolean;
}

const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({ 
  client, 
  onClose, 
  onCopyAndOpen, 
  onSendAPI, 
  isBulk, 
  isSending 
}) => {
  const codId = React.useMemo(() => Math.floor(100000 + Math.random() * 900000), []);
  const subject = `Aprovação de Ordem | CC: ${client.account || '000000'} / COD: ${codId}`;

  const renderTableRows = () => {
    return client.orders.map((order) => (
      `<tr>
        <td style="border: 1px solid #000000; padding: 6px; font-family: Arial; font-size: 12px; text-align: left;">
          ${order.side === 'Venda' ? 'V' : 'C'}
        </td>
        <td style="border: 1px solid #000000; padding: 6px; font-family: Arial; font-size: 12px; font-weight: bold; text-align: left;">
          ${order.value}
        </td>
        <td style="border: 1px solid #000000; padding: 6px; font-family: Arial; font-size: 12px; font-weight: bold; text-align: left;">
          ${order.ticker}
        </td>
        <td style="border: 1px solid #000000; padding: 6px; font-family: Arial; font-size: 12px; text-align: left;">
          ${order.mode === 'Mercado' ? 'MERCADO' : order.orderPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </td>
      </tr>`
    )).join('');
  };

  const fullHtml = `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; background-color: #ffffff;">
      <p style="margin-bottom: 16px;">Prezado ${client.name || 'Cliente'},</p>
      <p style="margin-bottom: 16px;">Conforme conversamos, peço seu ‘de acordo’ para execução das ordens abaixo:</p>
      
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; border: 1px solid #000000; font-family: Arial; font-size: 12px;">
        <thead>
          <tr style="background-color: #f2f2f2; text-align: left;">
            <th style="border: 1px solid #000000; padding: 6px;">Natureza da operação</th>
            <th style="border: 1px solid #000000; padding: 6px;">Quantidade</th>
            <th style="border: 1px solid #000000; padding: 6px;">Ativo</th>
            <th style="border: 1px solid #000000; padding: 6px;">Preço</th>
          </tr>
        </thead>
        <tbody>
          ${renderTableRows()}
        </tbody>
      </table>

      <p style="margin-top: 16px; margin-bottom: 4px;">Aguardo confirmação.</p>
      <p style="margin-top: 0;">Atenciosamente,</p>
      <p style="margin-top: 12px;"><strong>FinancePro Team</strong></p>
    </div>
  `;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600">hub</span>
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-tight">Gerador de Aprovações (Direct API)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 bg-white">
          <div className="mb-4 space-y-1 pb-4 border-b border-slate-100">
            <div className="flex text-xs"><span className="w-20 font-bold text-slate-400">Assunto:</span> <span className="font-semibold text-slate-800">{subject}</span></div>
            <div className="flex text-xs"><span className="w-20 font-bold text-slate-400">Para:</span> <span className="text-blue-600">{client.email}</span></div>
            <div className="flex text-xs"><span className="w-20 font-bold text-slate-400">Cc:</span> <span className="text-slate-600">{client.cc}</span></div>
          </div>

          <div 
            id="outlook-html-content" 
            className="outlook-preview-body"
            dangerouslySetInnerHTML={{ __html: fullHtml }}
          />
        </div>

        <div className="px-6 py-6 bg-slate-50 border-t border-slate-200 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={onSendAPI}
              disabled={isSending}
              className="flex items-center justify-center gap-3 rounded-lg bg-blue-600 px-6 py-4 text-sm font-black text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <span className="material-symbols-outlined animate-spin">sync</span>
              ) : (
                <span className="material-symbols-outlined">send</span>
              )}
              ENVIAR DIRETO (API)
            </button>
            
            <button
              onClick={onCopyAndOpen}
              className="flex items-center justify-center gap-3 rounded-lg bg-slate-800 px-6 py-4 text-sm font-black text-white shadow-lg hover:bg-black active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined">content_paste</span>
              COPIAR E ABRIR
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-white p-2 rounded border border-slate-200">
            <span className="material-symbols-outlined text-[14px]">verified_user</span>
            Segurança Financeira: HTML nativo do Microsoft Outlook
          </div>
        </div>
        
        {isBulk && (
           <div className="px-6 py-2 bg-blue-600 text-white text-[10px] font-black text-center animate-pulse">
            MODO LOTE ATIVO: ENVIANDO SEQUÊNCIA DE CLIENTES VIA API
           </div>
        )}
      </div>
    </div>
  );
};

export default EmailPreviewModal;
