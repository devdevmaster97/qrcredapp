-- CORREÇÃO DA TRIGGER fn_insere_taxa_cartao_automatica
-- Problema: A trigger está usando 'divisao' mas a coluna foi renomeada para 'id_divisao'

-- 1. Primeiro, vamos ver a trigger atual
-- Execute este comando para ver o código da trigger:
-- SELECT pg_get_functiondef('sind.fn_insere_taxa_cartao_automatica'::regproc);

-- 2. Depois, execute a correção abaixo:

CREATE OR REPLACE FUNCTION sind.fn_insere_taxa_cartao_automatica()
RETURNS TRIGGER AS $$
DECLARE
    v_valor_taxa NUMERIC(10,2);
    v_descricao_taxa VARCHAR(100);
BEGIN
    -- Buscar valor da taxa na tabela valor_taxa_cartao
    -- ✅ CORRIGIDO: divisao → id_divisao
    SELECT valor, descricao 
    INTO v_valor_taxa, v_descricao_taxa
    FROM sind.valor_taxa_cartao 
    WHERE id_divisao = NEW.divisao  -- ✅ CORRIGIDO: era 'divisao = NEW.divisao'
    LIMIT 1;
    
    -- Se encontrou a taxa, inserir na tabela conta
    IF v_valor_taxa IS NOT NULL AND v_valor_taxa > 0 THEN
        INSERT INTO sind.conta (
            associado,
            convenio,
            valor,
            data,
            hora,
            descricao,
            mes,
            empregador,
            tipo,
            divisao,  -- Esta coluna ainda se chama 'divisao' na tabela conta
            id_associado,
            aprovado
        ) VALUES (
            NEW.matricula,
            NEW.convenio,
            v_valor_taxa,
            CURRENT_DATE,
            CAST(CURRENT_TIME AS TIME(0)),
            v_descricao_taxa || ' - Ref: Antecipação',
            NEW.mes,
            NEW.empregador,
            'TAXA_CARTAO',
            NEW.id_divisao,  -- ✅ Usar NEW.id_divisao da tabela antecipacao
            NEW.id_associado,
            false
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Comentário explicativo:
-- A trigger é disparada quando há INSERT na tabela 'sind.antecipacao'
-- Ela busca a taxa na tabela 'sind.valor_taxa_cartao' usando id_divisao
-- E insere automaticamente um lançamento de taxa na tabela 'sind.conta'
