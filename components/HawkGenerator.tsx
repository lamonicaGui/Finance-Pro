
import React, { useState, useRef } from 'react';
import { HawkAsset, HawkTerm, HawkAssetType } from '../types.ts';
import HawkCardapioPreview from './HawkCardapioPreview.tsx';
import HawkImportModal from './HawkImportModal.tsx';
import HawkLaminaPreview from './HawkLaminaPreview.tsx';
import HawkOrderModal from './HawkOrderModal.tsx';
// Static import to avoid dynamic module resolution issues
import { parsePdf } from '../utils/pdfParser';

const HawkGenerator: React.FC = () => {
  const [assets, setAssets] = useState<HawkAsset[]>(() => {
    // Carrega do localStorage na inicialização
    const saved = localStorage.getItem('hawk_assets');
    return saved ? JSON.parse(saved) : [];
  });
  const [importedRaw, setImportedRaw] = useState<HawkAsset[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedAssetForLamina, setSelectedAssetForLamina] = useState<HawkAsset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persiste assets sempre que mudar
  React.useEffect(() => {
    localStorage.setItem('hawk_assets', JSON.stringify(assets));
  }, [assets]);

  const today = new Date();
  const validDate = today.toLocaleDateString('pt-BR');

  const processPdfWithIA = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert("Arquivo muito grande. Tente um PDF de até 10MB.");
      return;
    }

    setIsProcessing(true);
    setProcessProgress(10);
    setImportedRaw([]);

    try {
      setProcessProgress(30);

      // Direct call to the statically imported parser
      const extractedAssets = await parsePdf(file);
      setProcessProgress(80);

      if (extractedAssets.length === 0) {
        throw new Error("Nenhum ativo identificado no PDF. Verifique se o arquivo é um relatório válido de Estruturadas.");
      }

      setImportedRaw(extractedAssets);
      setProcessProgress(100);

      setTimeout(() => {
        setIsProcessing(false);
        setShowImportModal(true);
        setProcessProgress(0);
      }, 500);

    } catch (error: any) {
      console.error("Hawk System Failure:", error);
      alert(`Erro ao processar PDF: ${error.message}`);
      setIsProcessing(false);
      setProcessProgress(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      processPdfWithIA(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleConfirmImport = (selected: HawkAsset[]) => {
    // Substitui a lista atual pelos novos importados (conforme solicitado: "manter até novos serem importados")
    setAssets(selected);
    setShowImportModal(false);
  };

  const renderTable = (type: HawkAssetType, term: HawkTerm, title: string) => {
    const filtered = assets.filter(a => a.type === type && a.term === term);
    if (filtered.length === 0) return null;

    return (
      <div className="mb-12 border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl bg-white animate-in slide-in-from-bottom-4 duration-500">
        <div className={`px-10 py-7 flex justify-between items-center border-b ${type === 'BDR' ? 'bg-[#002041]' : 'bg-[#102218]'}`}>
          <div className="flex items-center gap-4">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_#13ec6d]"></span>
            <h3 className="text-white font-black text-sm uppercase tracking-[0.2em]">{title}</h3>
          </div>
          <span className="bg-white/10 text-white px-5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">{filtered.length} Ativos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
              <tr>
                <th className="px-6 py-6 w-10 text-center">Sel.</th>
                <th className="px-6 py-6">ID</th>
                <th className="px-6 py-6">Ativo</th>
                <th className="px-6 py-6">Empresa</th>
                <th className="px-6 py-6 text-center">Vencimento</th>
                <th className="px-6 py-6 text-center">Proteção</th>
                <th className="px-6 py-6 text-center">Ganho</th>
                <th className="px-6 py-6 text-center">% CDI</th>
                <th className="px-10 py-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(asset => (
                <tr key={asset.id} className={`${asset.selected ? 'bg-emerald-50 content-highlight' : 'bg-white'} hover:bg-slate-50/80 transition-all border-l-4 ${asset.selected ? 'border-primary' : 'border-transparent'}`}>
                  <td className="px-6 py-6 text-center">
                    <input
                      type="checkbox"
                      checked={asset.selected}
                      onChange={() => setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, selected: !a.selected } : a))}
                      className="w-6 h-6 rounded-lg border-slate-300 text-primary focus:ring-primary cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-6 font-mono text-[10px] font-bold text-slate-400 select-all">{asset.id}</td>
                  <td className="px-6 py-6 font-black text-slate-900 text-lg tracking-tighter">{asset.ticker}</td>
                  <td className="px-6 py-6 font-bold text-slate-400 text-xs italic truncate max-w-[180px]">{asset.company}</td>
                  <td className="px-6 py-6 text-center font-black text-slate-600">{asset.expiration}</td>
                  <td className="px-6 py-6 text-center font-black text-slate-800">{asset.protection}</td>
                  <td className="px-6 py-6 text-center font-black text-emerald-600 text-lg">{asset.gain}</td>
                  <td className="px-6 py-6 text-center font-black text-slate-400 text-[11px]">{asset.cdiPercent}</td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <button onClick={() => setSelectedAssetForLamina(asset)} className="bg-white border border-slate-200 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:border-[#102218] hover:text-[#102218] transition-all shadow-sm">Lâmina</button>
                      <button onClick={() => setAssets(prev => prev.filter(a => a.id !== asset.id))} className="text-slate-300 hover:text-red-500 transition-colors">
                        <span className="material-symbols-outlined text-[24px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-700">
      <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      {/* OVERLAY DE CARREGAMENTO */}
      {isProcessing && (
        <div className="fixed inset-0 z-[300] bg-[#102218]/98 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-white">
          <div className="w-full max-w-md space-y-12 text-center">
            <div className="relative inline-block">
              <div className="w-40 h-40 border-[10px] border-white/5 border-t-primary rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-6xl animate-pulse drop-shadow-[0_0_15px_#13ec6d]">bolt</span>
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-black uppercase tracking-tighter">Hawk System</h2>
              <p className="text-primary/50 font-black text-[10px] uppercase tracking-[0.5em] animate-pulse">Injetando tabelas no motor Safra...</p>
            </div>
            <div className="w-full space-y-4">
              <div className="flex justify-between text-[11px] font-black text-white/40 uppercase tracking-widest">
                <span>Extração Crítica</span>
                <span>{processProgress}%</span>
              </div>
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-primary shadow-[0_0_25px_#13ec6d] transition-all duration-700 ease-in-out rounded-full"
                  style={{ width: `${processProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
        <div>
          <h1 className="text-6xl font-black text-[#102218] tracking-tighter">Hawk Strategy</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className="bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">security</span>
              Engine Ativo v2.5
            </span>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-[#102218] px-10 py-5 rounded-[2rem] text-[11px] font-black text-primary shadow-2xl hover:scale-105 transition-all uppercase tracking-[0.2em] flex items-center gap-3"
          >
            <span className="material-symbols-outlined">upload_file</span>
            Importar PDF
          </button>
          <button
            disabled={assets.length === 0}
            onClick={() => setShowPreview(true)}
            className="bg-white border-2 border-slate-200 px-10 py-5 rounded-[2rem] text-[11px] font-black text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition-all uppercase tracking-[0.2em]"
          >
            Gerar Cardápio
          </button>
          <button
            disabled={!assets.some(a => a.selected)}
            onClick={() => setShowOrderModal(true)}
            className="bg-primary px-10 py-5 rounded-[2rem] text-[11px] font-black text-[#102218] shadow-2xl hover:scale-105 disabled:opacity-30 disabled:scale-100 transition-all uppercase tracking-[0.2em] flex items-center gap-3"
          >
            <span className="material-symbols-outlined">send</span>
            Enviar Ordem
          </button>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="py-64 bg-white rounded-[4rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center shadow-inner group cursor-pointer hover:bg-slate-50/50 transition-all" onClick={() => fileInputRef.current?.click()}>
          <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-8 border border-slate-100 group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-6xl text-slate-200 group-hover:text-primary transition-colors">description</span>
          </div>
          <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em] italic group-hover:text-slate-600 transition-colors">Selecione o PDF de Estruturadas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {renderTable("Ação Nacional", "15 dias", "Ações - 15 Dias")}
          {renderTable("Ação Nacional", "30 dias", "Ações - 30 Dias")}
          {renderTable("BDR", "15 dias", "BDRs Estruturados - 15 Dias")}
          {renderTable("BDR", "30 dias", "BDRs Estruturados - 30 Dias")}
        </div>
      )}

      {showPreview && <HawkCardapioPreview assets={assets} date={validDate} onClose={() => setShowPreview(false)} />}
      {selectedAssetForLamina && <HawkLaminaPreview asset={selectedAssetForLamina} onClose={() => setSelectedAssetForLamina(null)} />}
      <HawkImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onConfirm={handleConfirmImport} rawAssets={importedRaw} />
      {showOrderModal && (
        <HawkOrderModal
          selectedAssets={assets.filter(a => a.selected)}
          allAssets={assets}
          onClose={() => setShowOrderModal(false)}
        />
      )}
    </div>
  );
};

export default HawkGenerator;
