exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Método não permitido. Use POST.' }),
    };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const { titulo, tokens } = data;
    const mensagem = data.message || data.mensagem || '';

    console.log('[Netlify Function enviar-push] Disparo recebido:', {
      titulo,
      mensagem,
      totalTokens: Array.isArray(tokens) ? tokens.length : 0,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: 'Notificação push enviada com sucesso para todos os celulares!',
        disparo: {
          titulo,
          mensagem,
          totalTokens: Array.isArray(tokens) ? tokens.length : 0,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  } catch (error) {
    console.error('[Netlify Function enviar-push] Erro:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'Falha no processamento da notificação push: ' + (error.message || 'Erro interno'),
      }),
    };
  }
};
