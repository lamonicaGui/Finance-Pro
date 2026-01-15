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
    onQueryChange?: (query: string) => void;
    className?: string;
    initialValue?: string;
    showHeaderStyle?: boolean;
}

const ClientSearch: React.FC<ClientSearchProps> = ({
    placeholder = "Buscar por Nome, Cod Bolsa ou Conta...",
    onSelect,
    onQueryChange,
    className = "",
    initialValue = "",
    showHeaderStyle = false
}) => {
    const [query, setQuery] = useState(initialValue);
    const [results, setResults] = useState<Client[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialValue !== query) {
            setQuery(initialValue);
        }
    }, [initialValue]);

    useEffect(() => {
        // Connection check
        const checkConnection = async () => {
            try {
                const { count, error } = await supabase.from('cadastro_clientes').select('*', { count: 'exact', head: true });
                console.log(`[ClientSearch] Connection Check - Count: ${count}, Error:`, error);
                if (error) setError(`DB: ${error.message}`);
            } catch (err: any) {
                console.error('[ClientSearch] Connection Check crash:', err);
                setError(`Crash: ${err.message}`);
            }
        };
        checkConnection();
    }, []);

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
            const trimmedQuery = query.trim();
            if (trimmedQuery.length < 1) {
                setResults([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            console.log(`[ClientSearch] Searching: "${trimmedQuery}"`);

            try {
                // Try simple name search first to rule out syntax issues with complex OR
                let { data, error: sbError } = await supabase
                    .from('cadastro_clientes')
                    .select('*')
                    .or(`Cliente.ilike.%${trimmedQuery}%,Conta.ilike.%${trimmedQuery}%,"Cod Bolsa".ilike.%${trimmedQuery}%`)
                    .order('Cliente', { ascending: true })
                    .limit(50);

                if (sbError) {
                    console.error('[ClientSearch] Search error:', sbError);
                    setError(sbError.message);
                    setResults([]);
                } else {
                    console.log(`[ClientSearch] Success: ${data?.length || 0} items`);
                    setResults((data as Client[]) || []);
                }
            } catch (err: any) {
                console.error('[ClientSearch] Fatal error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(searchClients, 150);
        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (client: Client) => {
        setQuery(client.Cliente);
        setIsOpen(false);
        onSelect(client);
    };

    const inputClasses = showHeaderStyle
        ? "w-full h-12 pl-5 pr-12 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black uppercase text-slate-800 dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all shadow-sm cursor-text pointer-events-auto opacity-100"
        : "block w-full h-11 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-4 pr-12 text-slate-900 dark:text-white shadow-sm focus:ring-4 focus:ring-primary/10 focus:border-primary sm:text-sm font-black uppercase tracking-tight transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 cursor-text pointer-events-auto opacity-100";

    return (
        <div ref={wrapperRef} className={`relative ${className}`} style={{ isolate: 'isolate' }}>
            <div className="relative">
                <input
                    type="text"
                    autoComplete="off"
                    className={`${inputClasses} ${error ? 'border-red-500' : ''}`}
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => {
                        const val = e.target.value;
                        setQuery(val);
                        setIsOpen(true);
                        if (onQueryChange) onQueryChange(val);
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                    {loading ? (
                        <span className="material-symbols-outlined animate-spin text-primary text-sm">progress_activity</span>
                    ) : (
                        !showHeaderStyle && <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-lg">search</span>
                    )}
                </div>
            </div>

            {isOpen && query.trim().length > 0 && (
                <div className="absolute left-0 right-0 z-[9999] mt-2">
                    <div className="max-h-72 w-full overflow-auto rounded-[1.5rem] bg-white dark:bg-slate-900 py-3 text-base shadow-2xl ring-1 ring-black/10 focus:outline-none sm:text-sm border border-slate-100 dark:border-slate-800 custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                        {loading ? (
                            <div className="p-8 text-center">
                                <span className="material-symbols-outlined animate-spin text-primary text-2xl mb-2">progress_activity</span>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Buscando na base mestre...</p>
                            </div>
                        ) : error ? (
                            <div className="p-6 text-center text-red-500">
                                <span className="material-symbols-outlined text-xl mb-1">error_outline</span>
                                <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
                            </div>
                        ) : results.length > 0 ? (
                            <ul className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                {results.map((client) => (
                                    <li
                                        key={client["Cod Bolsa"] + "-" + client.Conta}
                                        className="relative cursor-pointer select-none py-3 px-5 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
                                        onClick={() => handleSelect(client)}
                                    >
                                        <div className="flex flex-col">
                                            <span className="truncate font-black text-slate-900 dark:text-white uppercase tracking-tight text-[11px]">{client.Cliente}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-tighter">CONTA: {client.Conta}</span>
                                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] font-black text-slate-400 uppercase tracking-tighter">BOLSA: {client["Cod Bolsa"]}</span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-8 text-center">
                                <span className="material-symbols-outlined text-slate-200 dark:text-slate-800 text-3xl mb-2">person_search</span>
                                <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-600 tracking-widest">Nenhum cliente encontrado</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientSearch;
