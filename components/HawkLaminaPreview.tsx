
import React, { useState } from 'react';
import { HawkAsset } from '../types.ts';

interface HawkLaminaPreviewProps {
  asset: HawkAsset;
  onClose: () => void;
}

const HawkLaminaPreview: React.FC<HawkLaminaPreviewProps> = ({ asset, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const gain = asset.gain;
  const protection = asset.protection;

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    const element = document.getElementById('printable-lamina');
    if (!element) return;

    const html2pdfGlobal = (window as any).html2pdf;
    if (!html2pdfGlobal) {
      alert("Biblioteca de PDF ainda não carregada.");
      setIsGenerating(false);
      return;
    }

    const opt = {
      margin: 0,
      filename: `Lamina_Safra_Hawk_${asset.ticker}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 3, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      await html2pdfGlobal().from(element).set(opt).save();
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      alert('Erro ao gerar PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Barra de Ações Superior */}
        <div className="px-6 py-3 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#002041]">description</span>
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Visualização da Lâmina Institucional</h2>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleDownloadPdf} 
              disabled={isGenerating}
              className="bg-[#002041] text-white px-6 py-2 rounded-lg text-xs font-black hover:bg-[#003060] transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              {isGenerating ? 'GERANDO...' : 'BAIXAR PDF'}
            </button>
            <button onClick={onClose} className="bg-slate-100 text-slate-500 px-6 py-2 rounded-lg text-xs font-black hover:bg-slate-200 transition-all uppercase">
              Fechar
            </button>
          </div>
        </div>

        {/* Conteúdo do PDF */}
        <div className="flex-1 overflow-y-auto bg-[#e5e7eb] p-8">
          <div id="printable-lamina" className="bg-white w-[210mm] mx-auto text-[#002041] font-sans shadow-lg">
            
            {/* --- PÁGINA 1 --- */}
            <div className="relative p-[15mm] h-[297mm] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="pt-4">
                  <p className="text-[12px] font-bold uppercase tracking-widest mb-1">MESA DE DERIVATIVOS</p>
                  <h1 className="text-[32px] font-bold tracking-tighter leading-none mb-4">Produtos Personalizados</h1>
                  <div className="inline-block bg-white border border-[#002041] rounded-full px-8 py-2 shadow-sm">
                    <span className="text-[16px] font-bold text-[#002041] italic">Hawk Strategy</span>
                  </div>
                </div>
                <div className="bg-[#002041] p-6 pr-10 pb-10">
                  <div className="text-white text-[42px] font-bold leading-none tracking-tighter">
                    Safra <span className="font-light italic text-[38px]">Invest</span>
                  </div>
                </div>
              </div>

              {/* Banner do Ativo */}
              <div className="bg-[#b29148] text-white py-3 px-10 flex justify-between items-center mb-8">
                <div className="flex items-center gap-6">
                  <span className="text-[14px] font-medium opacity-90">Ativo Objeto:</span>
                  <span className="text-[20px] font-bold">{asset.ticker}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-[14px] font-medium opacity-90">Vencimento em</span>
                  <span className="text-[20px] font-bold">{asset.expiration}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-8">
                {/* Sobre a operação */}
                <div>
                  <h3 className="text-[20px] font-bold mb-4 border-b-2 border-[#b29148] inline-block pr-12 pb-1">Sobre a operação</h3>
                  <p className="text-[13px] leading-snug mb-4">
                    A Hawk (Forward Knockout) é uma estratégia de investimento que consiste na busca de retorno financeiro prefixado com risco conhecido no início da operação.
                  </p>
                  <p className="text-[13px] leading-snug mb-4">
                    O prêmio da estratégia, a barreira de proteção e o vencimento são definidos ao contratar a estrutura.
                  </p>
                </div>

                {/* Performance da Operação */}
                <div>
                  <h3 className="text-[18px] font-bold mb-4 text-center">Performance da Operação</h3>
                  <table className="w-full text-[12px] border-collapse">
                    <thead>
                      <tr className="bg-[#002041] text-white">
                        <th className="py-2 px-4 border-r border-white/20">Ação</th>
                        <th className="py-2 px-4">Rentabilidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { l: '+ 11,20%', v: `+ ${gain}` },
                        { l: '+ 2,80%', v: `+ ${gain}` },
                        { l: '+ 1,40%', v: `+ ${gain}` },
                        { l: '0,00%', v: `+ ${gain}` },
                        { l: '- 3,00%', v: `+ ${gain}` },
                        { l: '- 5,99%', v: `+ ${gain}` },
                        { l: `- ${protection}`, v: `- ${protection}` },
                        { l: '- 9,00%', v: '- 9,00%' }
                      ].map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-[#f0f4f8]' : 'bg-white'}>
                          <td className="py-1.5 px-4 text-center border-r border-slate-200">{row.l}</td>
                          <td className="py-1.5 px-4 text-center font-bold">{row.v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Título Cenários */}
              <div className="bg-[#002041] text-white py-1.5 px-6 mb-4 w-fit pr-24 rounded-r-full">
                <span className="text-[14px] font-bold uppercase tracking-tight">Cenários e gráfico de rentabilidade</span>
              </div>

              {/* Cards de Cenário */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-[#f0f4f8] border border-slate-200 p-4 flex items-center gap-6 rounded-sm">
                  <span className="material-symbols-outlined text-[32px]">bar_chart</span>
                  <div>
                    <p className="text-[11px] font-bold uppercase">Melhor Cenário</p>
                    <p className="text-[18px] font-bold text-[#b29148]">+{gain}</p>
                  </div>
                </div>
                <div className="bg-[#f0f4f8] border border-slate-200 p-4 flex items-center gap-6 rounded-sm">
                  <span className="material-symbols-outlined text-[32px]">warning</span>
                  <div>
                    <p className="text-[11px] font-bold uppercase">Pior Cenário</p>
                    <p className="text-[10px] leading-tight font-medium">A barreira ser acionada e o investidor ficar com o ativo em carteira.</p>
                  </div>
                </div>
              </div>

              {/* Texto explicativo */}
              <div className="bg-[#f0f4f8] p-6 rounded-sm mb-8 text-[12px] leading-relaxed space-y-4">
                <p>I. A estratégia garante o prêmio prefixado ({gain}) em qualquer cenário que o ativo não tenha desvalorização superior a barreira de proteção ({protection}). No encerramento da operação o investidor recebe o prêmio prefixado definido.</p>
                <p>II. Se a barreira for acionada em qualquer momento até o vencimento da estratégia, as opções expiram e o investidor fica com o ativo ({asset.ticker}) em carteira.</p>
              </div>

              {/* Gráfico SVG Payoff */}
              <div className="mt-auto relative h-[70mm] w-full">
                 <svg viewBox="0 0 800 300" className="w-full h-full">
                    {/* Eixos */}
                    <line x1="100" y1="50" x2="100" y2="250" stroke="#ff0000" strokeWidth="2" /> {/* Eixo Y Prejuízo/Ganho */}
                    <line x1="80" y1="200" x2="700" y2="200" stroke="#000000" strokeWidth="1" /> {/* Eixo X */}
                    
                    {/* Linha Desempenho Ativo (Pontilhada) */}
                    <line x1="100" y1="200" x2="650" y2="50" stroke="#002041" strokeWidth="1" strokeDasharray="5,5" opacity="0.6" />
                    
                    {/* Linha Resultado Operação (Azul Forte) */}
                    <path d="M 100 250 L 300 200 L 400 130 L 700 130" fill="none" stroke="#002041" strokeWidth="3" />
                    
                    {/* Pontos de Destaque */}
                    <circle cx="400" cy="130" r="6" fill="#002041" />
                    <circle cx="300" cy="200" r="5" fill="#002041" />

                    {/* Rótulos e Texto */}
                    <text x="50" y="150" transform="rotate(-90 50,150)" className="text-[14px] font-bold" fill="#008000">Ganho</text>
                    <text x="50" y="240" transform="rotate(-90 50,240)" className="text-[14px] font-bold" fill="#ff0000">Prejuízo</text>
                    
                    <text x="410" y="120" className="text-[14px] font-bold">Ganho de {gain}</text>
                    <text x="150" y="260" className="text-[14px] font-bold text-[#002041]">Proteção de {protection}</text>
                    <text x="350" y="280" className="text-[12px]">Entrada na operação</text>
                    
                    {/* Legenda */}
                    <rect x="580" y="230" width="180" height="60" fill="white" stroke="#e5e7eb" />
                    <text x="590" y="245" className="text-[10px] font-bold">Legenda</text>
                    <line x1="600" y1="260" x2="630" y2="260" stroke="#002041" strokeWidth="1" strokeDasharray="3,3" />
                    <text x="640" y="263" className="text-[10px]">Desempenho do ativo</text>
                    <rect x="600" y="275" width="20" height="10" fill="#002041" />
                    <text x="640" y="283" className="text-[10px]">Resultado da operação</text>
                 </svg>
              </div>
            </div>

            {/* --- PÁGINA 2 --- */}
            <div className="relative p-[15mm] h-[297mm] flex flex-col page-break-before" style={{ pageBreakBefore: 'always' }}>
              <div className="bg-[#002041] text-white py-2 px-6 mb-10 w-fit pr-24 rounded-r-full">
                <span className="text-[18px] font-bold uppercase tracking-tight">Principais Características</span>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-12">
                <div className="bg-[#f0f4f8] p-8 rounded-lg shadow-sm">
                  <h4 className="font-bold text-[#b29148] text-[16px] mb-3">Por que utilizar?</h4>
                  <p className="text-[12px] leading-relaxed">Hawk é a operação para o investidor que acredita que o ativo não sofrerá grandes oscilações no curto/médio prazo e deseja trocar uma possível valorização por uma taxa prefixada.</p>
                </div>
                <div className="bg-[#f0f4f8] p-8 rounded-lg shadow-sm">
                  <h4 className="font-bold text-[#b29148] text-[16px] mb-3">Para quem é indicado?</h4>
                  <p className="text-[12px] leading-relaxed">Apesar de possuir proteção parcial contra a queda do ativo, a Hawk é uma estratégia de perfil agressivo indicada apenas para investidores dinâmicos e que entendem os riscos envolvidos.</p>
                </div>
                <div className="bg-[#f0f4f8] p-8 rounded-lg shadow-sm">
                  <h4 className="font-bold text-[#b29148] text-[16px] mb-3">Quando entrar?</h4>
                  <p className="text-[12px] leading-relaxed">Quando o investidor acredita que o papel não sofrerá alterações significativas no curto/médio prazo e deseja rentabilizar sua posição com uma taxa fixa.</p>
                </div>
                <div className="bg-[#f0f4f8] p-8 rounded-lg shadow-sm">
                  <h4 className="font-bold text-[#b29148] text-[16px] mb-3">Quando não entrar?</h4>
                  <p className="text-[12px] leading-relaxed">Caso o investidor possua um viés de forte queda no curto/médio prazo, existem estruturas com características e retornos mais atraentes. Consulte a Mesa de Safra Corretora.</p>
                </div>
              </div>

              <div className="space-y-6 mb-12">
                <section>
                  <h4 className="text-[16px] font-bold text-[#b29148] mb-1">Qual o objetivo?</h4>
                  <p className="text-[13px]">Constituído pela combinação de dois instrumentos de derivativos e a compra do papel, a Hawk tem como principal objetivo a busca por um retorno máximo prefixado dependente da oscilação do ativo.</p>
                </section>
                <section>
                  <h4 className="text-[16px] font-bold text-[#b29148] mb-1">No que consiste?</h4>
                  <p className="text-[13px]">Considerando a compra de {asset.ticker} no preço de fechamento do dia da operação, a Hawk consiste na compra de uma Put com preço de exercício a 102,80% e KO a 94,00% e a venda de uma Call com os mesmos parâmetros.</p>
                </section>
                <section>
                  <h4 className="text-[16px] font-bold text-[#b29148] mb-1">Dinâmica da Operação</h4>
                  <p className="text-[13px]">A compra do ativo e da estrutura de derivativos fornecem um cenário onde, caso o papel não atinja a barreira em nenhum momento, o investidor leva a taxa prefixada, caso contrário, fica com o ativo no preço de compra inicial.</p>
                </section>
                <div className="flex items-center gap-6 mt-4">
                  <span className="text-[14px] font-bold text-[#b29148]">Qual é o perfil da operação?</span>
                  <div className="bg-[#002041] text-white px-8 py-1 rounded-sm text-[12px] font-bold">Dinâmico</div>
                </div>
              </div>

              <div className="bg-[#002041] text-white py-1.5 px-6 mb-6 w-fit pr-24 rounded-r-full">
                <span className="text-[14px] font-bold uppercase tracking-tight">Detalhes Técnicos</span>
              </div>
              <div className="grid grid-cols-2 gap-x-12 text-[11px] leading-relaxed text-slate-600">
                <ul className="list-disc pl-5 space-y-2">
                  <li>Futuros eventos corporativos (Dividendos, JCP e etc) ajustarão o strike original das opções.</li>
                  <li>A operação possui chamada de margem que deverá ser depositada pelo investidor. Esse valor pode ser coberto com ativos ou financeiro.</li>
                  <li>Dependendo do desempenho do papel, poderá haver chamada de margem adicional.</li>
                </ul>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Saída antecipada está sujeita as condições de mercado.</li>
                  <li>O investidor desembolsa o valor da compra do ativo. Há também custos de corretagem e emolumentos.</li>
                  <li>Ao longo da vigência, os ativos podem ser alocados para aluguel com taxa de 0,10% a.a.</li>
                </ul>
              </div>
            </div>

            {/* --- PÁGINA 3 --- */}
            <div className="relative p-[15mm] h-[297mm] flex flex-col page-break-before" style={{ pageBreakBefore: 'always' }}>
               <div className="bg-[#002041] text-white py-2 px-6 mb-8 w-fit pr-24 rounded-r-full">
                <span className="text-[18px] font-bold uppercase tracking-tight">Riscos</span>
              </div>
              <div className="space-y-6 mb-12">
                <section>
                  <h4 className="text-[15px] font-bold text-[#b29148] mb-1">Riscos gerais</h4>
                  <p className="text-[12px] text-slate-600">A proteção oferecida por essa estrutura é parcial, o que significa dizer que o investidor não possui proteção contra qualquer queda, podendo ficar com o papel em carteira a um preço inferior ao de compra.</p>
                </section>
                <section>
                  <h4 className="text-[15px] font-bold text-[#b29148] mb-1">Entrega do ativo</h4>
                  <p className="text-[12px] text-slate-600">Por utilizar Opções Flexíveis, essa operação não possui entrega física do papel. A liquidação, seja no cenário de lucro ou prejuízo, é realizada através de ajuste financeiro.</p>
                </section>
                <section>
                  <h4 className="text-[15px] font-bold text-[#b29148] mb-1">Chamada de margem</h4>
                  <p className="text-[12px] text-slate-600">Consiste no valor que a B3 entende como necessário para garantir a liquidação da operação e o funcionamento adequado do mercado. Sempre existe o risco de chamadas adicionais.</p>
                </section>
              </div>

              <div className="bg-[#002041] text-white py-2 px-6 mb-8 w-fit pr-24 rounded-r-full">
                <span className="text-[18px] font-bold uppercase tracking-tight">Ressalvas</span>
              </div>
              <div className="space-y-4 text-[11px] text-slate-600 leading-relaxed mb-12">
                <p>• Por ser estruturada em um mercado de balcão organizado, essa operação possui riscos de contraparte e de má formação de preços. Não se aplica o Mecanismo de Ressarcimento de Prejuízo.</p>
                <p>• Para que a estrutura tenha o comportamento descrito é imprescindível que o investidor não faça nenhuma alteração nos instrumentos.</p>
                <p>• Por se tratar de uma combinação única de diferentes instrumentos financeiros, é essencial que o investidor tenha total clareza dos termos e condições, conhecendo seus riscos e cenários de lucro.</p>
                <p>• Estimativa de custo de distribuição para Operações Estruturadas é de 0,24% ao ano.</p>
              </div>

              <div className="bg-[#002041] text-white py-2 px-6 mb-8 w-fit pr-24 rounded-r-full">
                <span className="text-[18px] font-bold uppercase tracking-tight">Sobre a Mesa de Derivativos</span>
              </div>
              <div className="text-[12px] text-slate-700 leading-relaxed space-y-4">
                <p>As recentes mudanças no mercado financeiro brasileiro nos incentivam a buscar soluções de investimentos criativas e únicas. Nesse cenário, cada vez mais os Produtos Personalizados tornam-se ferramentas indispensáveis em nossas carteiras.</p>
                <p>A Safra Corretora oferece produtos de qualidade, feitos sob medida para cada investidor. Independentemente do perfil, da aversão ao risco ou da visão de mercado, os Produtos Personalizados oferecem uma oportunidade para o investidor trabalhar lado a lado conosco.</p>
                <p>Divididos em quatro grandes grupos de operações (Proteção, Otimismo, Performance e Alavancagem), a Mesa de Derivativos possui uma gama enorme de produtos para atender a necessidade de seus clientes.</p>
              </div>
            </div>

            {/* --- PÁGINA 4 --- */}
            <div className="relative p-[15mm] h-[297mm] flex flex-col page-break-before" style={{ pageBreakBefore: 'always' }}>
              <div className="bg-[#002041] text-white py-2 px-6 mb-8 w-fit pr-24 rounded-r-full">
                <span className="text-[18px] font-bold uppercase tracking-tight">Glossário</span>
              </div>
              <div className="grid grid-cols-[150px_1fr] gap-y-2 text-[11px] mb-12 border-b pb-8">
                <div className="font-bold text-slate-500">B3:</div><div>B3 S.A. - Brasil, Bolsa, Balcão</div>
                <div className="font-bold text-slate-500">Prazo (DU):</div><div>Tempo, em dias úteis, até o vencimento das opções.</div>
                <div className="font-bold text-slate-500">Vencimento:</div><div>Dia do vencimento das opções.</div>
                <div className="font-bold text-slate-500">Ativo Objeto:</div><div>Ação ou carteira de ações sobre o qual a operação foi gerada.</div>
                <div className="font-bold text-slate-500">Derivativos:</div><div>Contratos que derivam a maior parte do seu valor de um ativo objeto específico.</div>
                <div className="font-bold text-slate-500">Call/Put:</div><div>Direito de compra ou venda de certo ativo em uma data específica.</div>
                <div className="font-bold text-slate-500">Strike:</div><div>Preço que o titular de uma opção poderá comprar ou vender o ativo.</div>
              </div>

              <div className="bg-[#002041] text-white py-2 px-6 mb-6 w-fit pr-24 rounded-r-full">
                <span className="text-[18px] font-bold uppercase tracking-tight">Disclaimer</span>
              </div>
              <div className="text-[9px] text-slate-400 leading-tight space-y-3 uppercase font-medium">
                <p>Este material não foi preparado por um Analista de Valores Mobiliários, tampouco esta mensagem configura-se um Relatório de Análise, conforme a definição da Resolução nº 20 da CVM.</p>
                <p>Este material tem conteúdo meramente informativo não devendo, portanto, ser interpretado como recomendação de investimento. O conteúdo deste material é destinado exclusivamente às pessoas e/ou organizações indicadas no endereçamento.</p>
                <p>Todo investimento nos mercados financeiro e de capitais apresenta riscos e quaisquer referências a rentabilidades passadas não significam garantia de rentabilidade futura. A rentabilidade simulada não é líquida de impostos.</p>
                <p>Os produtos apresentados neste material podem não ser adequados para todos os perfis de clientes. Antes de qualquer decisão, os clientes deverão responder o questionário de suitability e confirmar se os produtos são indicados para o seu perfil.</p>
                <p>O investimento em opções é preferencialmente indicado para investidores de perfil moderado e dinâmico. Posições vendidas apresentam a possibilidade de perda do capital investido.</p>
                <p>Safra Corretora de Valores e Câmbio Ltda. Central de Atendimento Safra: 0300 105 1234. Ouvidoria: 0800 770 1236.</p>
              </div>

              <div className="mt-auto border-t pt-4 flex justify-between items-end">
                <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">Pág. 04 de 04</div>
                <div className="text-[14px] font-bold text-[#002041]">Safra <span className="font-light italic">Invest</span></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default HawkLaminaPreview;
