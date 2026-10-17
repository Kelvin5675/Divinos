export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const targetPath = url.pathname + url.search;
    const host = req.headers.host || 'divinos.vercel.app';

    // 1. Rota de Metadados Open Graph para WhatsApp e Redes Sociais (/c/:slug)
    // Permite que divinos.vercel.app/c/:slug exiba foto de capa, títulos e descrição no WhatsApp
    // de forma 100% autônoma, mesmo se o DirectAdmin estiver com problemas de hospedagem.
    if (url.pathname.startsWith('/c/')) {
      const slug = url.pathname.replace(/^\/c\//, '').split('/')[0].split('?')[0];
      if (slug) {
        try {
          const metaRes = await fetch(`https://divinos-backend.onrender.com/api/v1/invitations/meta/${encodeURIComponent(slug)}`);
          if (metaRes.ok) {
            let html = await metaRes.text();
            
            // Garantir que a URL de destino e og:url usem o domínio atual da requisição (Vercel)
            html = html.replace(/https:\/\/divinosgraffic\.co\.mz/g, `https://${host}`);
            html = html.replace(/https:\/\/divinos\.vercel\.app/g, `https://${host}`);
            // Encaminhar para o roteador inteligente, que abre o template escolhido no admin
            html = html.replace(/\/pages\/convite(\.html)?\?slug=/g, '/invitation/?slug=');

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            return res.status(200).send(html);
          }
        } catch (metaErr) {
          console.warn('Fallback para proxy DirectAdmin ao obter meta:', metaErr.message);
        }
      }
    }

    // 2. Proxy reverso para o DirectAdmin para as restantes rotas e arquivos
    const targetUrl = `http://37.27.116.83${targetPath}`;
    const response = await fetch(targetUrl, {
      headers: {
        'Host': 'divinosgraffic.co.mz',
        'X-Forwarded-For': req.headers['x-forwarded-for'] || '',
        'User-Agent': req.headers['user-agent'] || 'Vercel-MacGyver-Proxy'
      }
    });

    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    res.status(response.status);
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error) {
    res.status(500).send('MacGyver Proxy Falhou: ' + error.message);
  }
}
