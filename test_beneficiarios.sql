-- Verificar beneficiários existentes
SELECT 
    id_beneficiario,
    id_associado,
    id_divisao,
    nome_beneficiario,
    status,
    data_criacao
FROM sind.seguro_beneficiarios
ORDER BY data_criacao DESC;
