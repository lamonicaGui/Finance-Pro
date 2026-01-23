const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const iconv = require('iconv-lite');

const supabaseUrl = 'https://fyeldouakxxjowgebzck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWxkb3Vha3h4am93Z2ViemNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg0NzUsImV4cCI6MjA4MzQ5NDQ3NX0.Tmx5RNi5l4hgHFU5DXLyxLc2uW-jRYagtSMSTLJjLwM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CSV_FILE = 'posicoes_em_aberto.csv';

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

    if (!hasComma && hasDot) {
        return parseFloat(clean) || 0;
    }

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
    console.log(`Lendo ${CSV_FILE}...`);
    const buffer = fs.readFileSync(CSV_FILE);

    // Tenta detectar codificação
    let content = buffer.toString('utf8');
    if (content.includes('\ufffd')) {
        console.log("Detectada falha na codificação UTF-8. Usando ISO-8859-1...");
        content = iconv.decode(buffer, 'iso-8859-1');
    }

    const lines = content.split(/\r?\n/).filter(line => line.trim());
    const header = lines[0].split(';');
    const rawData = lines.slice(1).map(line => {
        const values = line.split(';');
        const obj = {};
        header.forEach((h, i) => {
            obj[h.trim()] = values[i]?.trim();
        });
        return obj;
    });

    console.log(`Processando ${rawData.length} registros...`);

    const normalized = rawData.map(item => {
        const itemKeys = Object.keys(item);
        const getRaw = (aliases) => {
            const normalizedAliases = aliases.map(a => normalizeStr(a));
            const exactKey = itemKeys.find(ik => normalizedAliases.includes(normalizeStr(ik)));
            if (exactKey !== undefined) return item[exactKey];
            return undefined;
        };

        const ativo = String(getRaw(['ativo', 'papel', 'ticker', 'symbol']) || '').trim().toUpperCase();
        const cliente = String(getRaw(['cliente_nome', 'cliente', 'nome']) || '').trim();
        let conta = String(getRaw(['conta', 'account', 'cta']) || '').trim();
        if (conta.endsWith('.0')) conta = conta.substring(0, conta.length - 2);

        const qtd = parseNum(getRaw(['Qtd', 'quantidade', 'quantity']));
        const pm = parseNum(getRaw(['preco_medio', 'pm', 'price']));

        return {
            ativo,
            cliente_nome: cliente,
            conta: conta,
            Qtd: qtd,
            preco_medio: pm
        };
    }).filter(p => p.ativo && p.Qtd !== 0);

    console.log(`Sincronizando ${normalized.length} registros com o banco...`);

    // 1. Limpar Base
    const { error: rpcError } = await supabase.rpc('truncate_open_positions');
    if (rpcError) {
        console.warn("Falha no RPC, tentando delete fallback...");
        const { error: delError } = await supabase.from('open_positions').delete().neq('ativo', 'TRUNCATE_PLACEHOLDER');
        if (delError) throw delError;
    }

    // 2. Inserir em Chunks
    const chunkSize = 500;
    for (let i = 0; i < normalized.length; i += chunkSize) {
        const chunk = normalized.slice(i, i + chunkSize);
        console.log(`Inserindo chunk ${i / chunkSize + 1} (${chunk.length} registros)...`);
        const { error: insError } = await supabase.from('open_positions').insert(chunk);
        if (insError) throw insError;
    }

    console.log("Sincronização concluída com sucesso!");
}

sync().catch(err => {
    console.error("Erro na sincronização:", err);
    process.exit(1);
});
