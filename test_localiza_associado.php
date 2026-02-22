<?php
// Script para testar o que localiza_associado_app_2.php está retornando
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== TESTE: localiza_associado_app_2.php ===\n\n";

// Simular POST
$_POST['cartao'] = '02399513606';

echo "📋 Dados POST:\n";
echo "  - cartao: " . $_POST['cartao'] . "\n\n";

// Incluir o arquivo
include "localiza_associado_app_2.php";
?>
