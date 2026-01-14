
import React, { useState, useEffect } from 'react';
import { ClientGroup as ClientGroupType, OrderItem } from './types.ts';
import ClientGroup from './components/ClientGroup.tsx';
import EmailPreviewModal from './components/EmailPreviewModal.tsx';
import HawkGenerator from './components/HawkGenerator.tsx';
import SwingTradeGenerator from './components/SwingTradeGenerator.tsx';
import ClientSearch from './components/ClientSearch.tsx';
import { getGeminiResponse } from './services/gemini.ts';
import { supabase } from './services/supabase.ts';
import Login from './components/Login.tsx';
import UserManagement from './components/UserManagement.tsx';
import ApprovalsLayout from './components/ApprovalsLayout.tsx';
import { Session } from '@supabase/supabase-js';
import { copyAndOpenOutlook, generateOrderEmailHtml, generateOrderEmailSubject, generateOrderEmailPlainText } from './utils/emailGenerator.ts';

const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'ordens' | 'laminas' | 'swing-trade' | 'gemini' | 'renda-fixa' | 'relatorios' | 'gestao-usuarios'>('ordens');
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
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      setIsAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
      setIsAuthLoading(false);
    });

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

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      // Fallback: Tentativa de obter do metadados da sessão se a tabela falhar (ex: erro de RLS)
      const sessionUser = (await supabase.auth.getSession()).data.session?.user;
      if (sessionUser) {
        const fallbackProfile = {
          id: userId,
          role: sessionUser.user_metadata?.role || 'usuario_rv',
          full_name: sessionUser.user_metadata?.full_name || 'Usuário',
          email: sessionUser.email
        };
        setUserProfile(fallbackProfile);
        handleRoleRedirect(fallbackProfile.role);
      }
    } else {
      setUserProfile(data);
      handleRoleRedirect(data.role);
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
    if (tab === 'relatorios' || tab === 'gemini') {
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
    return <Login onLoginSuccess={() => setIsAuthLoading(true)} />;
  }

  if (activeTab === 'ordens') {
    return (
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
        onSwitchTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'laminas' || tab === 'swing-trade' || tab === 'ordens') setExpandedCategory('rv');
          if (tab === 'renda-fixa') setExpandedCategory('rf');
          if (tab === 'gestao-usuarios') setExpandedCategory('config');
        }}
      />
    );
  }

  return (
    <div className="flex h-screen bg-[#f6f8f7] overflow-hidden">
      <aside className="w-72 bg-[#102218] flex flex-col border-r border-white/5 shrink-0 z-50">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-primary shadow-inner">
              <span className="material-symbols-outlined text-2xl font-bold">account_balance</span>
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tighter text-white">FINANCEPRO</h2>
              <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] opacity-80">Backoffice Suite</p>
            </div>
          </div>

          <nav className="flex flex-col gap-4">
            {/* Renda Fixa */}
            {hasAccess('renda-fixa') && (
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === 'rf' ? null : 'rf')}
                  className={`flex items-center justify-between w-full px-5 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${expandedCategory === 'rf' ? 'text-white bg-white/5' : 'text-slate-500 hover:text-white'}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                    Renda Fixa
                  </div>
                  <span className={`material-symbols-outlined text-[18px] transition-transform ${expandedCategory === 'rf' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {expandedCategory === 'rf' && (
                  <div className="flex flex-col gap-1 pl-4 mt-1 animate-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => setActiveTab('renda-fixa')}
                      className={`flex items-center gap-4 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all ${activeTab === 'renda-fixa' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Dashboard RF
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Renda Variável */}
            {hasAccess('ordens') && (
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === 'rv' ? null : 'rv')}
                  className={`flex items-center justify-between w-full px-5 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${expandedCategory === 'rv' ? 'text-white bg-white/5' : 'text-slate-500 hover:text-white'}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-[20px]">query_stats</span>
                    Renda Variável
                  </div>
                  <span className={`material-symbols-outlined text-[18px] transition-transform ${expandedCategory === 'rv' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {expandedCategory === 'rv' && (
                  <div className="flex flex-col gap-1 pl-4 mt-1 animate-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => setActiveTab('ordens')}
                      className={`flex items-center gap-4 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all ${activeTab === 'ordens' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Execução de Ordens
                    </button>
                    <button
                      onClick={() => setActiveTab('laminas')}
                      className={`flex items-center gap-4 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all ${activeTab === 'laminas' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Gerador de Lâminas
                    </button>
                    <button
                      onClick={() => setActiveTab('swing-trade')}
                      className={`flex items-center gap-4 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all ${activeTab === 'swing-trade' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Swing Trade
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Relatórios */}
            {hasAccess('relatorios') && (
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === 'rel' ? null : 'rel')}
                  className={`flex items-center justify-between w-full px-5 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${expandedCategory === 'rel' ? 'text-white bg-white/5' : 'text-slate-500 hover:text-white'}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-[20px]">description</span>
                    Relatórios
                  </div>
                  <span className={`material-symbols-outlined text-[18px] transition-transform ${expandedCategory === 'rel' ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {expandedCategory === 'rel' && (
                  <div className="flex flex-col gap-1 pl-4 mt-1 animate-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => setActiveTab('relatorios')}
                      className={`flex items-center gap-4 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all ${activeTab === 'relatorios' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      Performance Anual
                    </button>
                  </div>
                )}
              </div>
            )}

            {hasAccess('gemini') && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <button
                  onClick={() => setActiveTab('gemini')}
                  className={`flex items-center gap-4 px-5 py-3 rounded-xl text-[11px] font-black uppercase transition-all w-full ${activeTab === 'gemini' ? 'bg-primary text-[#102218]' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
                >
                  <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                  Gemini AI
                </button>
              </div>
            )}

            {/* Configurações (Apenas ADM) */}
            {userProfile?.role === 'adm' && (
              <div className="flex flex-col gap-1 mt-4">
                <button
                  onClick={() => setExpandedCategory(expandedCategory === 'config' ? null : 'config' as any)}
                  className={`flex items-center justify-between w-full px-5 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${expandedCategory === 'config' as any ? 'text-white bg-white/5' : 'text-slate-500 hover:text-white'}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-[20px]">settings</span>
                    Configurações
                  </div>
                  <span className={`material-symbols-outlined text-[18px] transition-transform ${expandedCategory === 'config' as any ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
                {expandedCategory === 'config' as any && (
                  <div className="flex flex-col gap-1 pl-4 mt-1 animate-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => setActiveTab('gestao-usuarios')}
                      className={`flex items-center gap-4 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all ${activeTab === 'gestao-usuarios' ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                      Gestão de Usuários
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-white/5 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={userProfile?.avatar_url || "https://picsum.photos/100/100?random=10"} alt="Avatar" className="rounded-xl h-10 w-10 border border-white/10" />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-primary border-2 border-[#102218] rounded-full"></span>
              </div>
              <div>
                <p className="text-[10px] font-black text-white uppercase tracking-tight truncate max-w-[120px]">
                  {userProfile?.full_name || 'Usuário'}
                </p>
                <p className="text-[9px] font-bold text-primary uppercase tracking-tighter italic">
                  {userProfile?.role || 'Aguardando...'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
              title="Sair do Sistema"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest">
              <span>Status Sync</span>
              <span className="text-primary">Ativo</span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-primary/40 rounded-full"></div>
            </div>
          </div>

          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest text-center pt-4">
            © 2024 FINANCEPRO
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#f6f8f7] selection:bg-primary/20">
        <header className="sticky top-0 z-40 w-full px-10 py-6 flex items-center justify-between bg-[#f6f8f7]/80 backdrop-blur-md">
          <div>
            <h1 className="text-3xl font-black text-[#102218] tracking-tighter uppercase">
              {activeTab === 'ordens' ? 'Painel de Aprovações' :
                activeTab === 'laminas' ? 'Hawk Strategy' :
                  activeTab === 'swing-trade' ? 'Swing Trade Safra' :
                    activeTab === 'renda-fixa' ? 'Investimentos Renda Fixa' :
                      activeTab === 'relatorios' ? 'Central de Relatórios' :
                        activeTab === 'gestao-usuarios' ? 'Administração de Usuários' :
                          'Gemini AI Assistant'}
            </h1>
            <p className="text-sm font-medium text-slate-500 italic">
              {activeTab === 'ordens' ? 'Disparo de ordens estruturadas via API/Outlook' :
                activeTab === 'laminas' ? 'Gerador de Lâminas e Cardápios Safra Invest' :
                  activeTab === 'swing-trade' ? 'Recomendações Equity Research (Safra Prospect)' :
                    activeTab === 'renda-fixa' ? 'CDB, LCI, LCA e Títulos Públicos' :
                      activeTab === 'relatorios' ? 'Análise de performance e extratos consolidados' :
                        activeTab === 'gestao-usuarios' ? 'Gerenciamento de acessos, perfis e usuários' :
                          'Inteligência Artificial Integrada'}
            </p>
          </div>

          {activeTab === 'ordens' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase">Fila de Disparo:</span>
                <span className="text-xs font-black text-emerald-600">{clients.length} Grupos</span>
              </div>
              <button
                onClick={handleSendAll}
                className="inline-flex items-center gap-2 rounded-xl bg-[#102218] px-8 py-3 text-sm font-black text-primary shadow-xl hover:brightness-125 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">dynamic_feed</span>
                DISPARAR LOTE (API)
              </button>
            </div>
          )}
        </header>

        <div className="px-10 pb-16 max-w-[1400px]">
          {activeTab === 'renda-fixa' && (
            <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">construction</span>
              <h3 className="text-xl font-black text-slate-800 uppercase mb-2">Módulo em Desenvolvimento</h3>
              <p className="text-slate-500 max-w-md font-medium">A central de Renda Fixa está sendo integrada ao Backoffice Suite para consolidar suas operações.</p>
            </div>
          )}

          {activeTab === 'relatorios' && (
            <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">analytics</span>
              <h3 className="text-xl font-black text-slate-800 uppercase mb-2">Relatórios Personalizados</h3>
              <p className="text-slate-500 max-w-md font-medium">Em breve você poderá gerar relatórios de performance e consolidação de carteira neste painel.</p>
            </div>
          )}

          {activeTab === 'ordens' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-6">
                {clients.map(client => (
                  <ClientGroup
                    key={client.id}
                    client={client}
                    onUpdateClient={(updates) => updateClient(client.id, updates)}
                    onRemoveClient={() => removeClient(client.id)}
                    onAddOrder={() => addOrder(client.id)}
                    onUpdateOrder={(orderId, updates) => updateOrder(client.id, orderId, updates)}
                    onRemoveOrder={(orderId) => removeOrder(client.id, orderId)}
                    onSendEmail={() => setPreviewClient(client)}
                  />
                ))}

                <div className="flex flex-col md:flex-row gap-6">
                  <button
                    onClick={addClient}
                    className="flex-1 flex items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-slate-300 p-12 text-slate-400 hover:border-emerald-500 hover:text-emerald-600 hover:bg-white transition-all group shadow-sm"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                      <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform">add_box</span>
                    </div>
                    <div className="text-left">
                      <span className="font-black uppercase tracking-widest text-xs block mb-1">Novo Cliente / Grupo</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Clique para adicionar uma nova carteira vazia</span>
                    </div>
                  </button>

                  <div className="flex-1 rounded-3xl border-2 border-slate-100 bg-white p-12 shadow-sm flex flex-col justify-center">
                    <div className="mb-4">
                      <span className="font-black uppercase tracking-widest text-xs block mb-1 text-slate-500">Importar do Cadastro Master</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Busque por Nome, Sinacor ou Conta para adicionar</span>
                    </div>
                    <ClientSearch
                      onSelect={addClientFromMaster}
                      placeholder="Pesquisar no Cadastro de Clientes..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'laminas' && <HawkGenerator />}
          {activeTab === 'swing-trade' && <SwingTradeGenerator userEmail={userProfile?.email} />}
          {activeTab === 'gestao-usuarios' && <UserManagement />}

          {activeTab === 'gemini' && (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Seu Prompt</label>
                  <textarea
                    value={geminiPrompt}
                    onChange={(e) => setGeminiPrompt(e.target.value)}
                    placeholder="Pergunte algo para o Gemini..."
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[120px] resize-none font-medium text-slate-700"
                  ></textarea>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleGeminiSubmit}
                    disabled={isLoadingGemini || !geminiPrompt.trim()}
                    className="px-8 py-3 rounded-xl bg-[#102218] text-primary font-black uppercase text-xs tracking-wider hover:brightness-125 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    {isLoadingGemini ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                        Processando...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">send</span>
                        Enviar Prompt
                      </>
                    )}
                  </button>
                </div>

                {geminiResponse && (
                  <div className="pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-2">
                    <label className="block text-xs font-black text-emerald-600 uppercase tracking-widest mb-3">Resposta do Gemini</label>
                    <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-slate-700 leading-relaxed dark:prose-invert">
                      {geminiResponse}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

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
    </div>
  );
};

export default App;
