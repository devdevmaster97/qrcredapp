-- =====================================================
-- TRIGGER PARA NOTIFICAÇÃO DE NOVOS LANÇAMENTOS
-- =====================================================
-- Este trigger detecta quando um novo lançamento é inserido
-- na tabela sind.conta e envia uma notificação via NOTIFY
-- apenas para o usuário específico daquele lançamento
-- =====================================================

-- 1. Criar função que será executada pelo trigger
CREATE OR REPLACE FUNCTION sind.notify_new_lancamento()
RETURNS TRIGGER AS $$
DECLARE
  v_cartao VARCHAR;
  v_nome VARCHAR;
  v_id_associado INTEGER;
  v_id_divisao INTEGER;
  v_payload JSON;
BEGIN
  -- Buscar dados do associado com JOIN na tabela c_cartaoassociado
  -- para obter o número do cartão
  SELECT 
    c.id AS cartao,
    a.nome,
    a.id,
    a.id_divisao
  INTO 
    v_cartao,
    v_nome,
    v_id_associado,
    v_id_divisao
  FROM sind.associado a
  INNER JOIN sind.c_cartaoassociado c 
    ON c.id_associado = a.id 
    AND c.id_divisao = a.id_divisao
  WHERE a.codigo = NEW.associado;

  -- Se não encontrou o associado ou cartão, não faz nada
  IF v_cartao IS NULL THEN
    RAISE NOTICE 'Associado ou cartão não encontrado para código: %', NEW.associado;
    RETURN NEW;
  END IF;

  -- Preparar payload com todos os dados necessários
  v_payload = json_build_object(
    'tipo', 'novo_lancamento',
    'lancamento_id', NEW.lancamento,
    'cartao', v_cartao,
    'associado', NEW.associado,
    'id_associado', v_id_associado,
    'id_divisao', v_id_divisao,
    'nome_associado', v_nome,
    'valor', NEW.valor::text,
    'descricao', COALESCE(NEW.descricao, 'Lançamento'),
    'convenio', NEW.convenio,
    'mes', NEW.mes,
    'data', TO_CHAR(NEW.data, 'DD/MM/YYYY'),
    'hora', NEW.hora,
    'timestamp', NOW()::text
  );

  -- Enviar notificação via NOTIFY
  -- Canal: new_lancamento
  -- Payload: JSON com dados do lançamento
  PERFORM pg_notify('new_lancamento', v_payload::text);

  -- Log para debug
  RAISE NOTICE 'Notificação enviada para cartão: % (Associado: %)', v_cartao, v_nome;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Criar trigger que executa APÓS INSERT na tabela conta
DROP TRIGGER IF EXISTS trigger_notify_new_lancamento ON sind.conta;

CREATE TRIGGER trigger_notify_new_lancamento
AFTER INSERT ON sind.conta
FOR EACH ROW
EXECUTE FUNCTION sind.notify_new_lancamento();

-- 3. Verificar se o trigger foi criado
SELECT 
  tgname AS trigger_name,
  tgenabled AS enabled,
  pg_get_triggerdef(oid) AS definition
FROM pg_trigger 
WHERE tgname = 'trigger_notify_new_lancamento';

-- 4. Comentários para documentação
COMMENT ON FUNCTION sind.notify_new_lancamento() IS 
'Função que envia notificação push quando um novo lançamento é inserido na tabela sind.conta. Apenas o usuário específico do lançamento recebe a notificação.';

COMMENT ON TRIGGER trigger_notify_new_lancamento ON sind.conta IS 
'Trigger que detecta novos lançamentos e dispara notificação push em tempo real para o usuário específico.';

-- =====================================================
-- TESTE DO TRIGGER
-- =====================================================
-- Para testar, execute em outra sessão:
-- LISTEN new_lancamento;
-- 
-- Depois insira um lançamento de teste:
-- INSERT INTO sind.conta (associado, valor, descricao, convenio, mes)
-- VALUES (123, 150.00, 'Teste Push Notification', 221, '2025-01');
-- =====================================================
