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
    // Passar o Content-Type correto se possível (opcional, por padrão é text/html)
    header("Content-Type: text/html; charset=utf-8");
    echo $content;
}
?>
