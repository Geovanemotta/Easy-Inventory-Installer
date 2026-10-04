<?php

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

file_put_contents(
    "/home/webdownloads/inventory/test.json",
    json_encode($json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
);

http_response_code(200);
echo "OK";
?>
