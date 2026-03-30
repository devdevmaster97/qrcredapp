-- ✅ TRIGGER CORRIGIDA: fn_insere_taxa_cartao_automatica
-- Correção: Substituir 'divisao' por 'id_divisao' na tabela valor_taxa_cartao

CREATE OR REPLACE FUNCTION sind.fn_insere_taxa_cartao_automatica()
RETURNS TRIGGER AS $$
DECLARE
    v_valor_taxa DOUBLE PRECISION;
    v_descricao_taxa VARCHAR(255);
    v_ja_tem_taxa BOOLEAN;
    v_codigo_associado VARCHAR(50);
    v_empregador INTEGER;
BEGIN
    -- Define o valor do campo aprovado para o registro inserido originalmente
    IF NEW.convenio = 249 OR NEW.convenio = 221 THEN
        NEW.aprovado := FALSE;
    ELSE
        NEW.aprovado := TRUE;
    END IF;

    -- ⚠️ IMPORTANTE: Ignora APENAS se o lançamento já é uma taxa de cartão (convenio = 249)
    -- Para TODOS os outros convênios (incluindo 221, 100, etc), a taxa será inserida
    IF NEW.convenio = 249 THEN
        RETURN NEW;
    END IF;
    
    -- Verifica se o associado já tem taxa de cartão neste mês
    SELECT EXISTS(
        SELECT 1 
        FROM sind.conta 
        WHERE id_associado = NEW.id_associado 
          AND mes = NEW.mes 
          AND convenio = 249 
          AND divisao = NEW.divisao
    ) INTO v_ja_tem_taxa;
    
    -- Se já tem taxa, não faz nada
    IF v_ja_tem_taxa THEN
        RETURN NEW;
    END IF;
    
    -- ✅ CORRIGIDO: Busca o valor e descrição da taxa usando id_divisao
    SELECT valor, descricao 
    INTO v_valor_taxa, v_descricao_taxa
    FROM sind.valor_taxa_cartao 
    WHERE id_divisao = NEW.id_divisao  -- ✅ CORRIGIDO: era 'divisao = NEW.divisao'
    LIMIT 1;
    
    -- Se não encontrou configuração de taxa, não faz nada
    IF v_valor_taxa IS NULL THEN
        RAISE NOTICE '⚠️ ATENÇÃO: Não há configuração de taxa de cartão para a divisão %', NEW.id_divisao;
        RETURN NEW;
    END IF;
    
    -- Busca dados do associado
    SELECT codigo, empregador 
    INTO v_codigo_associado, v_empregador
    FROM sind.associado 
    WHERE id = NEW.id_associado;
    
    -- ✅ Insere a taxa de cartão para este associado
    -- Isso acontece para QUALQUER convênio diferente de 249
    INSERT INTO sind.conta (
        associado,
        convenio,
        valor,
        data,
        hora,
        descricao,
        mes,
        empregador,
        divisao,
        id_associado,
        uuid_conta,
        aprovado
    )
    VALUES (
        v_codigo_associado,
        249, -- Código do convênio para taxa de cartão
        v_valor_taxa,
        CURRENT_DATE,
        CURRENT_TIME,
        v_descricao_taxa,
        NEW.mes,
        v_empregador,
        NEW.divisao,
        NEW.id_associado,
        (
            substring(md5(random()::text || clock_timestamp()::text), 1, 8) || '-' ||
            substring(md5(random()::text || clock_timestamp()::text), 9, 4) || '-' ||
            substring(md5(random()::text || clock_timestamp()::text), 13, 4) || '-' ||
            substring(md5(random()::text || clock_timestamp()::text), 17, 4) || '-' ||
            substring(md5(random()::text || clock_timestamp()::text), 21, 12)
        )::uuid,
        FALSE -- taxa de cartão sempre gravada como NÃO APROVADA
    );
    
    -- Log da operação com mais detalhes
    RAISE NOTICE '✅ Taxa de cartão R$ % inserida automaticamente para associado % (convênio original: %) no mês % (divisão %)', 
                 v_valor_taxa, v_codigo_associado, NEW.convenio, NEW.mes, NEW.divisao;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ✅ COMENTÁRIO EXPLICATIVO:
-- A única mudança necessária foi na linha 43:
-- ANTES: WHERE divisao = NEW.divisao
-- DEPOIS: WHERE id_divisao = NEW.id_divisao
--
-- Isso porque a tabela 'sind.valor_taxa_cartao' teve a coluna renomeada de 'divisao' para 'id_divisao'
-- A tabela 'sind.conta' ainda mantém o nome 'divisao' (não foi renomeada)
-- A tabela 'sind.antecipacao' usa 'id_divisao' (foi renomeada)
