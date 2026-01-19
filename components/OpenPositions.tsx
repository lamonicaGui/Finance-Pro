
import React, { useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import ClientSearch from './ClientSearch';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface Client {
    "Cod Bolsa": string;
    "Cliente": string;
    "Conta": string;
    "Email Cliente"?: string;
    "Email Assessor"?: string;
}

interface OpenPosition {
    id: any;
    ativo: string;
    conta: string;
    preco_medio: any;
    cliente_nome: string;
    qtd?: any;
    Qtd?: any;
}

interface QuoteData {
    price: number;
    change: number;
    changePercent: number;
}

const OpenPositions: React.FC = () => {
    const [positions, setPositions] = useState<OpenPosition[]>([]);
    const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const normalizeStr = (s: string) =>
        String(s || '').toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "");

    const parseNum = (val: any): number => {
        if (typeof val === 'number') return val;
        if (val === undefined || val === null || val === '') return 0;

        let clean = String(val).replace('R$', '').replace(/\s/g, '').trim();

        // Se o valor já está no formato americano (123.45) e não tem vírgulas, é um decimal direto
        const hasComma = clean.includes(',');
        const hasDot = clean.includes('.');

        if (!hasComma && hasDot) {
            // Pode ser 1.000 (mil) ou 1.23 (decimal)
            // Sinacor costuma usar vírgula para decimal. Se tem ponto e não tem vírgula, e tem 3 casas após o ponto, pode ser milhar.
            // Mas se for 1.2, 1.23, é decimal. 
            // Vamos assumir que se o DB salvou com ponto, é decimal.
            return parseFloat(clean) || 0;
        }

        if (hasComma && hasDot) {
            const lastComma = clean.lastIndexOf(',');
            const lastDot = clean.lastIndexOf('.');
            if (lastComma > lastDot) {
                // Formato brasileiro: 1.234,56
                clean = clean.replace(/\./g, '').replace(',', '.');
            } else {
                // Formato americano: 1,234.56
                clean = clean.replace(/,/g, '');
            }
        } else if (hasComma) {
            clean = clean.replace(',', '.');
        }

        const parsed = parseFloat(clean);
        return isNaN(parsed) ? 0 : parsed;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();

        if (file.name.endsWith('.csv')) {
            reader.onload = (event) => {
                const arrayBuffer = event.target?.result as ArrayBuffer;

                // Tenta UTF-8 primeiro
                const utf8Decoder = new TextDecoder('utf-8');
                let text = utf8Decoder.decode(new Uint8Array(arrayBuffer));

                // Heurística de codificação: Se contém caracteres de substituição ou não contém delimitadores comuns, tenta Latin1
                const hasReplacementChar = text.includes('\ufffd');
                const hasDelimiters = text.includes(';') || text.includes(',') || text.includes('\t');

                if (hasReplacementChar || !hasDelimiters) {
                    console.log("[Import] Detectada falha na codificação UTF-8 ou falta de delimitadores. Tentando ISO-8859-1...");
                    const latin1Decoder = new TextDecoder('iso-8859-1');
                    text = latin1Decoder.decode(new Uint8Array(arrayBuffer));
                }

                Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    delimitersToGuess: [';', ',', '\t'], // Prioridade para ponto-e-vírgula
                    complete: (results) => {
                        console.log(`[CSV] PapaParse: ${results.data.length} linhas detectadas. Delimitador: "${results.meta.delimiter}"`);
                        if (results.data.length === 0) {
                            alert("O arquivo parece estar vazio.");
                            setIsImporting(false);
                        } else {
                            processImport(results.data);
                        }
                    },
                    error: (err) => {
                        console.error("[CSV] Erro PapaParse:", err);
                        alert("Erro ao ler o CSV.");
                        setIsImporting(false);
                    }
                });
            };
            reader.readAsArrayBuffer(file);
        } else {
            reader.onload = (event) => {
                try {
                    const data = new Uint8Array(event.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    processImport(jsonData);
                } catch (err) {
                    console.error("XLSX error:", err);
                    alert("Erro ao ler o arquivo Excel.");
                    setIsImporting(false);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const processImport = async (rawData: any[]) => {
        try {
            const normalized = rawData.map(item => {
                const itemKeys = Object.keys(item);
                const getRaw = (aliases: string[]) => {
                    const normalizedAliases = aliases.map(a => normalizeStr(a));
                    const exactKey = itemKeys.find(ik => normalizedAliases.includes(normalizeStr(ik)));
                    if (exactKey !== undefined) return item[exactKey];
                    const softKey = itemKeys.find(ik => {
                        const nik = normalizeStr(ik);
                        return normalizedAliases.some(alias => nik.includes(alias) || alias.includes(nik));
                    });
                    return softKey !== undefined ? item[softKey] : undefined;
                };

                const ativo = String(getRaw(['ativo', 'papel', 'ticker', 'symbol']) || '').trim().toUpperCase();
                const cliente = String(getRaw(['cliente', 'nome', 'client']) || '').trim();
                let conta = String(getRaw(['conta', 'account', 'cta']) || '').trim();

                // Limpeza de conta (remove .0 final vindo de Excel)
                if (conta.endsWith('.0')) conta = conta.substring(0, conta.length - 2);

                const qtd = parseNum(getRaw(['qtd', 'quantidade', 'quantity', 'volume_qtd']));
                const pm = parseNum(getRaw(['preco_medio', 'pm', 'price', 'avg_price', 'prc_medio']));

                return {
                    ativo,
                    cliente_nome: cliente,
                    conta: conta,
                    qtd: qtd,
                    preco_medio: pm
                };
            }).filter(p => p.ativo && p.qtd !== 0);

            if (normalized.length === 0) {
                alert("Nenhum dado válido encontrado no arquivo.");
                setIsImporting(false);
                return;
            }

            if (!confirm(`Isso irá apagar TODAS as posições atuais e inserir ${normalized.length} novas posições. Deseja continuar?`)) {
                setIsImporting(false);
                return;
            }

            // 1. Limpar Base via RPC (Mais robusto que delete com neq)
            console.log("[Import] Limpando base de dados...");
            const { error: rpcError } = await supabase.rpc('truncate_open_positions');

            if (rpcError) {
                console.warn("[Import] Falha no RPC truncate_open_positions, tentando fallback delete:", rpcError);
                // Fallback para o método antigo caso o RPC não esteja criado
                const { error: deleteError } = await supabase.from('open_positions').delete().neq('ativo', 'TRUNCATE_PLACEHOLDER');
                if (deleteError) throw deleteError;
            }

            // 2. Inserir Novos Dados
            console.log(`[Import] Inserindo ${normalized.length} registros...`);
            // Tentamos inserir com os dois formatos de chave (qtd e Qtd) para garantir compatibilidade com o schema
            const finalData = normalized.map(item => ({
                ...item,
                Qtd: item.qtd // Duplica para garantir que o Supabase encontre a coluna correta
            }));

            const { error: insertError } = await supabase.from('open_positions').insert(finalData);
            if (insertError) {
                console.error("[Import] Erro na inserção:", insertError);
                throw insertError;
            }

            alert("Base de posições atualizada com sucesso!");
            if (selectedClient) {
                fetchClientPositions(selectedClient);
            }
        } catch (err: any) {
            console.error("Import error:", err);
            alert(`Erro ao importar dados: ${err.message}`);
        } finally {
            setIsImporting(false);
        }
    };

    const fetchClientPositions = async (client: Client) => {
        setLoading(true);
        setHasSearched(true);
        setSelectedClient(client);
        try {
            // Normalização e extração de dados do cliente para busca
            const normalize = (s: string) => s?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim() || "";

            const searchName = normalize(client.Cliente);
            // Pega apenas os números da conta para busca mais flexível
            const searchAccount = client.Conta ? String(client.Conta).replace(/\D/g, '') : '';

            console.log(`[OpenPositions] Buscando: Nome="${searchName}", Conta="${searchAccount}"`);

            // 1. Tentar busca exata por conta
            let query = supabase.from('open_positions').select('*');

            if (searchAccount) {
                // Busca por conta (contendo os números) OU nome parcial
                query = query.or(`conta.ilike.%${searchAccount}%,cliente_nome.ilike.%${searchName.split(' ')[0]}%`);
            } else {
                query = query.ilike('cliente_nome', `%${searchName.split(' ')[0]}%`);
            }

            const { data, error } = await query.order('ativo', { ascending: true });

            if (error) throw error;

            // 2. Filtro Local (Mais refinado para evitar falsos positivos do ILIKE)
            const filteredData = (data || []).filter(item => {
                const csvName = normalize(item.cliente_nome);
                const csvAccount = String(item.conta).replace(/\D/g, '');

                // Match por conta exata (números)
                if (searchAccount && csvAccount && csvAccount === searchAccount) return true;

                // Match por nome (um contido no outro)
                // Match por nome (Palavras-chave)
                // Se todas as palavras da busca estiverem no nome do CSV, consideramos match.
                // Ex: "VILMA GASI" encontra "VILMA GIANNINI FORMENTI GASI"
                if (searchName && csvName) {
                    const searchWords = searchName.split(/\s+/).filter(w => w.length > 1);
                    if (searchWords.length > 0 && searchWords.every(word => csvName.includes(word))) return true;
                }

                return false;
            });

            setPositions(filteredData);
            console.log(`[OpenPositions] Encontrados ${filteredData.length} registros para o cliente.`);

            if (filteredData.length > 0) {
                fetchQuotes(filteredData.map(p => p.ativo));
            } else {
                setQuotes({});
            }
        } catch (err) {
            console.error('Erro ao buscar posições:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllPositions = async () => {
        setLoading(true);
        setHasSearched(true);
        setSelectedClient(null);
        try {
            console.log(`[DEBUG] Buscando TODAS as posições da tabela...`);
            const { data, error } = await supabase
                .from('open_positions')
                .select('*')
                .order('cliente_nome', { ascending: true })
                .order('ativo', { ascending: true });

            if (error) throw error;
            setPositions(data || []);
            if (data && data.length > 0) {
                fetchQuotes(data.map(p => p.ativo));
            }
        } catch (err) {
            console.error('Erro ao buscar todas as posições:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuotes = async (tickers: string[]) => {
        setSyncing(true);
        const uniqueTickers = Array.from(new Set(tickers));
        const newQuotes: Record<string, QuoteData> = {};

        try {
            const ts = Date.now();
            for (let i = 0; i < uniqueTickers.length; i += 5) {
                const chunk = uniqueTickers.slice(i, i + 5);
                await Promise.all(chunk.map(async (ticker) => {
                    try {
                        const cleanTicker = ticker.trim();
                        const yahooTicker = cleanTicker.endsWith('.SA') ? cleanTicker : `${cleanTicker}.SA`;
                        const res = await fetch(`/api/yahoo/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=1d&_=${ts}`);

                        if (!res.ok) {
                            console.warn(`Erro HTTP para ${cleanTicker}: ${res.status}`);
                            return;
                        }

                        const data = await res.json();
                        const result = data.chart?.result?.[0];
                        const price = result?.meta?.regularMarketPrice || result?.meta?.chartPreviousClose;
                        const prevClose = result?.meta?.chartPreviousClose;

                        console.log(`[DEBUG] OpenPositions quote for ${cleanTicker}:`, { price, prevClose });

                        if (price !== undefined && price !== null) {
                            newQuotes[ticker] = {
                                price: price,
                                change: price - (prevClose || price),
                                changePercent: prevClose ? ((price - prevClose) / prevClose) * 100 : 0
                            };
                        }
                    } catch (e) {
                        console.error(`Erro ao buscar cotação para ${ticker}:`, e);
                    }
                }));
            }
            setQuotes(newQuotes);
        } catch (err) {
            console.error('Erro na sincronização de preços:', err);
        } finally {
            setSyncing(false);
        }
    };


    const totals = useMemo(() => {
        return positions.reduce((acc, pos) => {
            const quote = quotes[pos.ativo];
            const currentPrice = quote?.price || 0;
            const q = parseNum(pos.qtd || pos.Qtd);
            const pm = parseNum(pos.preco_medio);

            const costTotal = q * pm;
            const currentTotal = q * currentPrice;
            const result = currentTotal - costTotal;

            return {
                totalCusto: acc.totalCusto + costTotal,
                totalSaldo: acc.totalSaldo + currentTotal,
                totalResultado: acc.totalResultado + result
            };
        }, { totalCusto: 0, totalSaldo: 0, totalResultado: 0 });
    }, [positions, quotes]);

    if (!hasSearched && !loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-10 gap-8 animate-in fade-in duration-500">
                <div className="text-center space-y-4 max-w-xl">
                    <div className="h-16 w-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-4xl">person_search</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Posições em Aberto</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Selecione um cliente para consultar o saldo e resultado em tempo real.</p>
                </div>

                <div className="w-full max-w-lg">
                    <ClientSearch
                        onSelect={(client) => fetchClientPositions(client)}
                        placeholder="Pesquisar por Nome, Cod Bolsa ou Conta..."
                        className="shadow-2xl rounded-[2rem]"
                    />
                </div>

                <div className="flex flex-col items-center gap-4 mt-6">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-slate-800 border-2 border-primary/20 hover:border-primary text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95"
                    >
                        {isImporting ? (
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        ) : (
                            <span className="material-symbols-outlined">upload_file</span>
                        )}
                        {isImporting ? 'Processando...' : 'Importar Novas Posições (CSV)'}
                    </button>
                    <button
                        onClick={fetchAllPositions}
                        disabled={loading}
                        className="flex items-center gap-3 px-8 py-4 bg-primary text-[#102218] rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined">database</span>
                        Ver Todas as Posições (Geral)
                    </button>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">
                        * Clique acima para listar posições de todos os clientes no banco.
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-4 w-full max-w-lg mt-4 opacity-50 grayscale pointer-events-none">
                    {['VALE3', 'PETR4', 'ITUB4'].map(t => (
                        <div
                            key={t}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center"
                        >
                            {t}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (loading && positions.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center bg-transparent">
                <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando Posições...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col p-10 gap-8 animate-in fade-in duration-500">
            {/* Header with Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic truncate max-w-md">
                        {selectedClient?.Cliente || 'Posições do Cliente'}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Conta: {selectedClient?.Conta || '---'}</p>
                        <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{positions.length} Ativos</p>
                    </div>
                </div>
                <div className="flex gap-2 min-w-[350px]">
                    <div className="flex items-center mr-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".csv,.xlsx,.xls"
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                            className="h-12 bg-primary/10 hover:bg-primary/20 text-primary px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-primary/20"
                            title="Substituir toda a base"
                        >
                            {isImporting ? (
                                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-sm">upload</span>
                            )}
                            Importar
                        </button>
                    </div>
                    <div className="flex-1">
                        <ClientSearch
                            onSelect={(client) => fetchClientPositions(client)}
                            placeholder="Mudar cliente..."
                            showHeaderStyle={true}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setHasSearched(false);
                            setPositions([]);
                            setSelectedClient(null);
                        }}
                        className="h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    >
                        Limpar
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white/40 dark:bg-card-dark/40 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Saldo Bruto Total</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                        R$ {totals.totalSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">Valores em tempo real</span>
                    </div>
                </div>

                <div className="bg-white/40 dark:bg-card-dark/40 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Resultado Total</p>
                    <p className={`text-3xl font-black tracking-tighter ${totals.totalResultado >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        R$ {totals.totalResultado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">
                        Rentabilidade: {totals.totalCusto > 0 ? ((totals.totalResultado / totals.totalCusto) * 100).toFixed(2) : '0.00'}%
                    </p>
                </div>

                <div className="bg-white/40 dark:bg-card-dark/40 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm lg:col-span-1 md:col-span-2">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status da Sincronização</p>
                        {syncing && <span className="material-symbols-outlined text-sm animate-spin text-primary">sync</span>}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-1000"
                                style={{ width: syncing ? '100%' : '0%', opacity: syncing ? 1 : 0 }}
                            ></div>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase">{syncing ? 'Sincronizando Preços...' : 'Preços Atualizados'}</span>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white/60 dark:bg-card-dark/60 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ATIVO</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">QUANTIDADE</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">COTAÇÃO</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">PREÇO MÉDIO</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">CUSTO TOTAL</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">SALDO BRUTO (R$)</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">VARIAÇÃO (%)</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">RESULTADO (R$)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {positions.map((pos) => {
                                const quote = quotes[pos.ativo];
                                const currentPrice = quote?.price || 0;
                                const q = parseNum(pos.qtd || pos.Qtd);
                                const pm = parseNum(pos.preco_medio);

                                const costTotal = q * pm;
                                const currentTotal = q * currentPrice;
                                const result = currentTotal - costTotal;
                                const variation = costTotal > 0 ? (result / costTotal) * 100 : 0;

                                return (
                                    <tr key={pos.id} className="group hover:bg-white dark:hover:bg-card-dark transition-all transition-duration-300">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{pos.ativo}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate max-w-[150px]">{pos.cliente_nome}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">{q.toLocaleString('pt-BR')}</span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs font-black text-slate-900 dark:text-white">
                                                    {currentPrice > 0 ? `R$ ${currentPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '---'}
                                                </span>
                                                {quote && (
                                                    <span className={`text-[9px] font-bold ${quote.changePercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {quote.changePercent >= 0 ? '▲' : '▼'} {Math.abs(quote.changePercent).toFixed(2)}%
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="text-xs font-bold text-slate-500">R$ {pm.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">R$ {costTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-xs font-black text-slate-900 dark:text-white">
                                                {currentTotal > 0 ? `R$ ${currentTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '---'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black ${variation >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {variation >= 0 ? '+' : ''}{variation.toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <span className={`text-xs font-black ${result >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                R$ {result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {positions.length === 0 && (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-20">inventory_2</span>
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma posição em aberto encontrada para "{selectedClient?.Cliente}"</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OpenPositions;
