<?php

header('Content-Type: text/plain; charset=utf-8');

$input = file_get_contents("php://input");

if (empty($input)) {
    http_response_code(400);
    echo "JSON vazio";
    exit;
}

$json = json_decode($input, true);

if ($json === null) {
    http_response_code(400);
    echo "JSON invalido";
    exit;
}

if (empty($json['hostname'])) {
    http_response_code(400);
    echo "Hostname ausente";
    exit;
}

if (empty($json['ip'])) {
    http_response_code(400);
    echo "IP ausente";
    exit;
}

$hostname = $json['hostname'];
$ip = $json['ip'];

/*
 * Valida hostname antes de utilizar no nome do arquivo.
 */
if (!preg_match('/^[A-Za-z0-9._-]+$/', $hostname)) {
    http_response_code(400);
    echo "Hostname invalido";
    exit;
}

/*
 * Valida IPv4.
 */
if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
    http_response_code(400);
    echo "IP invalido";
    exit;
}

$diretorio = '/home/webdownloads/inventory/';

/*
 * Define a pasta conforme o hostname.
 *
 * AC-...              -> MATRIZ
 * L01-...             -> LOJA-01
 * LJ01-...            -> LOJA-01
 * C01-...             -> COMBO-01
 * CB01-...            -> COMBO-01
 *
 * Qualquer outro padrão -> OUTROS
 */

if (preg_match('/^AC-/i', $hostname)) {

    $pasta = 'MATRIZ';

} elseif (preg_match('/^(CB|C)([0-9]+)-/i', $hostname, $matches)) {

    $numeroCombo = $matches[2];
    $pasta = 'COMBO-' . $numeroCombo;

} elseif (preg_match('/^(LJ|L)([0-9]+)-/i', $hostname, $matches)) {

    $numeroLoja = $matches[2];
    $pasta = 'LOJA-' . $numeroLoja;

} else {

    $pasta = 'OUTROS';
}

/*
 * Cria a pasta automaticamente caso não exista.
 */
$diretorioDestino = $diretorio . $pasta . '/';

if (!is_dir($diretorioDestino)) {

    if (!mkdir($diretorioDestino, 0750, true)) {
        http_response_code(500);
        echo "Erro ao criar diretorio";
        exit;
    }
}

$novoArquivo = $diretorioDestino . $hostname . '.json';

/*
 * Procura inventários existentes em todas as subpastas.
 *
 * Isso permite detectar mudança de hostname mesmo
 * quando o arquivo antigo estiver em outra pasta.
 */
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator(
        $diretorio,
        FilesystemIterator::SKIP_DOTS
    )
);

foreach ($iterator as $arquivoInfo) {

    if (!$arquivoInfo->isFile()) {
        continue;
    }

    $arquivo = $arquivoInfo->getPathname();

    /*
     * Só processa arquivos JSON.
     */
    if (strtolower($arquivoInfo->getExtension()) !== 'json') {
        continue;
    }

    $nomeArquivo = $arquivoInfo->getFilename();

    /*
     * Não processa arquivos auxiliares.
     */
    if (
        $nomeArquivo === 'test.json' ||
        $nomeArquivo === 'inventory.last.json'
    ) {
        continue;
    }

    /*
     * Não compara o próprio arquivo que será gravado.
     */
    if ($arquivo === $novoArquivo) {
        continue;
    }

    $conteudo = file_get_contents($arquivo);

    if ($conteudo === false) {
        continue;
    }

    $dadosExistentes = json_decode($conteudo, true);

    if (!is_array($dadosExistentes)) {
        continue;
    }

    /*
     * Se encontramos o mesmo IP em outro hostname,
     * removemos o arquivo antigo.
     */
    if (
        isset($dadosExistentes['ip']) &&
        $dadosExistentes['ip'] === $ip
    ) {
        unlink($arquivo);
    }
}

/*
 * Grava o inventário atual.
 */
$resultado = file_put_contents(
    $novoArquivo,
    json_encode(
        $json,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
    ),
    LOCK_EX
);

if ($resultado === false) {
    http_response_code(500);
    echo "Erro ao salvar";
    exit;
}

http_response_code(200);
echo "OK";
?>
