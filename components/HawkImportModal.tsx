
import React, { useState, useMemo } from 'react';
import { HawkAsset } from '../types.ts';

interface HawkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedAssets: HawkAsset[]) => void;
  rawAssets: HawkAsset[];
}

const HawkImportModal: React.FC<HawkImportModalProps> = ({ isOpen, onClose, onConfirm, rawAssets }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    search: '',
    category: 'Todas', // Todas, Hawk 15, Hawk 30
    gainMin: 0,
    gainMax: 100,
    protMin: 0,
    protMax: 100
  });

  const parseNum = (val: string | undefined) => {
    if (!val) return 0;
    const clean = val.replace('%', '').replace(',', '.').trim();
    return parseFloat(clean) || 0;
  };

  const filteredAssets = useMemo(() => {
    return rawAssets.filter(asset => {
      const matchSearch = !filters.search ||
        asset.ticker.toLowerCase().includes(filters.search.toLowerCase()) ||
        asset.company.toLowerCase().includes(filters.search.toLowerCase());

      const matchCategory = filters.category === 'Todas' ||
        (filters.category === 'Hawk 15' && asset.term === '15 dias') ||
        (filters.category === 'Hawk 30' && asset.term === '30 dias');

      const gain = parseNum(asset.gain);
      const prot = parseNum(asset.protection);

      const matchGain = gain >= filters.gainMin && gain <= filters.gainMax;
      const matchProt = prot >= filters.protMin && prot <= filters.protMax;

      return matchSearch && matchCategory && matchGain && matchProt;
    });
  }, [rawAssets, filters]);

  const toggleAsset = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectFiltered = () => {
    const newSet = new Set(selectedIds);
    filteredAssets.forEach(a => newSet.add(a.id));
    setSelectedIds(newSet);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[#f8f9fa] w-full max-w-5xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 font-sans">

        {/* Header Styles */}
        <div className="px-8 py-6 bg-white border-b border-slate-100 flex justify-between items-start">
          <h2 className="text-xl font-bold text-slate-800">Selecione os produtos para o cardápio</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Filters Area */}
        <div className="p-8 bg-white border-b border-slate-100 space-y-6">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
            <input
              type="text"
              placeholder="Buscar por ativo ou empresa..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none text-slate-700"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-500 text-white p-1.5 rounded-md shadow-sm hover:bg-emerald-600 transition-colors">
              <span className="material-symbols-outlined text-sm">filter_list</span>
            </button>
          </div>

          {/* Advanced Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="col-span-3 space-y-2">
              <label className="text-xs font-bold text-slate-600 ml-1">Categoria</label>
              <select
                value={filters.category}
                onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option>Todas</option>
                <option>Hawk 15</option>
                <option>Hawk 30</option>
              </select>
            </div>

            <div className="col-span-3 space-y-2">
              <label className="text-xs font-bold text-slate-600 ml-1">Ticker / Empresa</label>
              <input
                type="text"
                placeholder="Digite o ticker..."
                value={filters.search} // Redundante visualmente com a barra grande, mas pedido no layout
                readOnly
                className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
              />
            </div>

            <div className="col-span-3 space-y-2">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-slate-600 ml-1">Taxa (Ganho)</label>
              </div>
              <div className="flex gap-2 items-center">
                <input type="number" value={filters.gainMin} onChange={e => setFilters(f => ({ ...f, gainMin: Number(e.target.value) }))} className="w-20 p-2 text-center rounded-lg border border-slate-200 bg-white text-slate-700 font-bold" />
                <span className="text-slate-400">-</span>
                <input type="number" value={filters.gainMax} onChange={e => setFilters(f => ({ ...f, gainMax: Number(e.target.value) }))} className="w-20 p-2 text-center rounded-lg border border-slate-200 bg-white text-slate-700 font-bold" />
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 bg-emerald-500 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div className="col-span-3 space-y-2">
              <div className="flex justify-between">
                <label className="text-xs font-bold text-slate-600 ml-1">Proteção</label>
              </div>
              <div className="flex gap-2 items-center">
                <input type="number" value={filters.protMin} onChange={e => setFilters(f => ({ ...f, protMin: Number(e.target.value) }))} className="w-20 p-2 text-center rounded-lg border border-slate-200 bg-white text-slate-700 font-bold" />
                <span className="text-slate-400">-</span>
                <input type="number" value={filters.protMax} onChange={e => setFilters(f => ({ ...f, protMax: Number(e.target.value) }))} className="w-20 p-2 text-center rounded-lg border border-slate-200 bg-white text-slate-700 font-bold" />
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                <div className="absolute left-0 top-0 bottom-0 bg-emerald-500 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* List Stats & Action */}
        <div className="bg-white px-8 py-4 flex justify-between items-center border-b border-slate-50">
          <span className="text-sm font-medium text-slate-500">{selectedIds.size} de {rawAssets.length} selecionados</span>
          <button onClick={selectFiltered} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">
            Selecionar filtrados
          </button>
        </div>

        {/* Scrollable List Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-3">
          {filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300">
              <span className="material-symbols-outlined text-4xl mb-2">sentiment_dissatisfied</span>
              <span className="font-bold">Nenhum ativo encontrado</span>
            </div>
          ) : (
            filteredAssets.map(asset => (
              <div
                key={asset.id}
                onClick={() => toggleAsset(asset.id)}
                className={`group bg-white rounded-xl p-4 border transition-all cursor-pointer flex items-center justify-between
                            ${selectedIds.has(asset.id)
                    ? 'border-emerald-500 ring-1 ring-emerald-500 shadow-md'
                    : 'border-slate-200 hover:border-emerald-300 hover:shadow-sm'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                                ${selectedIds.has(asset.id) ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 group-hover:border-emerald-400'}`}>
                    {selectedIds.has(asset.id) && <span className="material-symbols-outlined text-white text-sm font-bold">check</span>}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-slate-800 text-lg">{asset.ticker}</span>
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase border border-slate-200">
                        Hawk Strategy {asset.term === '15 dias' ? '15 Dias' : '30 Dias'}
                      </span>
                    </div>
                    <span className="text-sm text-slate-400 font-medium block mt-0.5">{asset.company}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-emerald-500 font-black text-sm">{asset.gain} ganho</div>
                  <div className="text-slate-600 font-bold text-xs mt-0.5">{asset.protection} proteção</div>
                  <div className="text-slate-400 text-[10px] mt-1 font-medium">{asset.expiration}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Actions */}
        <div className="bg-white p-6 border-t border-slate-100 flex justify-end gap-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-lg border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(rawAssets.filter(a => selectedIds.has(a.id)))}
            disabled={selectedIds.size === 0}
            className="bg-[#78cfa8] hover:bg-[#5bb88d] text-white px-8 py-3 rounded-lg font-bold text-sm shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
          >
            Importar {selectedIds.size} produto(s)
          </button>
        </div>

      </div>
    </div>
  );
};

export default HawkImportModal;
