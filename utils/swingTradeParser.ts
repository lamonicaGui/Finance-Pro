
import { SwingTradeAsset, SwingTradeStatus, SwingTradeCall } from '../types.ts';

// Helper para carregar scripts dinamicamente (CDN Failover)
const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Falha ao carregar script: ${src}`));
        document.body.appendChild(script);
    });
};

/**
 * Utility to extract Swing Trade data from Safra PDF reports.
 * Bases logic on the standard layout of "Equity Research" documents.
 */

// Retorno estendido para facilitar debug
export interface SwingTradeParseResult {
    assets: SwingTradeAsset[];
    rawText: string;
}

export const parseSwingTradePdf = async (file: File): Promise<SwingTradeParseResult> => {
    // Garantir que a lib está carregada (mesmo padrão do Hawk)
    if (!(window as any).pdfjsLib) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
        await new Promise(r => setTimeout(r, 100));
    }

    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";

        // Percorrer todas as páginas para não perder recomendações
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Ordenar por coordenadas Y (descendente) e depois X (ascendente)
            // Isso garante que o texto seja reconstruído na ordem correta da linha
            const items = (textContent.items as any[]).sort((a, b) => {
                if (Math.abs(a.transform[5] - b.transform[5]) < 2) {
                    return a.transform[4] - b.transform[4];
                }
                return b.transform[5] - a.transform[5];
            });

            const pageText = items.map((item: any) => item.str).join(' ');
            fullText += pageText + " \n ";
        }

        console.log("DEBUG - Texto extraído total (todas as páginas):", fullText.length);

        return {
            assets: extractSwingTradesFromText(fullText),
            rawText: fullText
        };
    } catch (err) {
        console.error("Erro no parser de Swing Trade:", err);
        throw err;
    }
};

const extractSwingTradesFromText = (text: string): SwingTradeAsset[] => {
    const assets: SwingTradeAsset[] = [];

    // Normalização: Remove múltiplas quebras mas mantém um espaço simples
    const normalized = text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();

    console.log("DEBUG - Iniciando extração. Chars:", normalized.length);

    // Identificar blocos de tabela pelos headers exclusivos
    const activeTableStart = normalized.toUpperCase().indexOf("ATIVO CALL ENTRADA OBJETIVO");
    const closedTableStart = normalized.toUpperCase().indexOf("ATIVO CALL INÍCIO ENCERRAMENTO");

    console.log("DEBUG - Localização de Tabelas:", { activeTableStart, closedTableStart });

    /* 
      Regex Refinado para Safra Prospect:
      1. Ticker ([A-Z0-9/]{3,20}) -> Suporta L&S tipo CEAB3/GUAR3
      2. Call (Compra|Venda|L&S)
      3. Entrada ([0-9,.]+)
      4. Alvo ([0-9,.]+)
      5. Ganho ([0-9,.\-+%\s]+%) -> suporta " 10% " ou "7,42%"
      6. Stop ([0-9,.]+)
      7. Perda ([0-9,.\-+%\s]+%) -> suporta "- 6,59%"
      8. Tempo (Diário|Top Picks|Top 5|Semanal|Grafista|Pivô|.*? - limitado para não comer a data)
      9. Data (\d{2}\/\d{2}\/\d{2,4})
    */
    const rowRegex = /([A-Z0-9/]{3,20})\s+(Compra|Venda|L&S)\s+([0-9,.]+)\s+([0-9,.]+)\s+([0-9,.\-+%\s]+%)\s+([0-9,.]+)\s+([0-9,.\-+%\s]+%)\s+(Diário|Top Picks|Top 5|Semanal|Grafista|Pivô|.*?)\s+(\d{2}\/\d{2}\/\d{2,4})/gi;

    let match;
    while ((match = rowRegex.exec(normalized)) !== null) {
        const index = match.index;

        // Filtro: O Ativo precisa estar após o cabeçalho da tabela de ativos e ANTES da tabela de encerrados (se houver)
        if (activeTableStart !== -1 && index < activeTableStart) continue;
        if (closedTableStart !== -1 && index > closedTableStart) continue;

        try {
            assets.push({
                id: Math.random().toString(36).substr(2, 9),
                ticker: match[1].toUpperCase(),
                type: match[2] as SwingTradeCall,
                entryPrice: parseFloat(match[3].replace(/\./g, '').replace(',', '.')),
                targetPrice: parseFloat(match[4].replace(/\./g, '').replace(',', '.')),
                upside: match[5].trim(),
                stopPrice: parseFloat(match[6].replace(/\./g, '').replace(',', '.')),
                downside: match[7].trim(),
                graphTime: match[8].trim(),
                startDate: match[9],
                status: 'Em Aberto'
            });
        } catch (e) {
            console.warn("Erro ao processar linha do match:", match[0], e);
        }
    }

    // Pós-processamento para "Valendo Entrada"
    const seen = new Set();
    const finalAssets = assets.map(asset => {
        // Se já vimos esse ticker antes, a segunda ocorrência costuma ser a da seção "Valendo Entrada"
        if (seen.has(asset.ticker)) {
            return { ...asset, status: 'Valendo Entrada' as SwingTradeStatus };
        }
        seen.add(asset.ticker);
        return asset;
    });

    console.log(`DEBUG - Parser Finalizado. Ativos extraídos: ${finalAssets.length}`);
    return finalAssets;
};
