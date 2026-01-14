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
                    // Após converter as colunas no DB para TEXT, podemos usar .ilike para TUDO
                    // Isso permite buscas parciais e evita erros de sintaxe com campos vazios
                    let filter = `"Cliente".ilike.%${query}%,"Assessor".ilike.%${query}%,"Cod Bolsa".ilike.%${query}%,"Conta".ilike.%${query}%`;
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
                    className="block w-full rounded-lg border-slate-300 py-2 pl-3 pr-10 text-slate-900 shadow-sm focus:ring-2 focus:ring-primary sm:text-sm font-medium"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                {loading && (
                    <div className="absolute right-3 top-2.5">
                        <span className="material-symbols-outlined animate-spin text-slate-400 text-sm">progress_activity</span>
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {results.map((client) => (
                        <li
                            key={client["Cod Bolsa"]}
                            className="relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-slate-50 transition-colors"
                            onClick={() => handleSelect(client)}
                        >
                            <div className="flex flex-col">
                                <span className="truncate font-semibold text-slate-900">{client.Cliente}</span>
                                <span className="truncate text-xs text-slate-500">
                                    Conta: {client.Conta} | Bolsa: {client["Cod Bolsa"]}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {isOpen && query.length >= 2 && !loading && results.length === 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md bg-white p-4 text-center text-sm text-slate-500 shadow-lg ring-1 ring-black ring-opacity-5">
                    Nenhum cliente encontrado.
                </div>
            )}
        </div>
    );
};

export default ClientSearch;
