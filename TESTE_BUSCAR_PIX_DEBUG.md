# Debug da API buscar_dados_associado_pix

## Para testar a API manualmente

Crie um arquivo PHP de teste no servidor para verificar se os dados estão chegando corretamente:

```php
<?php
// teste_buscar_pix.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Debug - mostrar todos os dados recebidos
echo json_encode([
    'debug' => [
        'POST' => $_POST,
        'GET' => $_GET,
        'REQUEST' => $_REQUEST,
        'SERVER' => [
            'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'],
            'CONTENT_TYPE' => $_SERVER['CONTENT_TYPE'] ?? 'não definido'
        ],
        'raw_input' => file_get_contents('php://input')
    ],
    'teste' => 'API funcionando',
    'pix' => 'PIX_TESTE_123456'
]);
?>
```

## O que procurar nos logs

### No Console do Navegador (F12):
1. `🔍 Tentando buscar PIX do associado...`
2. `📊 Dados do associado disponíveis:` - Verifique se todos os campos têm valores
3. `📤 Enviando FormData para buscar PIX:` - Verifique os dados sendo enviados
4. `📥 Resposta completa da busca do PIX:` - Veja o que foi retornado

### No Console do Servidor Next.js:
1. `🔍 API buscar-dados-associado-pix: Recebendo requisição...`
2. `🌐 API_URL configurada:` - Verifique se a URL está correta
3. `📋 Dados recebidos:` - Verifique se os dados chegaram na API
4. `📦 FormData sendo enviado:` - Dados enviados para o PHP
5. `📥 Resposta do PHP - Status:` - Status HTTP da resposta
6. `📄 Resposta bruta do PHP:` - O que o PHP retornou

## Possíveis Problemas:

1. **Arquivo PHP não existe no servidor**
   - Verifique se `buscar_dados_associado_pix.php` foi copiado para o servidor

2. **URL incorreta**
   - Verifique as variáveis de ambiente: `API_URL` ou `NEXT_PUBLIC_API_URL`

3. **Dados vazios ou incorretos**
   - Verifique se `matricula`, `id_empregador`, `id_associado` e `id_divisao` têm valores

4. **Erro no PHP**
   - Verifique logs de erro do PHP no servidor

5. **Problema de CORS**
   - Verifique se o header `Access-Control-Allow-Origin` está configurado no PHP
