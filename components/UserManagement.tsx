import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

interface Profile {
    id: string;
    full_name: string | null;
    email: string | null;
    role: 'adm' | 'usuario_rv' | 'usuario_rf' | 'user_bkfc';
    is_active: boolean;
    updated_at: string;
    last_login: string | null;
}

const UserManagement: React.FC = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name', { ascending: true });

        if (error) {
            console.error('Error fetching profiles:', error);
            setError('Erro ao carregar usuários.');
        } else {
            setProfiles(data || []);
            setError(null);
        }
        setIsLoading(false);
    };

    const updateRole = async (userId: string, newRole: Profile['role']) => {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) {
            alert('Erro ao atualizar nível de acesso.');
        } else {
            setProfiles(prev => prev.map(p => p.id === userId ? { ...p, role: newRole } : p));
        }
    };

    const toggleStatus = async (userId: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('profiles')
            .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) {
            alert('Erro ao atualizar status do usuário.');
        } else {
            setProfiles(prev => prev.map(p => p.id === userId ? { ...p, is_active: !currentStatus } : p));
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase">Gestão de Usuários</h3>
                    <p className="text-slate-500 text-sm font-medium italic">Controle de acessos e permissões do sistema</p>
                </div>
                <button
                    onClick={fetchProfiles}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all shadow-sm"
                    title="Atualizar Lista"
                >
                    <span className="material-symbols-outlined text-xl">refresh</span>
                </button>
            </div>

            {error && (
                <div className="p-8 text-center text-red-500 font-bold uppercase text-xs tracking-widest">
                    {error}
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nível de Acesso</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {profiles.map(profile => (
                            <tr key={profile.id} className="hover:bg-slate-50/30 transition-colors group">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black">
                                            {profile.full_name?.charAt(0) || profile.email?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800 uppercase leading-none mb-1">
                                                {profile.full_name || 'Sem Nome'}
                                            </p>
                                            <p className="text-[11px] font-medium text-slate-400 italic">
                                                {profile.email}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <select
                                        value={profile.role}
                                        onChange={(e) => updateRole(profile.id, e.target.value as Profile['role'])}
                                        className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    >
                                        <option value="adm">Administrador (Full)</option>
                                        <option value="user_bkfc">Backoffice (RV+RF)</option>
                                        <option value="usuario_rv">Usuário RV</option>
                                        <option value="usuario_rf">Usuário RF</option>
                                    </select>
                                </td>
                                <td className="px-8 py-5">
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${profile.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${profile.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                                        {profile.is_active ? 'Ativo' : 'Inativo'}
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <button
                                        onClick={() => toggleStatus(profile.id, profile.is_active)}
                                        className={`text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all ${profile.is_active ? 'text-red-500 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                                    >
                                        {profile.is_active ? 'Desativar' : 'Ativar'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {profiles.length === 0 && !isLoading && !error && (
                <div className="p-20 text-center">
                    <span className="material-symbols-outlined text-4xl text-slate-200 mb-2">group_off</span>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nenhum usuário encontrado</p>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
