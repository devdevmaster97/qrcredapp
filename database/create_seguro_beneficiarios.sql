-- Tabela para controle de beneficiários de seguro
-- Criado em: 2026-05-12
-- Funcionalidade: Seguro Indicações

CREATE TABLE IF NOT EXISTS sind.seguro_beneficiarios (
    id_beneficiario BIGSERIAL PRIMARY KEY,
    id_associado INTEGER NOT NULL,
    id_divisao INTEGER NOT NULL,
    cpf_zap VARCHAR(14),
    nome_zap VARCHAR(255),
    nome_beneficiario VARCHAR(255),
    data_nascimento VARCHAR(10),
    parentesco VARCHAR(50),
    percentual INTEGER,
    status VARCHAR(20) DEFAULT 'pendente',
    doc_token VARCHAR(255),
    data_criacao TIMESTAMP DEFAULT NOW(),
    data_assinatura TIMESTAMP,
    CONSTRAINT fk_seguro_associado FOREIGN KEY (id_associado) 
        REFERENCES sind.associado(id) ON DELETE CASCADE
);

-- Índice para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_seguro_beneficiarios_associado 
    ON sind.seguro_beneficiarios(id_associado, id_divisao);

-- Índice para consultas por status
CREATE INDEX IF NOT EXISTS idx_seguro_beneficiarios_status 
    ON sind.seguro_beneficiarios(status);

-- Comentários nas colunas
COMMENT ON TABLE sind.seguro_beneficiarios IS 'Controle de beneficiários de seguro indicados pelos associados';
COMMENT ON COLUMN sind.seguro_beneficiarios.id_beneficiario IS 'ID único do beneficiário';
COMMENT ON COLUMN sind.seguro_beneficiarios.id_associado IS 'ID do associado que indicou';
COMMENT ON COLUMN sind.seguro_beneficiarios.id_divisao IS 'ID da divisão do associado';
COMMENT ON COLUMN sind.seguro_beneficiarios.cpf_zap IS 'CPF do signatário (associado) no ZapSign';
COMMENT ON COLUMN sind.seguro_beneficiarios.nome_zap IS 'Nome do signatário (associado) no ZapSign';
COMMENT ON COLUMN sind.seguro_beneficiarios.nome_beneficiario IS 'Nome do beneficiário do seguro';
COMMENT ON COLUMN sind.seguro_beneficiarios.data_nascimento IS 'Data de nascimento do beneficiário';
COMMENT ON COLUMN sind.seguro_beneficiarios.parentesco IS 'Parentesco do beneficiário com o associado';
COMMENT ON COLUMN sind.seguro_beneficiarios.percentual IS 'Percentual do seguro para o beneficiário';
COMMENT ON COLUMN sind.seguro_beneficiarios.status IS 'Status: pendente ou assinado';
COMMENT ON COLUMN sind.seguro_beneficiarios.doc_token IS 'Token do documento ZapSign';
COMMENT ON COLUMN sind.seguro_beneficiarios.data_criacao IS 'Data de criação do registro';
COMMENT ON COLUMN sind.seguro_beneficiarios.data_assinatura IS 'Data/hora da assinatura no ZapSign';
