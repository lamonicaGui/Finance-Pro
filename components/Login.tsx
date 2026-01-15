import React, { useState } from 'react';
import { supabase } from '../services/supabase';

interface LoginProps {
    onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError) {
            setError(authError.message === 'Invalid login credentials'
                ? 'Credenciais inválidas. Verifique seu e-mail e senha.'
                : authError.message);
            setLoading(false);
        } else {
            onLoginSuccess();
        }
    };

    return (
        <div className="min-h-screen bg-[#102218] flex items-center justify-center p-4 selection:bg-primary/30">
            {/* Background Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]"></div>
            </div>

            <div className="w-full max-w-md z-10">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
                    <div className="flex flex-col items-center mb-10">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-primary shadow-inner mb-6">
                            <span className="material-symbols-outlined text-4xl font-bold">account_balance</span>
                        </div>
                        <h2 className="text-3xl font-black tracking-tighter text-white uppercase">FinancePro</h2>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mt-2 opacity-80 text-center">
                            Backoffice Intelligence Suite
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                E-mail institucional
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-3.5 material-symbols-outlined text-slate-400 text-[20px]">mail</span>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-inner"
                                    placeholder="seu.email@katinvest.com.br"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                Senha de acesso
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-3.5 material-symbols-outlined text-slate-400 text-[20px]">lock</span>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-inner"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <span className="material-symbols-outlined text-lg">error</span>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary py-4 rounded-2xl text-[#102218] font-black uppercase text-xs tracking-widest hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {loading ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                    Autenticando...
                                </>
                            ) : (
                                <>
                                    Entrar no Sistema
                                    <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                            Acesso restrito a colaboradores autorizados
                        </p>
                    </div>
                </div>

                <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] text-center mt-10">
                    © 2024 KAT INVESTIMENTOS • FINANCEPRO V5.3.0
                </p>
            </div>
        </div>
    );
};

export default Login;
