
export const generateOrderEmailHtml = (client: { nome: string }, orders: any[]) => {
    const renderTableRows = () => {
        return orders.map((order) => {
            // Adapt from different order types (SwingTrade vs Regular)
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

    const stopOrders = orders.filter(o => (o.stop && o.stop > 0) || (o.target && o.target > 0));
    const renderStopRows = () => {
        return stopOrders.map((o) => {
            const stopLabel = o.stop?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00';
            const targetLabel = o.target?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00';
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

    return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; color: #000000; background-color: #ffffff;">
      <p style="margin-bottom: 16px;">Olá ${client.nome || 'Cliente'}, tudo bem?</p>
      <p style="margin-bottom: 16px;">Conforme conversamos, peço seu ‘de acordo’ para execução das ordens abaixo:</p>
      
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
          ${renderTableRows()}
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

export const generateOrderEmailPlainText = (client: { nome: string }, orders: any[]) => {
    const orderLines = orders.map((order) => {
        const side = order.side || order.type;
        const nature = side === 'Venda' ? 'Venda' : 'Compra';
        const qty = order.value || order.quantity || '0';
        const price = order.mode === 'Mercado' ? 'MERCADO' :
            (order.price ? `R$ ${order.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'MERCADO');

        return `${nature} de ${qty} quantidades de ${order.ticker} a preço ${price}`;
    }).join('\n');

    const stopLines = orders.filter(o => (o.stop && o.stop > 0) || (o.target && o.target > 0))
        .map(o => `${o.ticker} - STOP: ${o.stop?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'} / ALVO: ${o.target?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'} - VAC`)
        .join('\n');

    let body = `Olá ${client.nome || 'Cliente'}, tudo bem?\n\n`;
    body += `Conforme conversamos, peço seu ‘de acordo’ para execução das ordens abaixo:\n\n`;
    body += `${orderLines}\n\n`;

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
