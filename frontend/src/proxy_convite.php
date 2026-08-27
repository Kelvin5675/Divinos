<?php
// Fallback Proxy para Convites Digitais
// Este ficheiro é utilizado caso o servidor DirectAdmin bloqueie o uso do [P] no .htaccess
$slug = isset($_GET['slug']) ? $_GET['slug'] : '';
$url = "https://divinos-backend.onrender.com/api/v1/invitations/meta/" . urlencode($slug);

// Obter o conteúdo da URL
$content = @file_get_contents($url);

if ($content === FALSE) {
    http_response_code(404);
    echo "Convite não encontrado.";
} else {
    header("Cache-Control: no-cache, no-store, must-revalidate");
    header("Pragma: no-cache");
    header("Expires: 0");
    header("Content-Type: text/html; charset=utf-8");
    // Correção mágica: O backend tem a URL da Vercel "hardcoded". 
    // Em vez de alterar o backend, nós reescrevemos a URL aqui no proxy antes de entregar ao cliente!
    $content = str_replace("https://divinos.vercel.app", "https://divinosgraffic.co.mz", $content);
    echo $content;
}
?>
