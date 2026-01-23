const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const iconv = require('iconv-lite');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CSV_FILE = 'C:\\Users\\Windows\\OneDrive - KAT AGENTE AUTONOMO de INVESTIMENTOS - Eireli\\ANÁLISES DE CARTEIRA\\Analise_de_Performance_SUPABASE.csv';

function normalizeStr(s) {
    return String(s || '').toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");
}

function parseNum(val) {
    if (typeof val === 'number') return val;
    if (val === undefined || val === null || val === '') return 0;

    let clean = String(val).replace('R$', '').replace(/\s/g, '').trim();
    const hasComma = clean.includes(',');
    const hasDot = clean.includes('.');

    if (hasComma && hasDot) {
        const lastComma = clean.lastIndexOf(',');
        const lastDot = clean.lastIndexOf('.');
        if (lastComma > lastDot) {
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else {
            clean = clean.replace(/,/g, '');
        }
    } else if (hasComma) {
        clean = clean.replace(',', '.');
    }

    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
}

async function sync() {
    console.log(`Lendo arquivo: ${CSV_FILE}...`);
    if (!fs.existsSync(CSV_FILE)) {
        throw new Error(`Arquivo não encontrado: ${CSV_FILE}`);
    }

    const buffer = fs.readFileSync(CSV_FILE);

    // Tenta detectar codificação
    let content = buffer.toString('utf8');
    if (content.includes('\ufffd')) {
        console.log("Detectada falha na codificação UTF-8. Usando ISO-8859-1...");
        content = iconv.decode(buffer, 'iso-8859-1');
    }

    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
        throw new Error("O arquivo está vazio ou contém apenas o cabeçalho.");
    }

    const header = lines[0].split(';').map(h => h.trim());
    console.log("Colunas detectadas:", header.join(', '));

    const rawData = lines.slice(1).map((line, idx) => {
        const values = line.split(';');
        const obj = {};
        header.forEach((h, i) => {
            obj[h] = values[i]?.trim();
        });
        return obj;
    });

    console.log(`Processando ${rawData.length} registros...`);

    const normalized = rawData.map(item => {
        // Normalização agressiva para garantir unicidade
        return {
            data: (item.data || '').trim(),
            cod_bolsa: (item.cod_bolsa || '').trim(),
            cliente: (item.cliente || '').trim(),
            papel: (item.papel || '').trim().toUpperCase(),
            cv: (item.cv || '').trim().toUpperCase(),
            qtd_exec: String(parseNum(item.qtd_exec)), // Salva como string mas com formato canônico (ponto)
            prc_medio: String(parseNum(item.prc_medio)),
            status: (item.status || '').trim(),
            data_hora: (item.data_hora || '').trim(),
            volume: String(parseNum(item.volume)),
            liquidacao: (item.liquidacao || '').trim(),
            assessor: (item.assessor || '').trim(),
            especialista: (item.especialista || '').trim(),
            conta: (item.conta || '').trim()
        };
    });

    console.log(`Iniciando sincronização (upsert) de ${normalized.length} registros...`);

    // Inserir em Chunks para evitar limites de payload e timeouts
    const chunkSize = 100;
    for (let i = 0; i < normalized.length; i += chunkSize) {
        const chunk = normalized.slice(i, i + chunkSize);
        console.log(`Sincronizando chunk ${Math.floor(i / chunkSize) + 1} de ${Math.ceil(normalized.length / chunkSize)}...`);

        const { error: insError } = await supabase
            .from('executed_orders')
            .insert(chunk);

        if (insError) {
            console.error("Erro ao sincronizar chunk:", insError.message);
            throw insError;
        }

        // Aguardar um pouco entre os chunks para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log("Sincronização concluída com sucesso!");
}

sync().catch(err => {
    console.error("Erro fatal na sincronização:", err);
    process.exit(1);
});
