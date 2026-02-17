# 🔧 Problema: data_pretendida não estava sendo gravada

## 📋 Diagnóstico do Problema

### **Causa Raiz Identificada:**
A API Next.js `/api/agendamento/route.ts` **não estava capturando nem enviando** o campo `data_pretendida` para o backend PHP, mesmo que o frontend estivesse enviando corretamente.

---

## 🔍 Fluxo de Dados

### **Frontend → API Next.js → PHP → Banco de Dados**

```
ConveniosContent.tsx (Frontend)
    ↓ envia: { ..., data_pretendida: "2026-02-17T14:30:00.000Z" }
    ↓
/api/agendamento/route.ts (API Next.js) ❌ NÃO CAPTURAVA
    ↓ enviava para PHP SEM data_pretendida
    ↓
grava_agendamento_app.php (Backend PHP)
    ↓ não recebia data_pretendida
    ↓
sind.agendamento (Banco PostgreSQL)
    ↓ data_pretendida ficava NULL
```

---

## ✅ Correções Aplicadas

### **1. API Next.js Corrigida** ✅

**Arquivo:** `c:/sasapp/app/api/agendamento/route.ts`

#### **Linha 9 - Extrair campo do body:**
```typescript
// ANTES:
const { cod_associado, id_empregador, cod_convenio, profissional, especialidade, convenio_nome } = body;

// DEPOIS:
const { cod_associado, id_empregador, cod_convenio, profissional, especialidade, convenio_nome, data_pretendida } = body;
```

#### **Linhas 11-19 - Adicionar ao log:**
```typescript
console.log('📥 CAMPOS EXTRAÍDOS:', {
  cod_associado, 
  id_empregador, 
  cod_convenio, 
  profissional, 
  especialidade, 
  convenio_nome,
  data_pretendida  // ✅ ADICIONADO
});
```

#### **Linhas 82-86 - Enviar para PHP:**
```typescript
// Adicionar data_pretendida se foi informada
if (data_pretendida) {
  params.append('data_pretendida', data_pretendida);
  console.log(`📅 [${requestId}] Data pretendida informada:`, data_pretendida);
}
```

#### **Linhas 89-99 - Log dos parâmetros:**
```typescript
console.log(`📤 [${requestId}] PARÂMETROS PARA BACKEND PHP:`, {
  cod_associado: params.get('cod_associado'),
  id_empregador: params.get('id_empregador'),
  cod_convenio: params.get('cod_convenio'),
  data_solicitacao: params.get('data_solicitacao'),
  status: params.get('status'),
  profissional: params.get('profissional'),
  especialidade: params.get('especialidade'),
  convenio_nome: params.get('convenio_nome'),
  data_pretendida: params.get('data_pretendida')  // ✅ ADICIONADO
});
```

---

### **2. PHP Atualizado** ✅

**Arquivo:** `c:/sasapp/grava_agendamento_app_atualizado.php`

#### **Capturar parâmetro:**
```php
$data_pretendida = $_POST['data_pretendida'] ?? null; // NOVO CAMPO
```

#### **SQL Condicional:**
```php
if ($data_pretendida !== null && $data_pretendida !== '') {
    // COM data_pretendida
    $sql = "INSERT INTO sind.agendamento 
            (cod_associado, id_empregador, cod_convenio, data_solicitacao, status, 
             profissional, especialidade, convenio_nome, data_pretendida) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING id";
    
    $params = [
        $cod_associado,
        $id_empregador,
        $cod_convenio,
        $data_solicitacao,
        $status,
        $profissional,
        $especialidade,
        $convenio_nome,
        $data_pretendida  // ✅ INCLUÍDO
    ];
} else {
    // SEM data_pretendida (retrocompatibilidade)
    $sql = "INSERT INTO sind.agendamento 
            (cod_associado, id_empregador, cod_convenio, data_solicitacao, status, 
             profissional, especialidade, convenio_nome) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING id";
    
    $params = [
        $cod_associado,
        $id_empregador,
        $cod_convenio,
        $data_solicitacao,
        $status,
        $profissional,
        $especialidade,
        $convenio_nome
    ];
}
```

---

## 🚀 Próximos Passos

### **1. Executar Script SQL no Banco** ✅
```bash
psql -U seu_usuario -d seu_banco -f c:/sasapp/adicionar_campo_data_agendada.sql
```

Ou via pgAdmin/DBeaver.

### **2. Fazer Upload do PHP Atualizado** 🔴 PENDENTE

**Arquivo local:** `c:/sasapp/grava_agendamento_app_atualizado.php`  
**Destino no servidor:** `https://sas.makecard.com.br/grava_agendamento_app.php`

#### **Como fazer upload:**
- Via FTP/SFTP
- Via painel de controle do servidor
- Via SSH: `scp grava_agendamento_app_atualizado.php usuario@sas.makecard.com.br:/caminho/`

### **3. Testar o Fluxo Completo**

1. Abrir aplicação
2. Ir em Convênios
3. Clicar em "Agendar"
4. Informar data e hora
5. Confirmar agendamento
6. Verificar no banco se `data_pretendida` foi gravada:

```sql
SELECT 
    id,
    cod_associado,
    profissional,
    especialidade,
    data_solicitacao,
    data_pretendida,
    status
FROM sind.agendamento
ORDER BY id DESC
LIMIT 10;
```

---

## 📊 Resumo das Alterações

| Componente | Status | Arquivo |
|------------|--------|---------|
| **Frontend** | ✅ OK | `ConveniosContent.tsx` (já estava correto) |
| **API Next.js** | ✅ CORRIGIDO | `/api/agendamento/route.ts` |
| **Script SQL** | ✅ CRIADO | `adicionar_campo_data_agendada.sql` |
| **PHP Backend** | 🔴 PENDENTE UPLOAD | `grava_agendamento_app_atualizado.php` |
| **Banco de Dados** | 🔴 PENDENTE EXECUÇÃO | Executar script SQL |

---

## 🎯 Fluxo Corrigido

```
ConveniosContent.tsx (Frontend)
    ↓ envia: { ..., data_pretendida: "2026-02-17T14:30:00.000Z" }
    ↓
/api/agendamento/route.ts (API Next.js) ✅ CAPTURA
    ↓ envia para PHP: data_pretendida=2026-02-17T14:30:00.000Z
    ↓
grava_agendamento_app.php (Backend PHP) ✅ RECEBE E GRAVA
    ↓ INSERT com data_pretendida
    ↓
sind.agendamento (Banco PostgreSQL) ✅ CAMPO PREENCHIDO
    ↓ data_pretendida = "2026-02-17 14:30:00+00"
```

---

## ✅ Checklist Final

- [x] Script SQL criado (`adicionar_campo_data_agendada.sql`)
- [x] API Next.js corrigida (`/api/agendamento/route.ts`)
- [x] PHP atualizado criado (`grava_agendamento_app_atualizado.php`)
- [ ] **Executar script SQL no banco de dados**
- [ ] **Fazer upload do PHP atualizado no servidor**
- [ ] **Testar agendamento com data pretendida**

---

## 🔍 Logs para Monitoramento

Após as correções, você verá nos logs:

### **Console do navegador (Frontend):**
```
📤 DADOS FINAIS PARA ENVIO: {
  "cod_associado": "12345",
  "id_empregador": "1",
  "cod_convenio": "10",
  "profissional": "Dr. João Silva",
  "especialidade": "Cardiologia",
  "convenio_nome": "Unimed",
  "data_pretendida": "2026-02-17T14:30:00.000Z"  ✅
}
```

### **Logs do servidor Next.js:**
```
📥 CAMPOS EXTRAÍDOS: {
  cod_associado: '12345',
  id_empregador: '1',
  cod_convenio: '10',
  profissional: 'Dr. João Silva',
  especialidade: 'Cardiologia',
  convenio_nome: 'Unimed',
  data_pretendida: '2026-02-17T14:30:00.000Z'  ✅
}

📅 [abc123] Data pretendida informada: 2026-02-17T14:30:00.000Z  ✅

📤 [abc123] PARÂMETROS PARA BACKEND PHP: {
  cod_associado: '12345',
  id_empregador: '1',
  cod_convenio: '10',
  data_solicitacao: '2026-02-17 11:30:00',
  status: '1',
  profissional: 'Dr. João Silva',
  especialidade: 'Cardiologia',
  convenio_nome: 'Unimed',
  data_pretendida: '2026-02-17T14:30:00.000Z'  ✅
}
```

### **Logs do PHP (error_log):**
```
CAMPOS CAPTURADOS:
cod_associado: 12345
id_empregador: 1
cod_convenio: 10
profissional: Dr. João Silva
especialidade: Cardiologia
convenio_nome: Unimed
data_pretendida: 2026-02-17T14:30:00.000Z  ✅

INSERINDO COM data_pretendida: 2026-02-17T14:30:00.000Z  ✅
SUCESSO - ID gerado: 123
```

---

**Status:** Correções aplicadas no código. Aguardando execução do SQL e upload do PHP no servidor.
