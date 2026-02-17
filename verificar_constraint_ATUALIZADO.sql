-- ========================================
-- Script para Verificar e Criar Constraint UNIQUE
-- Tabela: sind.associados_sasmais
-- ATUALIZADO: Inclui campo 'tipo' na constraint
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

-- 3. VERIFICAR SE HÁ DUPLICATAS EXISTENTES (COM TIPO)
-- (Executar ANTES de criar a constraint)
SELECT 
    id_associado,
    id_divisao,
    tipo,
    COUNT(*) as total
FROM sind.associados_sasmais
GROUP BY id_associado, id_divisao, tipo
HAVING COUNT(*) > 1
ORDER BY total DESC;

-- Resultado esperado:
-- Se retornar linhas: HÁ DUPLICATAS - precisa limpar antes ⚠️
-- Se retornar vazio: sem duplicatas - pode criar constraint ✅

-- ========================================

-- 4. LIMPAR DUPLICATAS (SE NECESSÁRIO)
-- Manter apenas o registro mais recente de cada (id_associado, id_divisao, tipo)
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
                PARTITION BY id_associado, id_divisao, tipo 
                ORDER BY data_hora DESC, id DESC
            ) as rn
        FROM sind.associados_sasmais
    ) t
    WHERE rn > 1
);
*/

-- ========================================

-- 5. CRIAR CONSTRAINT UNIQUE (COM TIPO)
-- (Executar APENAS se não existir e não houver duplicatas)

ALTER TABLE sind.associados_sasmais 
ADD CONSTRAINT associados_sasmais_unique_associado_divisao_tipo 
UNIQUE (id_associado, id_divisao, tipo);

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
  AND constraint_name = 'associados_sasmais_unique_associado_divisao_tipo';

-- Resultado esperado:
-- associados_sasmais_unique_associado_divisao_tipo | UNIQUE

-- ========================================

-- 7. VERIFICAR COLUNAS DA CONSTRAINT
SELECT
    kcu.column_name,
    kcu.ordinal_position
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_name = 'associados_sasmais_unique_associado_divisao_tipo'
    AND tc.table_schema = 'sind'
    AND tc.table_name = 'associados_sasmais'
ORDER BY kcu.ordinal_position;

-- Resultado esperado:
-- id_associado | 1
-- id_divisao   | 2
-- tipo         | 3

-- ========================================

-- 8. TESTAR O UPSERT (COM TIPO)
-- (Executar APÓS criar a constraint)

/*
-- Teste 1: INSERT de ADESÃO (tipo=1)
INSERT INTO sind.associados_sasmais 
(codigo, nome, email, cpf, celular, id_associado, id_divisao, 
 has_signed, signed_at, doc_token, doc_name, event, name, cel_informado,
 limite, valor_aprovado, data_pgto, tipo, reprovado, chave_pix,
 aceitou_termo, data_hora, autorizado)
VALUES 
('TESTE', 'Nome Teste', 'teste@email.com', '00000000000', '11999999999', 
 99999, 99999, 't', NOW(), 'token_teste', 'doc_teste', 'doc_signed', 'Nome Teste', '11999999999',
 '2000.00', '550.00', NOW(), 1, 'f', '',
 't', NOW(), 't')
ON CONFLICT (id_associado, id_divisao, tipo) 
DO UPDATE SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    data_hora = NOW()
RETURNING id, (xmax = 0) AS inserted;

-- Resultado esperado:
-- id | inserted
-- XX | t (true = foi INSERT)

-- Teste 2: UPDATE de ADESÃO (mesmo tipo=1)
INSERT INTO sind.associados_sasmais 
(codigo, nome, email, cpf, celular, id_associado, id_divisao, 
 has_signed, signed_at, doc_token, doc_name, event, name, cel_informado,
 limite, valor_aprovado, data_pgto, tipo, reprovado, chave_pix,
 aceitou_termo, data_hora, autorizado)
VALUES 
('TESTE', 'Nome Atualizado', 'teste@email.com', '00000000000', '11999999999', 
 99999, 99999, 't', NOW(), 'token_teste', 'doc_teste', 'doc_signed', 'Nome Atualizado', '11999999999',
 '2000.00', '550.00', NOW(), 1, 'f', '',
 't', NOW(), 't')
ON CONFLICT (id_associado, id_divisao, tipo) 
DO UPDATE SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    data_hora = NOW()
RETURNING id, (xmax = 0) AS inserted;

-- Resultado esperado:
-- id | inserted
-- XX | f (false = foi UPDATE)

-- Teste 3: INSERT de ANTECIPAÇÃO (tipo=2 - DIFERENTE!)
INSERT INTO sind.associados_sasmais 
(codigo, nome, email, cpf, celular, id_associado, id_divisao, 
 has_signed, signed_at, doc_token, doc_name, event, name, cel_informado,
 limite, valor_aprovado, data_pgto, tipo, reprovado, chave_pix,
 aceitou_termo, data_hora, autorizado)
VALUES 
('TESTE', 'Nome Teste', 'teste@email.com', '00000000000', '11999999999', 
 99999, 99999, 't', NOW(), 'token_teste2', 'doc_antecipacao', 'doc_signed', 'Nome Teste', '11999999999',
 '2000.00', '550.00', NOW(), 2, 'f', '',
 't', NOW(), 't')
ON CONFLICT (id_associado, id_divisao, tipo) 
DO UPDATE SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    data_hora = NOW()
RETURNING id, (xmax = 0) AS inserted;

-- Resultado esperado:
-- id | inserted
-- YY | t (true = foi INSERT de NOVO REGISTRO porque tipo é diferente!)

-- Verificar: Deve haver 2 registros para o mesmo associado/divisão
SELECT id, id_associado, id_divisao, tipo, nome, doc_name
FROM sind.associados_sasmais
WHERE id_associado = 99999 AND id_divisao = 99999
ORDER BY tipo;

-- Resultado esperado:
-- id | id_associado | id_divisao | tipo | nome             | doc_name
-- XX | 99999        | 99999      | 1    | Nome Atualizado  | doc_teste
-- YY | 99999        | 99999      | 2    | Nome Teste       | doc_antecipacao

-- Limpar testes:
DELETE FROM sind.associados_sasmais WHERE id_associado = 99999 AND id_divisao = 99999;
*/

-- ========================================
-- IMPORTANTE: DIFERENÇA ENTRE CONSTRAINTS
-- ========================================

-- ❌ CONSTRAINT ANTIGA (2 campos - INCORRETA para este webhook):
-- UNIQUE (id_associado, id_divisao)
-- Problema: Não permite adesão E antecipação para o mesmo associado

-- ✅ CONSTRAINT NOVA (3 campos - CORRETA):
-- UNIQUE (id_associado, id_divisao, tipo)
-- Permite: Um registro de adesão (tipo=1) E um de antecipação (tipo=2)

-- Se a constraint antiga existir, REMOVER antes de criar a nova:
-- ALTER TABLE sind.associados_sasmais DROP CONSTRAINT associados_sasmais_unique_associado_divisao;

-- ========================================
-- FIM DO SCRIPT
-- ========================================
