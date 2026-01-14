
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

        // Extração unificada p/ evitar quebras de palavras (Pág 1)
        const page = await pdf.getPage(1);
        const textContent = await page.getTextContent();

        // Juntar itens com espaço (igual ao Hawk que funciona)
        const rawText = textContent.items.map((item: any) => item.str).join(' ');

        return {
            assets: extractSwingTradesFromText(rawText),
            rawText: rawText
        };
    } catch (err) {
        console.error("Erro no parser de Swing Trade:", err);
        throw err;
    }
};

const extractSwingTradesFromText = (text: string): SwingTradeAsset[] => {
    const assets: SwingTradeAsset[] = [];

    // Normalização: Remove quebras mas mantém espaços simples para não quebrar "Top 5"
    const normalized = text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();

    console.log("DEBUG - Iniciando extração. Chars:", normalized.length);

    // Identificar blocos de tabela pelos headers exclusivos
    const activeHeader = "ATIVO CALL ENTRADA OBJETIVO GANHO POTENCIAL STOP PERDA POTENCIAL TEMPO GRÁFICO INÍCIO";
    const closedHeader = "ATIVO CALL INÍCIO ENCERRAMENTO PREÇO DE ENTRADA PREÇO DE ENCERRAMENTO RETORNO DO CALL TEMPO GRÁFICO";

    const activeTableStart = normalized.toUpperCase().indexOf("ATIVO CALL ENTRADA OBJETIVO");
    const closedTableStart = normalized.toUpperCase().indexOf("ATIVO CALL INÍCIO ENCERRAMENTO");

    console.log("DEBUG - Localização de Tabelas:", { activeTableStart, closedTableStart });

    /* 
      Regex Refinado para Safra Prospect:
      1. Ticker ([A-Z0-9/]+)
      2. Call (Compra|Venda|L&S)
      3. Entrada ([0-9,.]+)
      4. Alvo ([0-9,.]+)
      5. Ganho ([0-9,.\-+%\s]+%) -> suporta " 10% " ou "7,42%"
      6. Stop ([0-9,.]+)
      7. Perda ([0-9,.\-+%\s]+%) -> suporta "- 6,59%"
      8. Tempo (.*?) -> captura "Top 5", "Diário", etc
      9. Data (\d{2}\/\d{2}\/\d{2,4})
    */
    const rowRegex = /([A-Z0-9/]{3,15})\s+(Compra|Venda|L&S)\s+([0-9,.]+)\s+([0-9,.]+)\s+([0-9,.\-+%\s]+%)\s+([0-9,.]+)\s+([0-9,.\-+%\s]+%)\s+(.*?)\s+(\d{2}\/\d{2}\/\d{2,4})/gi;

    let match;
    while ((match = rowRegex.exec(normalized)) !== null) {
        const index = match.index;

        // Filtro: O Ativo precisa estar após o cabeçalho da tabela de ativos e ANTES da tabela de encerrados (se houver)
        if (activeTableStart !== -1 && index < activeTableStart) continue;
        if (closedTableStart !== -1 && index > closedTableStart) continue;

        // Tentar identificar se é "Valendo Entrada" por proximidade de texto (opcional e difícil se tudo estiver no topo)
        // Por padrão, Safra repete ativos em 'Valendo Entrada' no PDF. Se o usuário quiser filtrar, ele vê na tabela.
        // Vamos checar se o marcador de "Valendo Entrada" existe e se o ativo está próximo a ele no texto visual (difícil aqui).
        // Decisão: Marcar como "Em Aberto" e deixar o usuário ver o repetido ou usar heurística simples.

        // Heurística: No Safra, "Valendo Entrada" costuma vir DEPOIS de "Em Aberto".
        // Mas no texto extraído via PDF.js, isso pode variar. 
        // Vamos ver se o ticker aparece em uma lista de strings pequena logo após o marcador.

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
            status: 'Em Aberto' // Default, será refinado se aparecer duplicado ou em seção específica
        });
    }

    // Pós-processamento para "Valendo Entrada"
    // Se um ativo aparece duplicado, a segunda ocorrência costuma ser a da seção seguinte (Valendo Entrada)
    const seen = new Set();
    const finalAssets = assets.map(asset => {
        if (seen.has(asset.ticker)) {
            return { ...asset, status: 'Valendo Entrada' as SwingTradeStatus };
        }
        seen.add(asset.ticker);
        return asset;
    });

    console.log(`DEBUG - Parser Finalizado. Ativos extraídos: ${finalAssets.length}`);
    return finalAssets;
};
