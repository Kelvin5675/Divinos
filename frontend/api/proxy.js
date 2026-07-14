export default async function handler(req, res) {
  try {
    // Pegar o caminho original que o cliente tentou acessar (ex: /pages/convite.html)
    const url = new URL(req.url, `http://${req.headers.host}`);
    const targetPath = url.pathname + url.search;
    
    // Construir a URL alvo apontando para o IP do DirectAdmin
    const targetUrl = `http://37.27.116.83${targetPath}`;
    
    // A MAGIA ACONTECE AQUI:
    // Fazemos o pedido ao DirectAdmin, mas forçamos o cabeçalho 'Host' 
    // para que o servidor partilhado saiba qual site carregar!
    const response = await fetch(targetUrl, {
      headers: {
        'Host': 'divinosgraffic.co.mz',
        'X-Forwarded-For': req.headers['x-forwarded-for'] || '',
        'User-Agent': req.headers['user-agent'] || 'Vercel-MacGyver-Proxy'
      }
    });

    // Copiar o tipo de conteúdo (essencial para carregar imagens e CSS corretamente)
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Copiar o status (ex: 200 OK, 404 Not Found)
    res.status(response.status);

    // Enviar a resposta de volta ao cliente como Buffer (suporta imagens e texto)
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error) {
    res.status(500).send('MacGyver Proxy Falhou: ' + error.message);
  }
}
