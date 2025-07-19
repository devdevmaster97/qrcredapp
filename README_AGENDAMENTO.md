# Funcionalidade de Agendamento - Dashboard do Associado

## 📋 Resumo da Implementação

Esta funcionalidade permite que os associados solicitem agendamentos com profissionais dos convênios através do dashboard, salvando os dados na tabela `sind.agendamento` no banco PostgreSQL.

## 🎯 Funcionalidades Implementadas

### Dashboard do Associado - Menu Convênios
- **Localização**: `app/dashboard/convenios/page.tsx`
- **Componente**: `app/components/dashboard/ConveniosContent.tsx`
- **Botão "Agendar"**: Cada profissional listado possui um botão verde "Agendar"

### Dashboard do Associado - Menu Agendamentos
- **Localização**: `app/dashboard/agendamentos/page.tsx`
- **Componente**: `app/components/dashboard/AgendamentosContent.tsx`
- **Funcionalidade**: Lista todos os agendamentos solicitados pelo associado

### Fluxo de Agendamento
1. **Usuário clica em "Agendar"** em qualquer profissional
2. **Sistema coleta dados do associado logado** do localStorage
3. **Busca dados completos** via API `/api/localiza-associado`
4. **Envia solicitação** para API `/api/agendamento`
5. **Salva no banco** via endpoint PHP `grava_agendamento_app.php`
6. **Exibe confirmação** com toast de sucesso/erro
7. **Redireciona automaticamente** para a página de Agendamentos

## 🛠️ Arquivos Modificados/Criados

### Arquivos Modificados
1. **`app/components/dashboard/ConveniosContent.tsx`**
   - Adicionado import do `react-hot-toast` e `useRouter`
   - Substituída função `handleAgendar` temporária por implementação real
   - Adicionada lógica para obter dados do associado
   - Implementada chamada para API de agendamento
   - Adicionado redirecionamento para página de agendamentos após sucesso

2. **`app/components/dashboard/Sidebar.tsx`**
   - Adicionado novo item de menu "Agendamentos" abaixo de "Convênios"
   - Utiliza ícone `FaCalendarAlt` e rota `/dashboard/agendamentos`

### Arquivos Criados
1. **`app/api/agendamento/route.ts`**
   - API route do Next.js para processar agendamentos
   - Valida dados obrigatórios
   - Encaminha para endpoint PHP

2. **`app/api/agendamentos-lista/route.ts`**
   - API route do Next.js para buscar lista de agendamentos
   - Busca agendamentos do associado por matrícula e empregador
   - Encaminha para endpoint PHP `lista_agendamentos_app.php`

3. **`app/dashboard/agendamentos/page.tsx`**
   - Página principal de agendamentos no dashboard
   - Utiliza layout consistente com outras páginas
   - Inclui cabeçalho e componente de conteúdo

4. **`app/components/dashboard/AgendamentosContent.tsx`**
   - Componente para exibir lista de agendamentos
   - Interface responsiva com cards para cada agendamento
   - Exibe status, profissional, especialidade e datas
   - Estados de loading, erro e lista vazia

5. **`grava_agendamento_app.php`** (Para servidor PHP)
   - Script PHP para salvar no banco PostgreSQL
   - Utiliza a classe Banco existente do sistema
   - Insere na tabela `sind.agendamento`

6. **`lista_agendamentos_app.php`** (Para servidor PHP)
   - Script PHP para buscar agendamentos do associado
   - Busca por cod_associado e id_empregador
   - Retorna lista ordenada por data de solicitação

7. **`README_AGENDAMENTO.md`**
   - Este arquivo de documentação

## 🗄️ Estrutura da Tabela

```sql
SELECT id, cod_associado, id_empregador, data_solicitacao, cod_convenio, status
FROM sind.agendamento;
```

### Campos da Tabela
- **id**: Chave primária (auto increment)
- **cod_associado**: Matrícula do associado
- **id_empregador**: ID do empregador do associado
- **data_solicitacao**: Data/hora da solicitação
- **cod_convenio**: Código do convênio (padrão: '1')
- **status**: Status do agendamento (1 = Pendente, 2 = Agendado)

## 🚀 Como Testar

### Pré-requisitos
1. Estar logado como associado no dashboard
2. Ter dados válidos no localStorage (`qrcred_user`)
3. Acesso ao menu "Convênios" no dashboard

### Passos para Teste
1. Faça login como associado
2. Acesse o menu "Convênios" no dashboard
3. Navegue pelos profissionais listados
4. Clique em qualquer botão "Agendar" (verde)
5. Aguarde a confirmação via toast
6. Será redirecionado automaticamente para a página "Agendamentos"
7. Verifique se o agendamento aparece na lista

### Teste da Página de Agendamentos
1. Acesse diretamente o menu "Agendamentos" no sidebar
2. Verifique se a lista de agendamentos é exibida
3. Cada agendamento deve mostrar: status, profissional, especialidade, data

### Logs para Debug
- **Browser Console**: Logs da requisição e resposta
- **Server Logs**: Logs do PHP (error_log)
- **Network Tab**: Verificar requisições para `/api/agendamento`

## 📝 Dados Enviados no Agendamento

```json
{
  "cod_associado": "123456",
  "id_empregador": 1,
  "cod_convenio": "1",
  "profissional": "Dr. João Silva",
  "especialidade": "Cardiologia",
  "convenio_nome": "Convênio Saúde"
}
```

## ⚙️ Configuração do Backend

### Arquivos PHP
- **grava_agendamento_app.php**: Para salvar novos agendamentos
  - **Local**: `https://sas.makecard.com.br/grava_agendamento_app.php`
  - **Função**: INSERT na tabela sind.agendamento
  
- **lista_agendamentos_app.php**: Para buscar agendamentos existentes
  - **Local**: `https://sas.makecard.com.br/lista_agendamentos_app.php`
  - **Função**: SELECT da tabela sind.agendamento

- **Permissões**: Certifique-se que ambos os arquivos têm permissões de execução

### Banco de Dados
- **Tabela**: `sind.agendamento`
- **Conexão**: Utiliza a classe `Banco` existente
- **Schema**: PostgreSQL

## 🔍 Troubleshooting

### Problemas Comuns

1. **"Usuário não encontrado"**
   - Verificar se há dados no localStorage (`qrcred_user`)
   - Refazer login se necessário

2. **"Não foi possível obter dados do associado"**
   - Verificar API `/api/localiza-associado`
   - Verificar se cartão está válido

3. **"Erro ao processar agendamento"**
   - Verificar se `grava_agendamento_app.php` está acessível
   - Verificar logs do servidor PHP
   - Verificar conexão com banco PostgreSQL

### Debug Steps
1. Abrir DevTools do navegador
2. Ir para aba Network
3. **Para Agendamento:**
   - Clicar em "Agendar"
   - Verificar requisições:
     - POST `/api/localiza-associado`
     - POST `/api/agendamento`
     - POST `grava_agendamento_app.php`
4. **Para Lista de Agendamentos:**
   - Acessar página "Agendamentos"
   - Verificar requisições:
     - POST `/api/localiza-associado`
     - POST `/api/agendamentos-lista`
     - POST `lista_agendamentos_app.php`

## 📊 Status de Agendamento

- **1 - Pendente**: Agendamento solicitado, aguardando confirmação
- **2 - Agendado**: Agendamento confirmado

## 🔐 Segurança

- ✅ Validação de dados obrigatórios
- ✅ Sanitização de entradas
- ✅ Headers CORS configurados
- ✅ Logs de auditoria
- ✅ Tratamento de erros

## 📈 Próximas Melhorias

1. **Interface de Gestão**: Tela para visualizar agendamentos
2. **Notificações**: Email/SMS quando status muda
3. **Calendário**: Integração com sistema de calendário
4. **Histórico**: Visualizar agendamentos anteriores
5. **Cancelamento**: Permitir cancelar agendamentos

---

## ✅ Conclusão

A funcionalidade foi implementada conforme solicitado:
- ✅ Botão "Agendar" funcional em cada convênio
- ✅ Dados salvos na tabela `sind.agendamento`
- ✅ Status inicial: 1 (Pendente)
- ✅ Menu "Agendamentos" adicionado no dashboard
- ✅ Página completa para visualizar agendamentos
- ✅ Redirecionamento automático após agendamento
- ✅ Interface responsiva e consistente
- ✅ Sem alterações em outras partes do código
- ✅ Mantém estilo e estrutura originais

### Funcionalidades Implementadas:
1. **Menu Agendamentos**: Novo item no sidebar abaixo de "Convênios"
2. **Página de Agendamentos**: Lista completa com status, profissional, especialidade
3. **Redirecionamento**: Após agendar, usuário é levado para a lista
4. **Estados visuais**: Loading, erro, lista vazia tratados
5. **APIs completas**: Para salvar e buscar agendamentos 