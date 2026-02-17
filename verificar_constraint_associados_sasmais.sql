-- ========================================
-- Script para Verificar e Criar Constraint UNIQUE
-- Tabela: sind.associados_sasmais
-- Necessário para: ON CONFLICT no webhook ZapSign
-- ========================================

-- 1. VERIFICAR SE JÁ EXISTE CONSTRAINT UNIQUE
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'sind' 
  AND table_name = 'associados_sasmais' 
  AND constraint_type = 'UNIQUE';

-- Resultado esperado:
-- Se retornar linhas: constraint já existe ✅
-- Se retornar vazio: precisa criar constraint ⚠️

-- ========================================

-- 2. VERIFICAR ESTRUTURA DA TABELA
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'sind'
  AND table_name = 'associados_sasmais'
ORDER BY ordinal_position;

-- ========================================

-- 3. VERIFICAR SE HÁ DUPLICATAS EXISTENTES
-- (Executar ANTES de criar a constraint)
SELECT 
    id_associado,
    id_divisao,
    COUNT(*) as total
FROM sind.associados_sasmais
GROUP BY id_associado, id_divisao
HAVING COUNT(*) > 1
ORDER BY total DESC;

-- Resultado esperado:
-- Se retornar linhas: HÁ DUPLICATAS - precisa limpar antes ⚠️
-- Se retornar vazio: sem duplicatas - pode criar constraint ✅

-- ========================================

-- 4. LIMPAR DUPLICATAS (SE NECESSÁRIO)
-- Manter apenas o registro mais recente de cada (id_associado, id_divisao)
-- ⚠️ CUIDADO: Isso vai deletar registros duplicados!
-- ⚠️ Fazer backup antes de executar!

/*
DELETE FROM sind.associados_sasmais
WHERE id IN (
    SELECT id
    FROM (
        SELECT 
            id,
            ROW_NUMBER() OVER (
                PARTITION BY id_associado, id_divisao 
                ORDER BY data_hora DESC, id DESC
            ) as rn
        FROM sind.associados_sasmais
    ) t
    WHERE rn > 1
);
*/

-- ========================================

-- 5. CRIAR CONSTRAINT UNIQUE
-- (Executar APENAS se não existir e não houver duplicatas)

ALTER TABLE sind.associados_sasmais 
ADD CONSTRAINT associados_sasmais_unique_associado_divisao 
UNIQUE (id_associado, id_divisao);

-- Resultado esperado:
-- ✅ ALTER TABLE - constraint criada com sucesso

-- ========================================

-- 6. VERIFICAR SE A CONSTRAINT FOI CRIADA
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'sind' 
  AND table_name = 'associados_sasmais' 
  AND constraint_name = 'associados_sasmais_unique_associado_divisao';

-- Resultado esperado:
-- associados_sasmais_unique_associado_divisao | UNIQUE

-- ========================================

-- 7. TESTAR O UPSERT
-- (Executar APÓS criar a constraint)

/*
-- Teste 1: INSERT (novo registro)
INSERT INTO sind.associados_sasmais 
(codigo, nome, email, cpf, celular, id_associado, id_divisao, 
 has_signed, signed_at, doc_token, doc_name, event, 
 aceitou_termo, data_hora, autorizado)
VALUES 
('TESTE', 'Nome Teste', 'teste@email.com', '000.000.000-00', '11999999999', 
 99999, 99999, 't', NOW(), 'token_teste', 'doc_teste', 'test_event', 
 't', NOW(), 'f')
ON CONFLICT (id_associado, id_divisao) 
DO UPDATE SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    data_hora = NOW()
RETURNING id, (xmax = 0) AS inserted;

-- Resultado esperado:
-- id | inserted
-- XX | t (true = foi INSERT)

-- Teste 2: UPDATE (registro existente)
INSERT INTO sind.associados_sasmais 
(codigo, nome, email, cpf, celular, id_associado, id_divisao, 
 has_signed, signed_at, doc_token, doc_name, event, 
 aceitou_termo, data_hora, autorizado)
VALUES 
('TESTE', 'Nome Atualizado', 'teste@email.com', '000.000.000-00', '11999999999', 
 99999, 99999, 't', NOW(), 'token_teste', 'doc_teste', 'test_event', 
 't', NOW(), 'f')
ON CONFLICT (id_associado, id_divisao) 
DO UPDATE SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    data_hora = NOW()
RETURNING id, (xmax = 0) AS inserted;

-- Resultado esperado:
-- id | inserted
-- XX | f (false = foi UPDATE)

-- Limpar teste:
DELETE FROM sind.associados_sasmais WHERE id_associado = 99999 AND id_divisao = 99999;
*/

-- ========================================
-- FIM DO SCRIPT
-- ========================================
