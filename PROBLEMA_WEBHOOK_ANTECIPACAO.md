# 🚨 Problema com Webhook ZapSign - Contrato de Antecipação Salarial

## Descrição do Problema

O webhook do ZapSign está falhando ao tentar enviar notificações sobre o "Contrato de Antecipação Salarial" para o servidor `sas.makecard.com.br`.

### Erro Identificado:
```
Erro para estabelecer conexão (Z-02) - HTTPSConnectionPool(host='sas.makecard.com.br', port=443): Read timed out. (read timeout=20)
```

## Análise

1. **Documento criado com sucesso no ZapSign**:
   - Nome: "Contrato de Antecipação Salarial"
   - Status: "pending" (aguardando assinatura)
   - Token: "4e643cb5-f80f-448c-8e4c-5dfd11f4387c"

2. **Problema de comunicação**:
   - O webhook está configurado para enviar para: `https://sas.makecard.com.br/webhook_zapsign.php`
   - O servidor `sas.makecard.com.br` não está respondendo (timeout após 20 segundos)
   - Isso impede que o sistema seja notificado sobre a criação/assinatura do documento

3. **Testes realizados** (19/09/2025):
   - ✅ DNS resolve corretamente: `216.245.210.3`
   - ✅ GET request funciona: Status 200
   - ✅ POST simples funciona: Status 200
   - ✅ Webhook está ativo: Versão 1.3
   - ❌ POST do ZapSign: Timeout após 20 segundos

## Possíveis Causas

~~1. **Servidor offline**: O servidor `sas.makecard.com.br` pode estar fora do ar~~ ✅ Servidor está online
2. **Processamento lento**: O webhook pode estar demorando mais de 20 segundos para processar o payload completo
3. **Payload muito grande**: O documento "Contrato de Antecipação Salarial" pode ter um payload maior que causa timeout
4. **Bloqueio específico**: O servidor pode estar bloqueando ou limitando requisições do ZapSign
5. **Problema no banco de dados**: Operações de banco podem estar travando o processamento

## Soluções Propostas

### Solução Imediata (Temporária)

1. **Verificar manualmente o status da assinatura**:
   - Use o token do signatário para consultar o status
   - A API `/api/verificar-assinatura-zapsign` no sasapp.tec.br pode ser usada

### Solução 1: Corrigir o servidor sas.makecard.com.br

1. **Verificar se o servidor está online**:
   ```bash
   ping sas.makecard.com.br
   curl -I https://sas.makecard.com.br/webhook_zapsign.php
   ```

2. **Verificar logs do servidor**:
   - Apache/Nginx error logs
   - PHP error logs
   - Firewall logs

3. **Testar o webhook manualmente**:
   ```bash
   curl -X POST https://sas.makecard.com.br/webhook_zapsign.php \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

### Solução 2: Configurar webhook alternativo no sasapp.tec.br

1. **Criar nova rota para webhook**:
   ```typescript
   // app/api/webhook-zapsign/route.ts
   export async function POST(request: NextRequest) {
     // Processar webhook do ZapSign
   }
   ```

2. **Atualizar configuração no ZapSign**:
   - Mudar URL do webhook para: `https://sasapp.tec.br/api/webhook-zapsign`

3. **Sincronizar dados com banco principal**:
   - Fazer chamada para API do sas.makecard.com.br quando voltar online

### Solução 3: Implementar sistema de retry

1. **Configurar fila de processamento**:
   - Salvar webhooks falhados localmente
   - Tentar reprocessar periodicamente

2. **Monitoramento ativo**:
   - Verificar status de documentos pendentes
   - Alertar administradores sobre falhas

## Ações Recomendadas

### Para o Administrador do Sistema:

1. **URGENTE**: Verificar status do servidor `sas.makecard.com.br`
2. **Verificar configuração do webhook no painel ZapSign**:
   - Acessar: https://app.zapsign.com.br/dashboard/api
   - Verificar URL configurada
   - Testar webhook manualmente

3. **Logs do ZapSign**:
   - Verificar histórico de tentativas de webhook
   - Identificar padrão de falhas

### Para o Desenvolvedor:

1. **Implementar fallback**:
   - Sistema de verificação periódica de documentos pendentes
   - API para sincronização manual

2. **Melhorar monitoramento**:
   - Alertas quando webhooks falham
   - Dashboard de status de assinaturas

## Informações Técnicas

### Dados do Documento (do log):
```json
{
  "token": "4e643cb5-f80f-448c-8e4c-5dfd11f4387c",
  "name": "Contrato de Antecipação Salarial",
  "status": "pending",
  "created_at": "2025-09-19T00:12:14.268921Z",
  "signer": {
    "name": "William Ribeiro de oliveira",
    "sign_url": "https://app.zapsign.com.br/verificar/764d37c5-bb83-4242-87af-181cfd035666",
    "token": "764d37c5-bb83-4242-87af-181cfd035666"
  }
}
```

### Webhook Esperado:
- **URL**: `https://sas.makecard.com.br/webhook_zapsign.php`
- **Método**: POST
- **Content-Type**: application/json
- **Timeout**: 20 segundos

## Contatos Úteis

- **Suporte ZapSign**: suporte@zapsign.com.br
- **Administrador do servidor**: [inserir contato]
- **Desenvolvedor responsável**: [inserir contato]

## Solução Recomendada

Baseado nos testes realizados, a melhor solução imediata é:

### 1. **Usar o webhook alternativo no sasapp.tec.br**

O webhook alternativo já está implementado e pronto para uso:

```
URL: https://sasapp.tec.br/api/webhook-zapsign
Método: POST
Content-Type: application/json
```

**Vantagens**:
- ✅ Servidor mais rápido e moderno
- ✅ Logs detalhados para debug
- ✅ Tentativa de sincronização com servidor principal
- ✅ Fallback local em caso de falha

### 2. **Passos para implementar**:

1. **No painel do ZapSign**:
   - Acessar: https://app.zapsign.com.br/dashboard/api
   - Ir em "Webhooks"
   - Editar o webhook existente ou criar novo
   - Mudar URL para: `https://sasapp.tec.br/api/webhook-zapsign`

2. **Testar o novo webhook**:
   ```bash
   curl https://sasapp.tec.br/api/webhook-zapsign?status=1
   ```

3. **Monitorar logs**:
   - Verificar console do navegador
   - Verificar logs do servidor Vercel

### 3. **Investigar o servidor principal**:

Paralelamente, o administrador do servidor `sas.makecard.com.br` deve:
- Verificar logs do PHP para erros de timeout
- Otimizar queries do banco de dados
- Aumentar timeout do PHP se necessário
- Verificar se há limitação de tamanho de payload

---

**Última atualização**: 19/09/2025  
**Status**: 🟡 SOLUÇÃO DISPONÍVEL - Webhook alternativo implementado  
**Ação necessária**: Atualizar configuração no ZapSign
