import { HawkAsset } from '../types';

// Helper para carregar scripts dinamicamente
const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve(); // Já existe
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Falha ao carregar script: ${src}`));
        document.body.appendChild(script);
    });
};

export const parsePdf = async (file: File): Promise<HawkAsset[]> => {
    console.log("Iniciando conversão do arquivo (Smart Inject Mode V2):", file.name);

    // Verifica se a lib já está no window
    // @ts-ignore
    if (!window.pdfjsLib) {
        console.log("Biblioteca PDF não encontrada. Injetando vie CDN...");
        try {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
            // Pequeno delay para garantir inicialização
            await new Promise(r => setTimeout(r, 100));
        } catch (e) {
            console.error(e);
            throw new Error("Não foi possível baixar a biblioteca de PDF. Verifique sua internet.");
        }
    }

    // @ts-ignore
    const pdfjsLib = window.pdfjsLib;

    if (!pdfjsLib) {
        throw new Error("Erro crítico: Biblioteca carregou mas não está disponível.");
    }

    // Configura worker se necessário
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    try {
        const arrayBuffer = await file.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        console.log("PDF carregado. Páginas:", pdf.numPages);

        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            // @ts-ignore
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n';
        }

        console.log("Texto extraído com sucesso. Iniciando regex...");
        return extractAssetsFromText(fullText);

    } catch (error) {
        console.error("Erro fatal no parsePdf:", error);
        throw error;
    }
};

const extractAssetsFromText = (text: string): HawkAsset[] => {
    const assets: HawkAsset[] = [];
    const normalized = text.replace(/\s+/g, ' ').trim();

    // Pattern atualizado com base no print do usuário
    const rowRegex = /([A-Z0-9]{4,7})\s+(.*?)\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.,]+%)\s+([\d.,]+%)\s+(?:.*?)\s+([\d.,]+%)\s+(\d+)/g;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let match;
    while ((match = rowRegex.exec(normalized)) !== null) {
        const [_, ticker, company, dateStr, protection, gain, cdi, idPdf] = match;

        const type = ticker.includes('34') ? 'BDR' : 'Ação Nacional';

        // Cálculo do Prazo
        const [day, month, year] = dateStr.split('/').map(Number);
        const expirationDate = new Date(year, month - 1, day);
        expirationDate.setHours(0, 0, 0, 0);

        const diffTime = expirationDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Lógica de classificação: <= 22 dias -> 15 dias, > 22 -> 30 dias
        const term = diffDays > 22 ? '30 dias' : '15 dias';

        assets.push({
            id: idPdf,
            ticker: ticker,
            company: company.trim().substring(0, 30),
            expiration: dateStr,
            protection: protection,
            gain: gain,
            cdiPercent: cdi,
            type: type,
            term: term,
            officeRevenue: '0',
            selected: false,
            price: 0
        });
    }

    console.log(`Finalizado. ${assets.length} ativos encontrados via Regex V2.`);
    return assets;
};
