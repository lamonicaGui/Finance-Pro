import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

interface Client {
    "Cod Bolsa": string;
    "Cliente": string;
    "Conta": string;
    "Email Cliente"?: string;
    "Email Assessor"?: string;
}

interface ClientSearchProps {
    placeholder?: string;
    onSelect: (client: Client) => void;
    className?: string;
    initialValue?: string;
}

const ClientSearch: React.FC<ClientSearchProps> = ({
    placeholder = "Buscar por Nome, Cod Bolsa ou Conta...",
    onSelect,
    className = "",
    initialValue = ""
}) => {
    const [query, setQuery] = useState(initialValue);
    const [results, setResults] = useState<Client[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setQuery(initialValue);
    }, [initialValue]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const searchClients = async () => {
            setLoading(true);
            console.log(`[ClientSearch] Buscando por: "${query || '(vazio - lista padrão)'}"`);

            try {
                let queryBuilder = supabase.from('cadastro_clientes').select('*');

                if (query.trim()) {
                    // O usuário solicitou busca estrita por Cliente, Conta e Cod Bolsa.
                    // Removemos 'Assessor' para evitar que todos os clientes de um assessor apareçam.
                    let filter = `Cliente.ilike.%${query}%,"Cod Bolsa".ilike.%${query}%,Conta.ilike.%${query}%`;
                    queryBuilder = queryBuilder.or(filter);
                }

                const { data, error } = await queryBuilder
                    .order('Cliente', { ascending: true })
                    .limit(100);

                if (error) {
                    console.error('[ClientSearch] Erro ao buscar:', error);
                    if (error.message?.includes('infinite recursion')) {
                        alert('ERRO DE SISTEMA: Foi detectada uma "recursão infinita" nas políticas do banco de dados (RLS). Por favor, verifique as políticas da tabela "profiles" no Supabase.');
                    }
                    setResults([]);
                } else {
                    console.log(`[ClientSearch] Retornou ${data?.length || 0} clientes. Primeiro: ${data?.[0]?.Cliente || 'Nenhum'}`);
                    setResults((data as Client[]) || []);
                }
            } catch (err) {
                console.error('[ClientSearch] Erro inesperado:', err);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(searchClients, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (client: Client) => {
        setQuery(client.Cliente);
        setIsOpen(false);
        onSelect(client);
    };

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <div className="relative">
                <input
                    type="text"
                    className="block w-full h-11 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-4 pr-10 text-slate-900 dark:text-white shadow-sm focus:ring-4 focus:ring-primary/10 focus:border-primary sm:text-sm font-black uppercase tracking-tight transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                    {loading ? (
                        <span className="material-symbols-outlined animate-spin text-primary text-sm">progress_activity</span>
                    ) : (
                        <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-lg">search</span>
                    )}
                </div>
            </div>

            {isOpen && results.length > 0 && (
                <ul className="absolute z-[100] mt-3 max-h-72 w-full overflow-auto rounded-[1.5rem] bg-white dark:bg-slate-900 py-3 text-base shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm border border-slate-100 dark:border-slate-800 custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                    {results.map((client) => (
                        <li
                            key={client["Cod Bolsa"]}
                            className="relative cursor-pointer select-none py-3 px-5 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors border-b border-slate-50 last:border-0 dark:border-slate-800/50"
                            onClick={() => handleSelect(client)}
                        >
                            <div className="flex flex-col">
                                <span className="truncate font-black text-slate-900 dark:text-white uppercase tracking-tight text-[11px]">{client.Cliente}</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-tighter">CONTA: {client.Conta}</span>
                                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-tighter">BOLSA: {client["Cod Bolsa"]}</span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {isOpen && query.length >= 2 && !loading && results.length === 0 && (
                <div className="absolute z-[100] mt-3 w-full rounded-[1.5rem] bg-white dark:bg-slate-900 p-6 text-center shadow-2xl ring-1 ring-black ring-opacity-5 border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                    <span className="material-symbols-outlined text-slate-200 dark:text-slate-800 text-3xl mb-2">person_search</span>
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-widest">Nenhum cliente encontrado</p>
                </div>
            )}
        </div>
    );
};

export default ClientSearch;
