<?php

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$diretorio = '/home/webdownloads/inventory/';

$inventario = [];

/*
 * Procura JSON recursivamente dentro de /inventory/
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

    /*
     * Só processa arquivos JSON.
     */
    if (strtolower($arquivoInfo->getExtension()) !== 'json') {
        continue;
    }

    $nome = $arquivoInfo->getFilename();

    /*
     * Ignora arquivos auxiliares.
     */
    if (
        $nome === 'test.json' ||
        $nome === 'inventory.last.json'
    ) {
        continue;
    }

    $arquivo = $arquivoInfo->getPathname();

    $conteudo = file_get_contents($arquivo);

    if ($conteudo === false) {
        continue;
    }

    $dados = json_decode($conteudo, true);

    if ($dados === null) {
        continue;
    }

    $inventario[] = $dados;
}

echo json_encode(
    $inventario,
    JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
);
?>
