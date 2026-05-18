-- ============================================
-- SCRIPT PARA CRIAR TABELA seguro_beneficiarios
-- ============================================
-- INSTRUÇÕES:
-- 1. Abra o pgAdmin ou qualquer cliente PostgreSQL
-- 2. Conecte ao banco: qrcred (host: 216.245.210.4)
-- 3. Execute este script completo
-- ============================================

-- Criar tabela seguro_beneficiarios no schema sind
CREATE TABLE IF NOT EXISTS sind.seguro_beneficiarios (
    id_beneficiario SERIAL PRIMARY KEY,
    id_associado INTEGER NOT NULL,
    id_divisao INTEGER NOT NULL,
    cpf_zap VARCHAR(14),
    nome_zap VARCHAR(255),
    nome_beneficiario VARCHAR(255),
    data_nascimento VARCHAR(10),
    parentesco VARCHAR(100),
    percentual NUMERIC(5,2),
    status VARCHAR(20) NOT NULL DEFAULT 'pendente',
    doc_token VARCHAR(255),
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_assinatura TIMESTAMP,
    CONSTRAINT chk_status CHECK (status IN ('pendente', 'assinado'))
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_seguro_beneficiarios_associado 
    ON sind.seguro_beneficiarios(id_associado);

CREATE INDEX IF NOT EXISTS idx_seguro_beneficiarios_divisao 
    ON sind.seguro_beneficiarios(id_divisao);

CREATE INDEX IF NOT EXISTS idx_seguro_beneficiarios_status 
    ON sind.seguro_beneficiarios(status);

CREATE INDEX IF NOT EXISTS idx_seguro_beneficiarios_cpf_zap 
    ON sind.seguro_beneficiarios(cpf_zap);

CREATE INDEX IF NOT EXISTS idx_seguro_beneficiarios_doc_token 
    ON sind.seguro_beneficiarios(doc_token);

-- Comentários nas colunas para documentação
COMMENT ON TABLE sind.seguro_beneficiarios IS 'Tabela para armazenar beneficiários de seguro indicados pelos associados';
COMMENT ON COLUMN sind.seguro_beneficiarios.id_beneficiario IS 'ID único do beneficiário';
COMMENT ON COLUMN sind.seguro_beneficiarios.id_associado IS 'ID do associado que indicou o beneficiário';
COMMENT ON COLUMN sind.seguro_beneficiarios.id_divisao IS 'ID da divisão do associado';
COMMENT ON COLUMN sind.seguro_beneficiarios.cpf_zap IS 'CPF do signatário capturado do ZapSign';
COMMENT ON COLUMN sind.seguro_beneficiarios.nome_zap IS 'Nome do signatário capturado do ZapSign';
COMMENT ON COLUMN sind.seguro_beneficiarios.nome_beneficiario IS 'Nome do beneficiário preenchido no formulário';
COMMENT ON COLUMN sind.seguro_beneficiarios.data_nascimento IS 'Data de nascimento do beneficiário';
COMMENT ON COLUMN sind.seguro_beneficiarios.parentesco IS 'Parentesco do beneficiário com o associado';
COMMENT ON COLUMN sind.seguro_beneficiarios.percentual IS 'Percentual de benefício';
COMMENT ON COLUMN sind.seguro_beneficiarios.status IS 'Status: pendente ou assinado';
COMMENT ON COLUMN sind.seguro_beneficiarios.doc_token IS 'Token do documento ZapSign';
COMMENT ON COLUMN sind.seguro_beneficiarios.data_criacao IS 'Data de criação do registro';
COMMENT ON COLUMN sind.seguro_beneficiarios.data_assinatura IS 'Data em que o documento foi assinado';

-- Verificar se a tabela foi criada com sucesso
SELECT 'Tabela criada com sucesso!' AS resultado,
       COUNT(*) AS total_colunas
FROM information_schema.columns
WHERE table_schema = 'sind' 
  AND table_name = 'seguro_beneficiarios';
