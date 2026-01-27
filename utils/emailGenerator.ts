
export const generateOrderEmailHtml = (client: { nome: string }, orders: any[], exitOrders?: any[]) => {
    const renderTableRows = (items: any[]) => {
        return items.map((order) => {
            const side = order.side || order.type;
            const nature = side === 'Venda' ? 'Venda' : 'Compra';
            const qty = order.value || order.quantity || '0';
            const price = order.mode === 'Mercado' ? 'Mercado' :
                (order.price ? `R$ ${order.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Mercado');

            return `
            <tr>
                <td style="border: 1px solid #000000; padding: 6px; font-family: Arial; font-size: 12px; text-align: left;">
                    ${nature}
                </td>
                <td style="border: 1px solid #000000; padding: 6px; font-family: Arial; font-size: 12px; font-weight: bold; text-align: left;">
                    ${qty}
                </td>
                <td style="border: 1px solid #000000; padding: 6px; font-family: Arial; font-size: 12px; font-weight: bold; text-align: left;">
                    ${order.ticker}
                </td>
                <td style="border: 1px solid #000000; padding: 6px; font-family: Arial; font-size: 12px; text-align: left;">
                    ${price}
                </td>
            </tr>
        `;
        }).join('');
    };

    const parseNumeric = (val: any) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
        return 0;
    };

    const stopOrders = orders.filter(o => {
        const s = parseNumeric(o.stop);
        const t = parseNumeric(o.target);
        return s > 0 || t > 0;
    });

    const renderStopRows = () => {
        return stopOrders.map((o) => {
            const s = parseNumeric(o.stop);
            const t = parseNumeric(o.target);
            const stopLabel = s.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            const targetLabel = t.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            return `
            <tr>
                <td style="border: 1px solid #000000; padding: 6px; font-family: Arial; font-size: 12px; font-weight: bold; text-align: left;">
                    ${o.ticker}
                </td>
                <td style="border: 1px solid #000000; padding: 6px; font-family: Arial; font-size: 12px; text-align: left;">
                    STOP: ${stopLabel} / ALVO: ${targetLabel} - VAC
                </td>
            </tr>
        `;
        }).join('');
    };

    const hasExchange = exitOrders && exitOrders.length > 0;
    const bodyTitle = hasExchange ? 'troca de ativos' : 'execução das ordens';

    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; background-color: #ffffff;">
      <p style="margin-bottom: 16px;">Olá ${client.nome || 'Cliente'}, tudo bem?</p>
      <p style="margin-bottom: 16px;">Conforme conversamos, peço seu ‘de acordo’ para a ${bodyTitle} abaixo:</p>
      
      ${hasExchange ? `
      <p style="margin-bottom: 8px; font-weight: bold; color: #cc0000;">PARA SAÍDA (VENDA):</p>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; border: 1px solid #000000; font-family: Arial; font-size: 12px; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f2f2f2; text-align: left;">
            <th style="border: 1px solid #000000; padding: 6px;">Natureza</th>
            <th style="border: 1px solid #000000; padding: 6px;">Quantidade</th>
            <th style="border: 1px solid #000000; padding: 6px;">Ativo</th>
            <th style="border: 1px solid #000000; padding: 6px;">Preço Est.</th>
          </tr>
        </thead>
        <tbody>
          ${renderTableRows(exitOrders)}
        </tbody>
      </table>
      <p style="margin-bottom: 8px; font-weight: bold; color: #27a673;">PARA ENTRADA (COMPRA):</p>
      ` : ''}

      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; border: 1px solid #000000; font-family: Arial; font-size: 12px;">
        <thead>
          <tr style="background-color: #f2f2f2; text-align: left;">
            <th style="border: 1px solid #000000; padding: 6px;">Natureza da operação</th>
            <th style="border: 1px solid #000000; padding: 6px;">Quantidade</th>
            <th style="border: 1px solid #000000; padding: 6px;">Ativo</th>
            <th style="border: 1px solid #000000; padding: 6px;">Preço</th>
          </tr>
        </thead>
        <tbody>
          ${renderTableRows(orders)}
        </tbody>
      </table>

      ${stopOrders.length > 0 ? `
      <p style="margin-top: 16px; margin-bottom: 16px;">E posicionar as ordens stop abaixo:</p>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; border: 1px solid #000000; font-family: Arial; font-size: 12px;">
        <tbody>
          ${renderStopRows()}
        </tbody>
      </table>
      ` : ''}

      <p style="margin-top: 16px; margin-bottom: 4px;">Aguardo confirmação.</p>
      <p style="margin-top: 0;">Atenciosamente,</p>
      <p style="margin-top: 12px;"><strong>FinancePro Team</strong></p>
    </div>
  `;
};


export const generateOrderEmailSubject = (client: { conta: string, id: string }) => {
    const codId = client.id || Math.floor(100000 + Math.random() * 900000);
    return `Aprovação de Ordem | CC: ${client.conta || '000000'} / COD: ${codId}`;
};

export const generateOrderEmailPlainText = (client: { nome: string }, orders: any[], exitOrders?: any[]) => {
    const formatLine = (order: any) => {
        const side = order.side || order.type;
        const nature = side === 'Venda' ? 'Venda' : 'Compra';
        const qty = order.value || order.quantity || '0';
        const price = order.mode === 'Mercado' ? 'MERCADO' :
            (order.price ? `R$ ${order.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'MERCADO');

        return `${nature} de ${qty} quantidades de ${order.ticker} a preço ${price}`;
    };

    const orderLines = orders.map(formatLine).join('\n');
    const exitLinesText = exitOrders ? exitOrders.map(formatLine).join('\n') : '';

    const parseNumeric = (val: any) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
        return 0;
    };

    const stopLines = orders.filter(o => {
        const s = parseNumeric(o.stop);
        const t = parseNumeric(o.target);
        return s > 0 || t > 0;
    })
        .map(o => {
            const s = parseNumeric(o.stop);
            const t = parseNumeric(o.target);
            return `${o.ticker} - STOP: ${s.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / ALVO: ${t.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - VAC`;
        })
        .join('\n');

    let body = `Olá ${client.nome || 'Cliente'}, tudo bem?\n\n`;

    if (exitOrders && exitOrders.length > 0) {
        body += `Conforme conversamos, peço seu ‘de acordo’ para a troca de ativos abaixo:\n\n`;
        body += `SAÍDA (VENDA):\n${exitLinesText}\n\n`;
        body += `ENTRADA (COMPRA):\n${orderLines}\n\n`;
    } else {
        body += `Conforme conversamos, peço seu ‘de acordo’ para execução das ordens abaixo:\n\n`;
        body += `${orderLines}\n\n`;
    }

    if (stopLines) {
        body += `E posicionar as ordens stop abaixo:\n\n`;
        body += `${stopLines}\n\n`;
    }

    body += `Aguardo confirmação.\n`;
    body += `Atenciosamente,`;

    return body;
};

export const copyAndOpenOutlook = async (to: string, subject: string, htmlContent: string, plainTextContent?: string, cc?: string) => {
    // Create a temporary element to hold the HTML for copying
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    try {
        const plainText = plainTextContent || tempDiv.innerText;
        const data = [new ClipboardItem({
            'text/html': new Blob([htmlContent], { type: 'text/html' }),
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
        })];

        await navigator.clipboard.write(data);

        // Open Outlook with subject, body, and CC
        let mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainText)}`;
        if (cc) {
            mailtoUrl += `&cc=${encodeURIComponent(cc)}`;
        }
        window.location.href = mailtoUrl;
    } catch (err) {
        console.error('Falha ao copiar:', err);
        alert('Erro ao copiar conteúdo para o clipboard. Por favor, tente novamente.');
    } finally {
        document.body.removeChild(tempDiv);
    }
};

export const generateHawkOrderEmailSubject = (client: { conta: string, id: string }) => {
    const codId = client.id || 'N/A';
    return `Aprovação de Ordem Hawk Strategy | CC: ${client.conta || '000000'} / COD: ${codId}`;
};

export const generateHawkOrderEmailHtml = (client: { nome: string }, orders: any[]) => {
    const renderOrderBlocks = () => {
        return orders.map((order) => {
            return `
            <p style="margin: 0; font-family: Arial; font-size: 14px;"><strong>Natureza da aplicação:</strong> Compra – Montagem de operação</p>
            <p style="margin: 0; font-family: Arial; font-size: 14px;"><strong>Financeiro:</strong> R$ ${parseFloat(order.financial).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            <p style="margin: 0; font-family: Arial; font-size: 14px;"><strong>ID:</strong> ${order.assetId}</p>
            <p style="margin: 0; font-family: Arial; font-size: 14px;"><strong>Descrição do ativo:</strong> Hawk Strategy</p>
            <p style="margin: 0; font-family: Arial; font-size: 14px;"><strong>Papel:</strong> ${order.ticker}</p>
            <p style="margin: 0; font-family: Arial; font-size: 14px;"><strong>Percentual de ganho:</strong> ${order.gain}</p>
            <p style="margin: 0; font-family: Arial; font-size: 14px;"><strong>Percentual de proteção (Barreira):</strong> ${order.protection}</p>
            <p style="margin: 0; font-family: Arial; font-size: 14px;"><strong>Vencimento:</strong> ${order.expiration}</p>
            <br/>
            `;
        }).join('');
    };

    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; background-color: #ffffff;">
      <p style="margin-bottom: 16px;">Prezado ${client.nome || 'cliente'},</p>
      <p style="margin-bottom: 16px;">Conforme conversamos, peço seu ‘de acordo’ para execução das ordens abaixo:</p>
      
      ${renderOrderBlocks()}

      <p style="margin-top: 16px; margin-bottom: 4px;">Aguardo confirmação.</p>
      <p style="margin-top: 0;">Atenciosamente,</p>
      <p style="margin-top: 12px;"><strong>FinancePro Team</strong></p>
    </div>
  `;
};

export const generateHawkOrderEmailPlainText = (client: { nome: string }, orders: any[]) => {
    const orderBlocks = orders.map((order) => {
        return `Natureza da aplicação: Compra – Montagem de operação
Financeiro: R$ ${parseFloat(order.financial).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
ID: ${order.assetId}
Descrição do ativo: Hawk Strategy
Papel: ${order.ticker}
Percentual de ganho: ${order.gain}
Percentual de proteção (Barreira): ${order.protection}
Vencimento: ${order.expiration}`;
    }).join('\n\n');

    let body = `Prezado ${client.nome || 'cliente'},\n\n`;
    body += `Conforme conversamos, peço seu ‘de acordo’ para execução das ordens abaixo:\n\n`;
    body += `${orderBlocks}\n\n`;
    body += `Aguardo confirmação.\n`;
    body += `Atenciosamente,\n`;
    body += `FinancePro Team`;

    return body;
};

export const generateFixedIncomeEmailSubject = (type: string, account: string) => {
    return `APROVAÇÃO DE ${type.toUpperCase()} EM RENDA FIXA | CC: ${account}`;
};

export const generateFixedIncomeEmailHtml = (data: {
    clientName: string,
    account: string,
    movementType: string,
    asset: string,
    issuer: string,
    rate: string,
    maturity: string,
    value: number
}) => {
    const formattedValue = data.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; background-color: #ffffff;">
      <p style="margin-bottom: 24px;">Prezado, bom dia.</p>
      <p style="margin-bottom: 24px;">Conforme conversado com o seu assessor, gostaria de confirmar sua solicitação na realização da ordem abaixo discriminada, cuja liquidação financeira ocorrerá em sua conta SAFRA:</p>
      
      <p style="margin-bottom: 8px;"><strong>Agência 0288 / Conta Corrente:</strong> ${data.account}</p>
      <p style="margin-bottom: 8px;"><strong>Tipo de Movimentação:</strong> ${data.movementType.toUpperCase()}</p>
      <p style="margin-bottom: 8px;"><strong>Ativo:</strong> ${data.asset}</p>
      <p style="margin-bottom: 8px;"><strong>Emissor:</strong> ${data.issuer}</p>
      <p style="margin-bottom: 8px;"><strong>Taxa de rentabilidade (%a.a):</strong> ${data.rate}% do CDI</p>
      <p style="margin-bottom: 8px;"><strong>Carência:</strong> Liquidez Diária</p>
      <p style="margin-bottom: 8px;"><strong>Vencimento:</strong> ${data.maturity}</p>
      <p style="margin-bottom: 8px;"><strong>Valor:</strong> ${formattedValue}</p>
      
      <p style="margin-top: 24px; margin-bottom: 4px;">Atenciosamente,</p>
      <p style="margin-top: 12px;"><strong>FinancePro Team</strong></p>
    </div>
  `;
};

export const generateFixedIncomeEmailPlainText = (data: {
    account: string,
    movementType: string,
    asset: string,
    issuer: string,
    rate: string,
    maturity: string,
    value: number
}) => {
    const formattedValue = data.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return `Prezado, bom dia.

Conforme conversado com o seu assessor, gostaria de confirmar sua solicitação na realização da ordem abaixo discriminada, cuja liquidação financeira ocorrerá em sua conta SAFRA:

Agência 0288 / Conta Corrente: ${data.account}
Tipo de Movimentação: ${data.movementType.toUpperCase()}
Ativo: ${data.asset}
Emissor: ${data.issuer}
Taxa de rentabilidade (%a.a): ${data.rate}% do CDI
Carência: Liquidez Diária
Vencimento: ${data.maturity}
Valor: ${formattedValue}

Atenciosamente,
FinancePro Team`;
};
