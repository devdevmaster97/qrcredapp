-- ============================================
-- Tabela para armazenar adesões SasCred pendentes
-- Resolve problema de divisão incorreta no webhook ZapSign
-- ============================================

CREATE TABLE IF NOT EXISTS sind.adesoes_pendentes (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL,
    cpf VARCHAR(14) NOT NULL,
    email VARCHAR(255) NOT NULL,
    id_associado INTEGER NOT NULL,
    id_divisao INTEGER NOT NULL,
    nome VARCHAR(255),
    celular VARCHAR(20),
    data_inicio TIMESTAMP DEFAULT NOW(),
    data_expiracao TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours'),
    status VARCHAR(20) DEFAULT 'pendente',
    doc_token VARCHAR(255),
    
    -- Constraint de unicidade
    CONSTRAINT unique_cpf_email UNIQUE(cpf, email)
);

-- ============================================
-- Criar índices para busca rápida
-- ============================================
CREATE INDEX IF NOT EXISTS idx_adesoes_cpf ON sind.adesoes_pendentes(cpf);
CREATE INDEX IF NOT EXISTS idx_adesoes_email ON sind.adesoes_pendentes(email);
CREATE INDEX IF NOT EXISTS idx_adesoes_codigo ON sind.adesoes_pendentes(codigo);
CREATE INDEX IF NOT EXISTS idx_adesoes_status ON sind.adesoes_pendentes(status);
CREATE INDEX IF NOT EXISTS idx_adesoes_data_expiracao ON sind.adesoes_pendentes(data_expiracao);

-- Comentários para documentação
COMMENT ON TABLE sind.adesoes_pendentes IS 'Armazena dados temporários de adesões SasCred iniciadas, para uso no webhook ZapSign';
COMMENT ON COLUMN sind.adesoes_pendentes.codigo IS 'Código/matrícula do associado';
COMMENT ON COLUMN sind.adesoes_pendentes.cpf IS 'CPF do associado (usado para matching no webhook)';
COMMENT ON COLUMN sind.adesoes_pendentes.email IS 'Email do associado (usado para matching no webhook)';
COMMENT ON COLUMN sind.adesoes_pendentes.id_associado IS 'ID único da tabela sind.associado';
COMMENT ON COLUMN sind.adesoes_pendentes.id_divisao IS 'Divisão correta do associado logado';
COMMENT ON COLUMN sind.adesoes_pendentes.data_expiracao IS 'Data de expiração do registro (24h após criação)';
COMMENT ON COLUMN sind.adesoes_pendentes.status IS 'Status: pendente, assinado, expirado, cancelado';
COMMENT ON COLUMN sind.adesoes_pendentes.doc_token IS 'Token do documento ZapSign para rastreamento';

-- ============================================
-- Procedure para limpar registros expirados
-- ============================================
CREATE OR REPLACE FUNCTION sind.limpar_adesoes_expiradas()
RETURNS void AS $$
BEGIN
    UPDATE sind.adesoes_pendentes 
    SET status = 'expirado'
    WHERE data_expiracao < NOW() 
    AND status = 'pendente';
    
    -- Opcional: deletar registros muito antigos (mais de 7 dias)
    DELETE FROM sind.adesoes_pendentes 
    WHERE data_inicio < (NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Agendar limpeza automática (se usar pg_cron)
-- ============================================
-- SELECT cron.schedule('limpar-adesoes-expiradas', '0 * * * *', 'SELECT sind.limpar_adesoes_expiradas()');

-- ============================================
-- Grants de permissão
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON sind.adesoes_pendentes TO seu_usuario_app;
GRANT USAGE, SELECT ON SEQUENCE sind.adesoes_pendentes_id_seq TO seu_usuario_app;
