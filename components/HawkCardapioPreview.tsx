
import React, { useState, useEffect } from 'react';
// import { GoogleGenerativeAI } from "@google/generative-ai"; // Removed Gemini
import { HawkAsset, HawkTerm, HawkAssetType } from '../types.ts';

interface HawkCardapioPreviewProps {
  assets: HawkAsset[];
  date: string;
  onClose: () => void;
}

const HawkCardapioPreview: React.FC<HawkCardapioPreviewProps> = ({ assets, date, onClose }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSyncingPrices, setIsSyncingPrices] = useState(true);
  const [realtimePrices, setRealtimePrices] = useState<Record<string, number>>({});
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchSources, setSearchSources] = useState<{ title: string, uri: string }[]>([]);

  useEffect(() => {
    fetchRealtimePrices();
  }, [assets]);

  const fetchRealtimePrices = async () => {
    setFetchError(null);
    const CACHE_KEY = 'hawk_price_cache_yahoo';
    const cachedRaw = localStorage.getItem(CACHE_KEY);

    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw);
        const now = Date.now();
        if (now - cached.timestamp < 1000 * 60 * 10) {
          console.log("Using cached prices (Yahoo)");
          setRealtimePrices(cached.prices);
          setIsSyncingPrices(false);
          return;
        }
      } catch (e) {
        localStorage.removeItem(CACHE_KEY);
      }
    }

    setIsSyncingPrices(true);
    console.log("Starting Yahoo Finance Price Fetch (via Proxy)...");

    try {
      const uniqueTickers = Array.from(new Set(assets.map(a => a.ticker))) as string[];
      const priceMap: Record<string, number> = {};
      const failedTickers: string[] = [];

      const promises = uniqueTickers.map(async (ticker: string): Promise<{ symbol: string; failed: boolean; price?: number }> => {
        try {
          const yahooTicker = ticker.endsWith('.SA') ? ticker : `${ticker}.SA`;
          await new Promise(r => setTimeout(r, Math.random() * 500));
          const res = await fetch(`/api/yahoo/v8/finance/chart/${yahooTicker}?interval=1d&range=1d`);
          if (!res.ok) {
            console.warn(`Yahoo Fetch Error for ${ticker}: ${res.status}`);
            return { symbol: ticker, failed: true, price: undefined };
          }
          const data = await res.json();
          const result = data.chart?.result?.[0];
          if (result && result.meta && result.meta.regularMarketPrice) {
            return { symbol: ticker, price: result.meta.regularMarketPrice, failed: false };
          }
        } catch (err) {
          console.warn(`Yahoo Network/Parse Error for ${ticker}`, err);
          return { symbol: ticker, failed: true, price: undefined };
        }
        return { symbol: ticker, failed: true, price: undefined };
      });

      const results = await Promise.all(promises);
      results.forEach(r => {
        if (r && !r.failed && r.price !== undefined) {
          priceMap[r.symbol as string] = r.price;
        } else if (r && r.failed) {
          failedTickers.push(r.symbol as string);
        }
      });

      console.log(`Yahoo success: ${Object.keys(priceMap).length}, Failed: ${failedTickers.length}`);
      setRealtimePrices(priceMap);

      if (Object.keys(priceMap).length > 0) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          prices: priceMap
        }));
      }

      if (failedTickers.length > 0) {
        setFetchError(`Falha em ${failedTickers.length} ativos`);
      }
    } catch (error) {
      console.error("Critical error in Yahoo fetcher:", error);
      setFetchError("Erro Geral Yahoo");
    } finally {
      setIsSyncingPrices(false);
    }
  };

  const calculateMinInvestment = (asset: HawkAsset) => {
    const price = realtimePrices[asset.ticker];
    const effectivePrice = price || asset.price || 35.0;
    const target = 15000;
    const rawQty = target / effectivePrice;
    const roundedQty = Math.floor(rawQty / 100) * 100;
    const minInv = roundedQty * effectivePrice;

    if (minInv <= 0) return { text: 'R$ 0,00', qty: 0 };
    return {
      text: `R$ ${minInv.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      qty: roundedQty,
      isEstimated: !price
    };
  };

  const handleDownloadImage = async () => {
    const element = document.getElementById('printable-cardapio');
    if (!element) return;
    const html2canvasGlobal = (window as any).html2canvas;
    if (!html2canvasGlobal) {
      alert("Ferramenta de captura ainda não carregada. Aguarde um instante.");
      return;
    }

    setIsDownloading(true);
    try {
      // 1. Criar um clone expandido para captura total
      const clone = element.cloneNode(true) as HTMLElement;
      const targetWidth = 1200; // Largura fixa para consistência em HD

      clone.style.position = 'fixed';
      clone.style.top = '0';
      clone.style.left = '-9999px'; // Fora de vista
      clone.style.width = `${targetWidth}px`;
      clone.style.height = 'auto';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.background = 'white';
      clone.style.padding = '60px'; // Respiro extra para qualidade premium
      clone.id = 'printable-cardapio-clone';

      document.body.appendChild(clone);

      // Pequena espera para o browser processar o clone e fontes
      await new Promise(r => setTimeout(r, 400));

      // 2. Capturar em escala 3.0 para Alta Definição (HD)
      const canvas = await html2canvasGlobal(clone, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: targetWidth,
        windowHeight: clone.scrollHeight
      });

      const link = document.createElement('a');
      link.download = `Cardapio_Hawk_${date.replace(/\//g, '-')}_HD.png`;
      link.href = canvas.toDataURL('image/png', 1.0); // Qualidade máxima
      link.click();

      document.body.removeChild(clone);
    } catch (err) {
      console.error("Erro ao gerar imagem HD:", err);
      alert("Erro ao gerar imagem em alta definição.");
    } finally {
      setIsDownloading(false);
    }
  };

  const renderSection = (title: string, type: HawkAssetType, term: HawkTerm) => {
    const filtered = assets.filter(a => a.type === type && a.term === term);
    if (filtered.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="bg-[#1e4d3b] text-white px-3 py-1.5 font-bold text-sm uppercase tracking-tight mb-0.5">
          {title}
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#f4f4f4] text-left border-b border-slate-300">
              <th className="p-2 text-[10px] font-black text-slate-700 uppercase">Ativo</th>
              <th className="p-2 text-[10px] font-black text-slate-700 uppercase">Empresa</th>
              <th className="p-2 text-[10px] font-black text-slate-700 uppercase text-center">Vencimento</th>
              <th className="p-2 text-[10px] font-black text-slate-700 uppercase text-center">Apl. Mínima</th>
              <th className="p-2 text-[10px] font-black text-slate-700 uppercase text-center">Proteção</th>
              <th className="p-2 text-[10px] font-black text-slate-700 uppercase text-center">Taxa Pré</th>
              <th className="p-2 text-[10px] font-black text-slate-700 uppercase text-center">CDI</th>
            </tr>
          </thead>
          <tbody className="text-slate-800">
            {filtered.map((asset, idx) => {
              const calc = calculateMinInvestment(asset);
              return (
                <tr key={asset.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafafa]'}>
                  <td className="p-2 text-xs font-bold border-b border-slate-100">{asset.ticker}</td>
                  <td className="p-2 text-[11px] border-b border-slate-100 italic">{asset.company}</td>
                  <td className="p-2 text-xs text-center border-b border-slate-100">{asset.expiration}</td>
                  <td className="p-2 text-xs text-center border-b border-slate-100 font-black text-[#1e4d3b]">
                    {calc.text}
                    <div className="text-[9px] text-slate-400 font-normal">
                      Lote: {calc.qty} un.
                      {calc.isEstimated && <span className="text-amber-500 ml-1" title="Preço estimado/fallback">*</span>}
                    </div>
                  </td>
                  <td className="p-2 text-xs text-center border-b border-slate-100">{asset.protection}</td>
                  <td className="p-2 text-xs text-center border-b border-slate-100 font-bold">{asset.gain}</td>
                  <td className="p-2 text-[10px] text-center border-b border-slate-100 text-slate-400">{asset.cdiPercent}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-lg shadow-2xl flex flex-col max-h-[95vh]">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Cardápio Safra Hawk</h2>
            {isSyncingPrices && !fetchError && (
              <span className="text-[10px] font-black text-emerald-600 animate-pulse bg-emerald-50 px-3 py-1 rounded-full">
                Sincronizando Yahoo Finance...
              </span>
            )}
            {fetchError && (
              <span className="text-[10px] font-black text-red-600 bg-red-50 px-3 py-1 rounded-full">
                {fetchError} - Usando estimativa
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={handleDownloadImage} disabled={isDownloading || isSyncingPrices} className="bg-emerald-600 text-white px-6 py-2 rounded text-xs font-bold disabled:opacity-50">
              {isDownloading ? 'GERANDO...' : 'DOWNLOAD IMAGEM'}
            </button>
            <button onClick={onClose} className="bg-slate-200 text-slate-600 px-6 py-2 rounded text-xs font-bold">FECHAR</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-12 bg-white" id="printable-cardapio">
          <div className="flex justify-between items-start mb-8 border-b-2 border-[#1e4d3b] pb-4">
            <div>
              <div className="text-2xl font-black text-[#1e4d3b] flex items-center gap-2">
                Safra <span className="font-light italic">Invest</span>
              </div>
              <div className="text-[10px] text-slate-500 font-bold mt-1 uppercase">Taxas válidas para: {date}</div>
            </div>
            <div className="text-3xl font-black text-[#cca36b] tracking-tighter">KAT</div>
          </div>

          {renderSection("Hawk - Prazo 15 dias", "Ação Nacional", "15 dias")}
          {renderSection("Hawk - Prazo 30 dias", "Ação Nacional", "30 dias")}
          {renderSection("Hawk BDR - Prazo 15 dias", "BDR", "15 dias")}
          {renderSection("Hawk BDR - Prazo 30 dias", "BDR", "30 dias")}

          <div className="mt-12 space-y-4">
            <div className="text-[9px] text-slate-400 italic text-center border-t pt-4">
              Cotações em tempo real via Yahoo Finance. Aplicação mínima calculada por lotes de 100 ações.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HawkCardapioPreview;
