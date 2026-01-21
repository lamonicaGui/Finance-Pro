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
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form State for new user
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState<Profile['role']>('usuario_rv');

    // Password Reset State
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetTargetProfile, setResetTargetProfile] = useState<Profile | null>(null);
    const [manualNewPassword, setManualNewPassword] = useState('');

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

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsActionLoading(true);

        // 1. Create User in Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: newUserEmail,
            password: newUserPassword,
            options: {
                data: {
                    full_name: newUserName,
                    role: newUserRole
                }
            }
        });

        if (authError) {
            alert(`Erro ao criar usuário: ${authError.message}`);
        } else {
            alert(`Usuário convidado/criado com sucesso! Se a confirmação de e-mail estiver ativa, ele precisará confirmar.`);
            setShowAddModal(false);
            resetForm();
            fetchProfiles();
        }
        setIsActionLoading(false);
    };

    const resetForm = () => {
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('usuario_rv');
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

    const handlePasswordReset = (profile: Profile) => {
        setResetTargetProfile(profile);
        setShowResetModal(true);
    };

    const executePasswordReset = async () => {
        if (!resetTargetProfile) return;

        setIsActionLoading(true);
        // Note: Direct password change without user login requires Service Role / Admin API.
        // We trigger the email reset flow as the primary secure method.
        const { error } = await supabase.auth.resetPasswordForEmail(resetTargetProfile.email || '', {
            redirectTo: window.location.origin,
        });

        if (error) {
            alert(`Erro ao iniciar redefinição: ${error.message}`);
        } else {
            alert(`Link de redefinição enviado com sucesso para ${resetTargetProfile.email}. O usuário poderá definir a nova senha.`);
            setShowResetModal(false);
            setResetTargetProfile(null);
            setManualNewPassword('');
        }
        setIsActionLoading(false);
    };

    const deleteUser = async (userId: string, email: string) => {
        if (!confirm(`Tem certeza que deseja EXCLUIR permanentemente o perfil de ${email}? Ele perderá todo o acesso imediatamente.`)) return;

        setIsActionLoading(true);
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) {
            alert(`Erro ao excluir perfil: ${error.message}`);
        } else {
            setProfiles(prev => prev.filter(p => p.id !== userId));
            alert('Perfil excluído com sucesso.');
        }
        setIsActionLoading(false);
    };

    if (isLoading && profiles.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <span className="material-symbols-outlined animate-spin text-primary text-5xl">progress_activity</span>
                <p className="text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Sincronizando Perfis...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="bg-white dark:bg-card-dark rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                    <span className="material-symbols-outlined text-[120px]">admin_panel_settings</span>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-8 w-1.5 bg-primary rounded-full"></div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">Gestão de Usuários</h2>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium italic text-sm">Gerenciamento centralizado de acessos, perfis e restrições de segurança.</p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button
                            onClick={fetchProfiles}
                            className="flex-1 md:flex-none h-12 px-6 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-base">refresh</span>
                            Atualizar
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex-1 md:flex-none h-12 px-8 rounded-xl bg-slate-900 dark:bg-primary text-white dark:text-[#102218] font-black text-[10px] uppercase tracking-widest hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-base">person_add</span>
                            Novo Usuário
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* User Table (3/4) */}
                <div className="xl:col-span-3">
                    <div className="overflow-hidden bg-white dark:bg-card-dark rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative">
                        {isActionLoading && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                            </div>
                        )}

                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Usuário Informativo</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Nível de Acesso</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Controle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {profiles.map((profile) => (
                                    <tr key={profile.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all border-b border-slate-50 dark:border-slate-800 last:border-0">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-black relative shadow-inner">
                                                    {profile.full_name?.charAt(0) || '?'}
                                                    {profile.role === 'adm' && (
                                                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-amber-400 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] text-white">⭐</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{profile.full_name || 'Sem Nome'}</div>
                                                    <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 italic mt-0.5">{profile.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <select
                                                value={profile.role}
                                                onChange={(e) => updateRole(profile.id, e.target.value as Profile['role'])}
                                                className="inline-block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-[11px] font-black text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all cursor-pointer uppercase appearance-none text-center shadow-sm"
                                            >
                                                <option value="adm">ADMINISTRADOR</option>
                                                <option value="user_bkfc">BACKOFFICE (RV+RF)</option>
                                                <option value="usuario_rv">USUÁRIO RV</option>
                                                <option value="usuario_rf">USUÁRIO RF</option>
                                            </select>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <button
                                                onClick={() => toggleStatus(profile.id, profile.is_active)}
                                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${profile.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'}`}
                                            >
                                                <span className={`h-2 w-2 rounded-full ${profile.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></span>
                                                {profile.is_active ? 'Ativo' : 'Pausado'}
                                            </button>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2 text-slate-400">
                                                <button
                                                    onClick={() => handlePasswordReset(profile)}
                                                    disabled={isActionLoading}
                                                    className="h-10 w-10 flex items-center justify-center rounded-xl hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all"
                                                    title="Criar Nova Senha"
                                                >
                                                    <span className="material-symbols-outlined text-lg">lock_reset</span>
                                                </button>
                                                <button
                                                    onClick={() => deleteUser(profile.id, profile.email || '')}
                                                    disabled={isActionLoading}
                                                    className="h-10 w-10 flex items-center justify-center rounded-xl hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                                                    title="Excluir Definitivamente"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete_forever</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {profiles.length === 0 && !isLoading && (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="h-16 w-16 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 dark:text-slate-700">
                                                    <span className="material-symbols-outlined text-4xl">group_off</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter italic">Nenhum Usuário Encontrado</p>
                                                    <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest mt-1">Verifique as permissões de banco de dados ou adicione o primeiro usuário.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Legend / Access Levels (1/4) */}
                <div className="space-y-6">
                    <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <span className="material-symbols-outlined text-6xl">security</span>
                        </div>
                        <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-6 relative z-10">Guia de Permissões</h4>

                        <div className="space-y-6 relative z-10">
                            <div>
                                <p className="text-[11px] font-black text-white uppercase mb-1">Administrador</p>
                                <p className="text-[11px] text-slate-400 font-medium">Acesso total a todos os módulos, relatórios e gestão de usuários do sistema.</p>
                            </div>
                            <div className="h-px bg-slate-800"></div>
                            <div>
                                <p className="text-[11px] font-black text-white uppercase mb-1">Backoffice</p>
                                <p className="text-[11px] text-slate-400 font-medium">Visualização de RV e RF. Geração de lâminas e relatórios. Sem gestão de usuários.</p>
                            </div>
                            <div className="h-px bg-slate-800"></div>
                            <div>
                                <p className="text-[11px] font-black text-white uppercase mb-1">Usuário RV</p>
                                <p className="text-[11px] text-slate-400 font-medium">Restrito ao mercado de Renda Variável (Ordens, Swing Trade e Lâminas).</p>
                            </div>
                            <div className="h-px bg-slate-800"></div>
                            <div>
                                <p className="text-[11px] font-black text-white uppercase mb-1">Usuário RF</p>
                                <p className="text-[11px] text-slate-400 font-medium">Restrito ao mercado de Renda Fixa e ordens de Tesouraria.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all animate-in fade-in">
                    <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
                        <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-950">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase">Novo Usuário</h3>
                                <p className="text-slate-500 dark:text-slate-400 font-medium italic text-[11px]">Defina as credenciais de acesso inicial.</p>
                            </div>
                            <button
                                onClick={() => { setShowAddModal(false); resetForm(); }}
                                className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 transition-all shadow-sm"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleAddUser} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Nome Completo</label>
                                    <input
                                        required
                                        type="text"
                                        value={newUserName}
                                        onChange={(e) => setNewUserName(e.target.value)}
                                        placeholder="Ex: João da Silva"
                                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-2xl px-5 text-sm font-bold text-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">E-mail Corporativo</label>
                                    <input
                                        required
                                        type="email"
                                        value={newUserEmail}
                                        onChange={(e) => setNewUserEmail(e.target.value)}
                                        placeholder="usuario@katinvest.com.br"
                                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-2xl px-5 text-sm font-bold text-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Senha de Acesso</label>
                                    <input
                                        required
                                        type="password"
                                        value={newUserPassword}
                                        onChange={(e) => setNewUserPassword(e.target.value)}
                                        placeholder="No mínimo 6 caracteres"
                                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-2xl px-5 text-sm font-bold text-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Perfil de Acesso</label>
                                    <select
                                        value={newUserRole}
                                        onChange={(e) => setNewUserRole(e.target.value as Profile['role'])}
                                        className="w-full h-12 bg-slate-50 dark:bg-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 rounded-2xl px-5 text-sm font-black text-slate-900 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all uppercase appearance-none"
                                    >
                                        <option value="adm">ADMINISTRADOR (FULL)</option>
                                        <option value="user_bkfc">BACKOFFICE (RV+RF)</option>
                                        <option value="usuario_rv">USUÁRIO RV</option>
                                        <option value="usuario_rf">USUÁRIO RF</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isActionLoading}
                                className="w-full h-14 bg-slate-900 dark:bg-primary text-primary dark:text-[#102218] rounded-[1.25rem] font-black text-xs uppercase tracking-[0.1em] shadow-xl shadow-primary/10 hover:brightness-110 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {isActionLoading ? (
                                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-lg">how_to_reg</span>
                                        Confirmar Cadastro
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
