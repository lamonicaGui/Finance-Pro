import React, { useState, useEffect } from 'react';
import { ClientGroup as ClientGroupType, OrderItem } from './types.ts';
import ClientGroup from './components/ClientGroup.tsx';
import EmailPreviewModal from './components/EmailPreviewModal.tsx';
import HawkGenerator from './components/HawkGenerator.tsx';
import SwingTradeGenerator from './components/SwingTradeGenerator';
import FixedIncomeCompromissadas from './components/FixedIncomeCompromissadas';
import ClientSearch from './components/ClientSearch';
import { getGeminiResponse } from './services/gemini.ts';
import { supabase } from './services/supabase.ts';
import Login from './components/Login.tsx';
import UserManagement from './components/UserManagement.tsx';
import ApprovalsLayout from './components/ApprovalsLayout';
import PerformanceAnalysis from './components/PerformanceAnalysis.tsx';
import OpenPositions from './components/OpenPositions.tsx';
import { Session } from '@supabase/supabase-js';
import { copyAndOpenOutlook, generateOrderEmailHtml, generateOrderEmailSubject, generateOrderEmailPlainText } from './utils/emailGenerator.ts';

const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'ordens' | 'laminas' | 'swing-trade' | 'gemini' | 'renda-fixa' | 'relatorios' | 'gestao-usuarios' | 'analise-performance' | 'posicoes-aberto'>('ordens');
  const [expandedCategory, setExpandedCategory] = useState<'rv' | 'rf' | 'rel' | 'config' | null>('rv');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [clients, setClients] = useState<ClientGroupType[]>([
    {
      id: generateId(),
      account: '310738',
      name: 'ALBERTO KHAFIF',
      email: 'khafif@zaraplast.ind.br',
      cc: 'Nathalia Caires',
      orders: [
        {
          id: generateId(),
          ticker: 'BOVV11',
          side: 'Venda',
          lastPrice: 118.50,
          orderPrice: 0,
          mode: 'Mercado',
          basis: 'Quantidade',
          value: 373,
          stopLoss: false
        }
      ]
    }
  ]);

  const [previewClient, setPreviewClient] = useState<ClientGroupType | null>(null);
  const [bulkQueue, setBulkQueue] = useState<string[]>([]);
  const [isSendingAPI, setIsSendingAPI] = useState(false);

  // Gemini State
  const [geminiPrompt, setGeminiPrompt] = useState('');
  const [geminiResponse, setGeminiResponse] = useState('');
  const [isLoadingGemini, setIsLoadingGemini] = useState(false);

  // Supabase Fetching & Auth
  // 1. Auth & Session Management
  useEffect(() => {
    let mounted = true;

    // Safety timeout: Ensure loading screen eventually disappears
    const safetyTimer = setTimeout(() => {
      if (mounted && isAuthLoading) {
        console.warn('Auth loading safety timeout hit');
        setIsAuthLoading(false);
      }
    }, 5000);

    const initialize = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (initialSession) {
          setSession(initialSession);
          // Set optimistic profile immediately to unlock UI
          const user = initialSession.user;
          setUserProfile({
            id: user.id,
            role: user.user_metadata?.role || 'usuario_rv',
            full_name: user.user_metadata?.full_name || 'Usuário',
            avatar_url: user.user_metadata?.avatar_url || null,
            email: user.email
          });
          // Then fetch the real profile from DB in the background
          fetchProfile(user);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        if (mounted) setIsAuthLoading(false);
      }
    };

    initialize();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth event:', event);
      if (!mounted) return;

      setSession(currentSession);

      if (currentSession) {
        // Optimistic update on auth change too
        const user = currentSession.user;
        setUserProfile({
          id: user.id,
          role: user.user_metadata?.role || 'usuario_rv',
          full_name: user.user_metadata?.full_name || 'Usuário',
          avatar_url: user.user_metadata?.avatar_url || null,
          email: user.email
        });
        fetchProfile(user);
      } else {
        setUserProfile(null);
      }

      setIsAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  // 2. Data Fetching (Only when authenticated)
  useEffect(() => {
    if (!session) return;

    const fetchData = async () => {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          *,
          orders (*)
        `);

      if (clientsError) {
        console.error('Error fetching clients:', clientsError);
      } else if (clientsData) {
        setClients(clientsData);
        if (clientsData.length > 0 && !selectedClientId) {
          setSelectedClientId(clientsData[0].id);
        }
      }
    };

    fetchData();
  }, [session?.user.id]);

  const fetchProfile = async (user: any) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.warn('Profile not found, using metadata fallback');
        const fallbackProfile = {
          id: user.id,
          role: user.user_metadata?.role || 'usuario_rv',
          full_name: user.user_metadata?.full_name || 'Usuário',
          avatar_url: user.user_metadata?.avatar_url || null,
          email: user.email
        };
        setUserProfile(fallbackProfile);
        handleRoleRedirect(fallbackProfile.role);
      } else {
        setUserProfile(data);
        handleRoleRedirect(data.role);
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      // Final emergency fallback
      setUserProfile({
        id: user.id,
        role: 'usuario_rv',
        full_name: 'Usuário',
        email: user.email
      });
    }
  };

  const handleRoleRedirect = (role: string) => {
    if (role === 'usuario_rf' && activeTab === 'ordens') {
      setActiveTab('renda-fixa');
    } else if (role === 'usuario_rv' && activeTab === 'renda-fixa') {
      setActiveTab('ordens');
    }
  };

  const handleLogout = async () => {
    setUserProfile(null);
    setSession(null);
    await supabase.auth.signOut();
  };

  const hasAccess = (tab: string) => {
    if (!userProfile) return false;
    const role = userProfile.role;
    if (role === 'adm') return true;

    if (tab === 'ordens' || tab === 'laminas' || tab === 'swing-trade') {
      return role === 'usuario_rv' || role === 'user_bkfc';
    }
    if (tab === 'renda-fixa') {
      return role === 'usuario_rf' || role === 'user_bkfc';
    }
    if (tab === 'relatorios' || tab === 'gemini' || tab === 'analise-performance') {
      return role === 'user_bkfc' || role === 'adm';
    }
    if (tab === 'gestao-usuarios') {
      return role === 'adm';
    }
    return false;
  };

  const handleGeminiSubmit = async () => {
    if (!geminiPrompt.trim()) return;
    setIsLoadingGemini(true);
    try {
      const response = await getGeminiResponse(geminiPrompt);
      setGeminiResponse(response);
    } catch (error) {
      setGeminiResponse('Erro ao consultar Gemini. Verifique sua chave de API e o console.');
    } finally {
      setIsLoadingGemini(false);
    }
  };

  const addClient = async () => {
    const newClient = {
      account: '',
      name: '',
      email: '',
      cc: ''
    };

    const { data, error } = await supabase
      .from('clients')
      .insert([newClient])
      .select()
      .single();

    if (error) {
      console.error('Error adding client:', error);
      return;
    }

    setClients(prev => [...prev, { ...data, orders: [] }]);
  };

  const addClientFromMaster = async (masterClient: any) => {
    const newClient = {
      account: masterClient["Conta"].toString(),
      name: masterClient["Cliente"],
      email: masterClient["Email Cliente"] || '',
      cc: masterClient["Email Assessor"] || ''
    };

    const { data, error } = await supabase
      .from('clients')
      .insert([newClient])
      .select()
      .single();

    if (error) {
      console.error('Error adding client from master:', error);
      return;
    }

    setClients(prev => [...prev, { ...data, orders: [] }]);
  };

  const removeClient = async (clientId: string) => {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (error) {
      console.error('Error removing client:', error);
      return;
    }
    setClients(prev => prev.filter(c => c.id !== clientId));
  };

  const updateClient = async (clientId: string, updates: Partial<ClientGroupType>) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, orders, created_at, ...dbUpdates } = updates as any;

    const { error } = await supabase
      .from('clients')
      .update(dbUpdates)
      .eq('id', clientId);

    if (error) {
      console.error('Error updating client:', error);
      return;
    }
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...updates } : c));
  };

  const addOrder = async (clientId: string) => {
    const newOrder = {
      client_id: clientId,
      ticker: '',
      side: 'Compra',
      lastPrice: 0,
      orderPrice: 0,
      mode: 'Mercado',
      basis: 'Quantidade',
      value: 0,
      stopLoss: false
    };

    const { data, error } = await supabase
      .from('orders')
      .insert([newOrder])
      .select()
      .single();

    if (error) {
      console.error('Error adding order:', error);
      return;
    }

    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        return {
          ...c,
          orders: [...c.orders, data]
        };
      }
      return c;
    }));
  };

  const updateOrder = async (clientId: string, orderId: string, updates: Partial<OrderItem>) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, client_id, created_at, ...dbUpdates } = updates as any;

    const { error } = await supabase
      .from('orders')
      .update(dbUpdates)
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order:', error);
      return;
    }

    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        return {
          ...c,
          orders: c.orders.map(o => o.id === orderId ? { ...o, ...updates } : o)
        };
      }
      return c;
    }));
  };

  const removeOrder = async (clientId: string, orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('Error removing order:', error);
      return;
    }

    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        return { ...c, orders: c.orders.filter(o => o.id !== orderId) };
      }
      return c;
    }));
  };

  const sendViaOutlookAPI = async (client: ClientGroupType, htmlContent: string) => {
    setIsSendingAPI(true);
    try {
      console.log('Enviando via Microsoft Graph...', { to: client.email });
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert(`E-mail enviado via API para ${client.name}!`);

      if (bulkQueue.length > 1) {
        const nextId = bulkQueue[1];
        const nextClient = clients.find(c => c.id === nextId);
        setBulkQueue(prev => prev.slice(1));
        if (nextClient) setPreviewClient(nextClient);
      } else {
        setBulkQueue([]);
        setPreviewClient(null);
      }
    } catch (error) {
      alert('Erro ao conectar com API.');
    } finally {
      setIsSendingAPI(false);
    }
  };

  const handleManualAction = async (client: ClientGroupType) => {
    const subject = generateOrderEmailSubject({ conta: client.account, id: client.id });
    const html = generateOrderEmailHtml({ nome: client.name }, client.orders);
    const plainText = generateOrderEmailPlainText({ nome: client.name }, client.orders);
    const ccEmail = client.cc || userProfile?.email;
    await copyAndOpenOutlook(client.email || '', subject, html, plainText, ccEmail);
    setPreviewClient(null);
  };

  const handleSendAll = () => {
    const clientsWithOrders = clients.filter(c => c.orders.length > 0);
    if (clientsWithOrders.length === 0) return;
    setBulkQueue(clientsWithOrders.map(c => c.id));
    setPreviewClient(clientsWithOrders[0]);
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen bg-[#102218] flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={() => { }} />;
  }

  // Removed early return for 'ordens' to unify layout

  const renderContent = () => {
    if (!userProfile) {
      return (
        <div className="flex flex-col items-center justify-center p-20 gap-4 animate-pulse">
          <span className="material-symbols-outlined animate-spin text-primary text-5xl">progress_activity</span>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Personalizando seu painel...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'ordens': return (
        <div className="flex flex-col gap-6">
          <ApprovalsLayout
            clients={clients}
            selectedClientId={selectedClientId}
            onSelectClient={setSelectedClientId}
            onAddClient={addClient}
            onAddClientFromMaster={addClientFromMaster}
            onUpdateClient={updateClient}
            onRemoveClient={removeClient}
            onAddOrder={addOrder}
            onUpdateOrder={updateOrder}
            onRemoveOrder={removeOrder}
            onSendEmail={(client) => setPreviewClient(client)}
            onSendAll={handleSendAll}
            onLogout={handleLogout}
            userProfile={userProfile}
            onSwitchTab={setActiveTab}
          />
        </div>
      );
      case 'laminas': return <HawkGenerator />;
      case 'swing-trade': return <SwingTradeGenerator userEmail={userProfile?.email} />;
      case 'renda-fixa':
        return (
          <div className="bg-white dark:bg-card-dark rounded-[2.5rem] p-12 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center transition-all bg-gradient-to-b from-white to-slate-50/30 dark:from-card-dark dark:to-background-dark/20">
            <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-700 mb-6">construction</span>
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase mb-2 tracking-tighter italic">Módulo em Desenvolvimento</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md font-medium">Selecione uma opção no menu lateral para começar.</p>
          </div>
        );
      case 'fixed-income-compromissadas': return <FixedIncomeCompromissadas advisorEmail={userProfile?.email} />;
      case 'gestao-usuarios': return <UserManagement />;
      case 'analise-performance': return <PerformanceAnalysis />;
      case 'posicoes-aberto': return <OpenPositions />;
      case 'gemini': return (
        <div className="flex-1 flex flex-col p-8 gap-6 overflow-hidden">
          <div className="flex-1 bg-white dark:bg-card-dark rounded-3xl border border-slate-100 dark:border-slate-800 p-8 overflow-y-auto custom-scrollbar shadow-sm">
            {geminiResponse ? (
              <div className="prose prose-slate dark:prose-invert max-w-none">
                {geminiResponse.split('\n').map((line, i) => <p key={i}>{line}</p>)}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <span className="material-symbols-outlined text-6xl mb-4">psychology</span>
                <p className="font-black text-sm uppercase tracking-widest">IA FinancePro aguardando comando</p>
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <input
              type="text"
              value={geminiPrompt}
              onChange={(e) => setGeminiPrompt(e.target.value)}
              placeholder="Pergunte algo sobre os dados..."
              className="flex-1 bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <button
              onClick={async () => {
                setIsLoadingGemini(true);
                const resp = await getGeminiResponse(geminiPrompt);
                setGeminiResponse(resp);
                setIsLoadingGemini(false);
              }}
              disabled={isLoadingGemini}
              className="bg-primary px-8 rounded-2xl text-[#102218] font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-3"
            >
              {isLoadingGemini ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">send</span>}
              Consultar
            </button>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 overflow-hidden font-display">
      {/* Sidebar V2 */}
      <aside className="w-80 bg-card-light dark:bg-card-dark border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
                <span className="material-symbols-outlined text-2xl font-bold">account_balance</span>
              </div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-tight italic">
                FINANCEPRO
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
              title="Sair"
            >
              <span className="material-icons-outlined text-sm">logout</span>
            </button>
          </div>
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Backoffice Suite</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-8 custom-scrollbar">
          {/* Navigation */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Módulos</h3>

            <nav className="flex flex-col gap-2">
              {/* Renda Variável Section */}
              <div className="space-y-1 text-left">
                <button
                  onClick={() => {
                    setExpandedCategory(prev => prev === 'rv' ? null : 'rv');
                  }}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left shadow-sm ${['ordens', 'laminas', 'swing-trade', 'posicoes-aberto', 'analise-performance'].includes(activeTab)
                    ? 'bg-primary/10 border-primary text-primary shadow-primary/5'
                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-icons-outlined text-[18px]">signal_cellular_alt</span>
                    <span className="text-[11px] font-black uppercase tracking-tighter">Renda Variável</span>
                  </div>
                  <span className={`material-symbols-outlined text-sm transition-transform ${expandedCategory === 'rv' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>

                {(expandedCategory === 'rv' || ['ordens', 'laminas', 'swing-trade', 'posicoes-aberto', 'analise-performance'].includes(activeTab)) && (
                  <div className="pl-4 pr-1 pt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => setActiveTab('ordens')}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left text-[10px] font-black uppercase tracking-widest ${activeTab === 'ordens'
                        ? 'text-primary bg-primary/5'
                        : 'text-slate-500 hover:text-primary hover:bg-primary/5'}`}
                    >
                      <span className="material-icons-outlined text-base">query_stats</span>
                      Execução de Ordens
                    </button>

                    <button
                      onClick={() => setActiveTab('laminas')}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left text-[10px] font-black uppercase tracking-widest ${activeTab === 'laminas'
                        ? 'text-primary bg-primary/5'
                        : 'text-slate-500 hover:text-primary hover:bg-primary/5'}`}
                    >
                      <span className="material-icons-outlined text-base">description</span>
                      Hawk Strategy
                    </button>

                    <button
                      onClick={() => setActiveTab('swing-trade')}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left text-[10px] font-black uppercase tracking-widest ${activeTab === 'swing-trade'
                        ? 'text-primary bg-primary/5'
                        : 'text-slate-500 hover:text-primary hover:bg-primary/5'}`}
                    >
                      <span className="material-icons-outlined text-base">trending_up</span>
                      Swing Trade
                    </button>

                    <button
                      onClick={() => setActiveTab('posicoes-aberto')}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left text-[10px] font-black uppercase tracking-widest ${activeTab === 'posicoes-aberto'
                        ? 'text-primary bg-primary/5'
                        : 'text-slate-500 hover:text-primary hover:bg-primary/5'}`}
                    >
                      <span className="material-icons-outlined text-base">inventory_2</span>
                      Posições em Aberto
                    </button>

                    <button
                      onClick={() => setActiveTab('analise-performance')}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left text-[10px] font-black uppercase tracking-widest ${activeTab === 'analise-performance'
                        ? 'text-primary bg-primary/5'
                        : 'text-slate-500 hover:text-primary hover:bg-primary/5'}`}
                    >
                      <span className="material-icons-outlined text-base">analytics</span>
                      Análise de Performance
                    </button>
                  </div>
                )}
              </div>

              {/* Renda Fixa Section */}
              <div className="space-y-1 text-left">
                <button
                  onClick={() => {
                    setExpandedCategory(prev => prev === 'rf' ? null : 'rf');
                  }}
                  className={`w-full h-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left shadow-sm ${activeTab.includes('fixed-income') || activeTab === 'renda-fixa'
                    ? 'bg-primary/10 border-primary text-primary shadow-primary/5'
                    : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-icons-outlined text-[18px]">account_balance_wallet</span>
                    <span className="text-[11px] font-black uppercase tracking-tighter">Renda Fixa</span>
                  </div>
                  <span className={`material-symbols-outlined text-sm transition-transform ${expandedCategory === 'rf' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>

                {(expandedCategory === 'rf' || activeTab.includes('fixed-income')) && (
                  <div className="pl-4 pr-1 pt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => setActiveTab('fixed-income-compromissadas')}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left text-[10px] font-black uppercase tracking-widest ${activeTab === 'fixed-income-compromissadas'
                        ? 'text-primary bg-primary/5'
                        : 'text-slate-500 hover:text-primary hover:bg-primary/5'}`}
                    >
                      <span className="material-symbols-outlined text-base">receipt_long</span>
                      Compromissadas / CDB
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-6 px-1 flex flex-col gap-2">
                <div className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] text-center mb-2">
                  FinancePro v5.4.2
                </div>
              </div>
            </nav>
          </div>

          {activeTab === 'ordens' && (
            <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-4 duration-300">
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 flex justify-between">
                  Fila de Disparo
                  <span className="text-primary">{clients.length} Grupos</span>
                </h3>

                <div className="space-y-2">
                  {clients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left shadow-sm ${selectedClientId === client.id
                        ? 'bg-primary/5 border-primary/30 text-primary'
                        : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-icons-outlined text-[18px] opacity-70">
                          {client.orders.length > 0 ? 'layers' : 'person'}
                        </span>
                        <div>
                          <div className={`text-[10px] font-black uppercase tracking-tighter line-clamp-1 ${selectedClientId === client.id ? 'text-primary' : 'text-slate-800 dark:text-slate-200'}`}>
                            {client.name || 'Sem Nome'}
                          </div>
                          <div className="text-[8px] font-bold opacity-70 uppercase tracking-widest">
                            {client.account || '---'} {client.orders.length > 0 && `| ${client.orders.length} ordens`}
                          </div>
                        </div>
                      </div>
                      {client.orders.length > 0 && (
                        <span className={`h-1.5 w-1.5 rounded-full ${selectedClientId === client.id ? 'bg-primary animate-pulse' : 'bg-emerald-500'}`}></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Ações Rápidas</h3>

                <div className="px-1 relative z-50 min-h-[44px]">
                  <ClientSearch
                    placeholder="Adicionar por Busca..."
                    onSelect={addClientFromMaster}
                    className="w-full h-full"
                  />
                </div>

                <div className="px-1">
                  <button
                    onClick={addClient}
                    className="w-full h-11 flex items-center gap-3 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-primary/[0.02] transition-all text-left group"
                  >
                    <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg group-hover:bg-primary/10 transition-all">
                      <span className="material-icons-outlined text-sm text-slate-500 dark:text-slate-400 group-hover:text-primary">person_add</span>
                    </div>
                    <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Novo Cliente (Vazio)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Artificial Intelligence Section */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 mb-4">Inteligência Artificial</h3>
            <button
              onClick={() => setActiveTab('gemini')}
              className={`w-full flex items-center gap-4 px-5 py-3 rounded-xl text-[11px] font-black uppercase transition-all shadow-sm ${activeTab === 'gemini'
                ? 'bg-slate-900 border border-slate-800 text-primary'
                : 'text-slate-500 hover:bg-white/5 hover:text-white border border-transparent'}`}
            >
              <span className="material-symbols-outlined text-[20px]">smart_toy</span>
              Gemini AI
            </button>
          </div>

          {/* Settings Section (ADM) */}
          {userProfile?.role === 'adm' && (
            <div className="pt-4 space-y-2">
              <button
                onClick={() => setActiveTab('gestao-usuarios')}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-slate-500 hover:text-primary hover:bg-primary/5 transition-all text-left ${activeTab === 'gestao-usuarios' ? 'text-primary bg-primary/5' : ''}`}
              >
                <span className="material-icons-outlined text-lg">admin_panel_settings</span>
                <span className="text-[10px] font-black uppercase tracking-widest">Gestão de Usuários</span>
              </button>
            </div>
          )}
        </div>

        <div className="mt-auto p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={userProfile?.avatar_url || "https://picsum.photos/100/100?random=10"} alt="Avatar" className="rounded-xl h-10 w-10 border border-white/10" />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-primary border-2 border-white dark:border-[#102218] rounded-full"></span>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-tight truncate max-w-[120px]">
                  {userProfile?.full_name || 'Usuário'}
                </p>
                <p className="text-[9px] font-bold text-primary uppercase tracking-tighter italic">
                  {userProfile?.role || 'Aguardando...'}
                </p>
              </div>
            </div>
          </div>

          {activeTab === 'ordens' && (
            <button
              onClick={handleSendAll}
              className="w-full bg-slate-900 border border-slate-800 dark:bg-primary hover:bg-black dark:hover:bg-primary-dark text-primary dark:text-white font-black py-4 px-6 rounded-[1.25rem] flex items-center justify-center gap-3 transition-all shadow-xl shadow-primary/10 active:scale-95 group"
            >
              <span className="material-icons-outlined text-lg group-hover:rotate-12 transition-transform">rocket_launch</span>
              <span className="text-xs uppercase tracking-[0.2em]">Disparar Lote</span>
            </button>
          )}

          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest text-center pt-6">
            © 2024 FINANCEPRO
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col bg-[#fdfdfd] dark:bg-background-dark selection:bg-primary/20">
        <header className="sticky top-0 z-40 w-full px-10 py-6 flex items-center justify-between bg-white/80 dark:bg-card-dark/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
              {activeTab === 'ordens' ? 'Fila de Disparo' :
                activeTab === 'laminas' ? 'Hawk Strategy' :
                  activeTab === 'swing-trade' ? 'Swing Trade Safra' :
                    activeTab === 'posicoes-aberto' ? 'Posições em Aberto' :
                      activeTab === 'renda-fixa' || activeTab === 'fixed-income-compromissadas' ? 'Investimentos RF' :
                        activeTab === 'relatorios' ? 'Central de Relatórios' :
                          activeTab === 'gestao-usuarios' ? 'Administração de Usuários' :
                            activeTab === 'analise-performance' ? 'Análise de Performance' :
                              'AI Assistant'}
            </h1>
            <p className="text-sm font-medium text-slate-500 italic">
              {activeTab === 'ordens' ? 'Disparo de ordens estruturadas via API/Outlook' :
                activeTab === 'laminas' ? 'Gerador de Lâminas e Cardápios Safra Invest' :
                  activeTab === 'swing-trade' ? 'Recomendações Equity Research' :
                    activeTab === 'renda-fixa' || activeTab === 'fixed-income-compromissadas' ? 'Gestão de Títulos e Ativos Bancários' :
                      activeTab === 'relatorios' ? 'Análise de performance e extratos' :
                        activeTab === 'gestao-usuarios' ? 'Gerenciamento de acessos e perfis' :
                          activeTab === 'analise-performance' ? 'Análise detalhada de rentabilidade' :
                            'Inteligência Artificial Integrada'}
            </p>
          </div>

          {activeTab === 'ordens' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase">Fila:</span>
                <span className="text-xs font-black text-emerald-600">{clients.length} Ativos</span>
              </div>
            </div>
          )}
        </header>

        <div className="px-10 py-10 max-w-[1400px]">
          {renderContent()}
        </div>

        <footer className="p-10 pt-0">
          <div className="max-w-[1400px] mx-auto bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-2xl p-5 flex items-center gap-4">
            <span className="material-icons-outlined text-primary text-xl">info</span>
            <p className="text-[10px] font-black text-emerald-800 dark:text-primary uppercase tracking-widest leading-relaxed">
              DICA: O novo layout unificado agora suporta modo escuro em todos os módulos.
            </p>
          </div>
        </footer>
      </main >

      {/* Dark Mode Toggle */}
      < button
        className="fixed bottom-10 right-10 h-14 w-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 hover:-rotate-12 transition-all active:scale-95 group z-[100]"
        onClick={() => document.documentElement.classList.toggle('dark')}
      >
        <span className="material-icons-outlined text-slate-600 dark:text-slate-400 group-hover:text-primary text-2xl">dark_mode</span>
      </button >

      {previewClient && (
        <EmailPreviewModal
          client={previewClient}
          isBulk={bulkQueue.length > 1}
          isSending={isSendingAPI}
          onClose={() => {
            setPreviewClient(null);
            setBulkQueue([]);
          }}
          onCopyAndOpen={() => handleManualAction(previewClient)}
          onSendAPI={() => {
            const content = document.getElementById('outlook-html-content')?.innerHTML;
            if (content) sendViaOutlookAPI(previewClient, content);
          }}
        />
      )}
    </div >
  );
};

export default App;
