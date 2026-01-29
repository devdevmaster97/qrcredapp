<?php
// Permitir acesso de qualquer origem
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Max-Age: 86400");

ini_set('display_errors', true);
error_reporting(E_ALL);

include "Adm/php/banco.php";
include "Adm/php/funcoes.php";
include "uuid.php";

$pdo = Banco::conectar_postgres();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
date_default_timezone_set('America/Sao_Paulo');

$stmt = new stdClass();
$id_categoria = "";
$uuid = "";

if (isset($_POST['valor_pedido'])) {
    // VARIAVEIS ------------------------------------
    $std = array();
    $codigo_convenio = $_POST['cod_convenio'];
    $matricula = $_POST['matricula'];
    $senha = $_POST['pass'];
    $nome = $_POST['nome'];
    $cartao = $_POST['cartao'];
    $empregador = $_POST['empregador'];
    $valor_pedido = $_POST['valor_pedido'];
    $valor_parcela_string = $_POST['valor_parcela'];
    $valor_parcela_float = tofloat($valor_parcela_string);
    $aux = $_POST['mes_corrente'];
    $m_p = $_POST['mes_corrente'];
    $mes_inicial = $_POST['mes_corrente'];
    $primeiro_mes = $_POST['primeiro_mes'];
    $valor_pedido_float = tofloat($valor_pedido);
    $mes_pedido = explode("/", $_POST['mes_corrente']);
    $qtde_parcelas = (int)$_POST['qtde_parcelas'];
    $evetivar = false;
    $cont_senha_assoc = 0;
    $pede_senha = "";
    $registrolan = "";
    $datay = "";
    $hora = date("H:i:s");
    $data = date("Y-m-d");
    $uri_cupom = $_POST['uri_cupom'];
    $descricao = $_POST['descricao'];
    $datafatura = data_fatura($mes_pedido[0]);
    $parcela = "";
    
    // RECEBER ID DO ASSOCIADO E DIVISAO
    $id_associado = isset($_POST['id_associado']) && $_POST['id_associado'] !== '' && $_POST['id_associado'] !== 'null' ? (int)$_POST['id_associado'] : null;
    $divisao = isset($_POST['divisao']) && $_POST['divisao'] !== '' && $_POST['divisao'] !== 'null' ? (int)$_POST['divisao'] : null;
    
    error_log("ID do associado recebido: " . ($id_associado !== null ? $id_associado : 'NULL'));
    error_log("Divisao recebida: " . ($divisao !== null ? $divisao : 'NULL'));
    
    try {
        // Buscar dados do convênio
        $sql_pede_senha = $pdo->query("SELECT * FROM sind.convenio WHERE codigo = " . $codigo_convenio);
        
        while ($row_convenio = $sql_pede_senha->fetch()) {
            $nomefantasia = $row_convenio["nomefantasia"];
            $razaosocial = $row_convenio["razaosocial"];
            $endereco = $row_convenio["endereco"];
            $bairro = $row_convenio["bairro"];
            $parcela_conv = $row_convenio['n_parcelas'];
            $pede_senha = $row_convenio['pede_senha'];
            $id_categoria = $row_convenio['id_categoria'];

            // Verificar senha se necessário
            if ($pede_senha == 1) {
                $sql_senha = "SELECT * FROM sind.c_senhaassociado WHERE cod_associado = :matricula AND id_empregador = :empregador AND senha = :senha";
                $stmt_senha = $pdo->prepare($sql_senha);
                $stmt_senha->bindParam(':matricula', $matricula, PDO::PARAM_STR);
                $stmt_senha->bindParam(':empregador', $empregador, PDO::PARAM_INT);
                $stmt_senha->bindParam(':senha', $senha, PDO::PARAM_STR);
                $stmt_senha->execute();
                
                if ($stmt_senha->rowCount() > 0) {
                    $cont_senha_assoc = 1;
                    $evetivar = true;
                } else {
                    $evetivar = false;
                }
            } else {
                $evetivar = true;
            }

            if ($evetivar == true) {
                // INICIAR TRANSAÇÃO
                $pdo->beginTransaction();
                error_log("🔄 Transação iniciada");
                
                try {
                    $dataNull = null;
                    
                    // ============================================
                    // GRAVAR LANÇAMENTO(S) PRINCIPAL(IS)
                    // ============================================
                    if ($qtde_parcelas > 1) {
                        // MÚLTIPLAS PARCELAS
                        $std["situacao"] = 1;
                        $std["registrolan"] = "";
                        $std["matricula"] = $matricula;
                        $std["nome"] = $nome;
                        $std["id_categoria"] = $id_categoria;
                        $std["parcelas"][] = "";
                        $uuid = UUID::v4();
                        
                        for ($as = 1; $as <= $qtde_parcelas; $as++) {
                            $sql = "INSERT INTO sind.conta (associado,convenio,valor,data,hora,mes,empregador,parcela,uri_cupom,data_fatura,uuid_conta,descricao,id_associado,divisao) ";
                            $sql .= "VALUES (:associado,:convenio,:valor,:data,:hora,:mes,:empregador,:parcela,:uri_cupom,:data_fatura,:uuid_conta,:descricao,:id_associado,:divisao) RETURNING lancamento";
                            
                            $parcela = str_pad($as, 2, "0", STR_PAD_LEFT) . "/" . str_pad($qtde_parcelas, 2, "0", STR_PAD_LEFT);

                            $stmt = $pdo->prepare($sql);
                            $stmt->bindParam(':associado', $matricula, PDO::PARAM_STR);
                            $stmt->bindParam(':convenio', $codigo_convenio, PDO::PARAM_INT);
                            $stmt->bindParam(':valor', $valor_parcela_float, PDO::PARAM_STR);
                            $stmt->bindParam(':data', $data, PDO::PARAM_STR);
                            $stmt->bindParam(':hora', $hora, PDO::PARAM_STR);
                            $stmt->bindParam(':mes', $m_p, PDO::PARAM_STR);
                            $stmt->bindParam(':empregador', $empregador, PDO::PARAM_INT);
                            $stmt->bindParam(':parcela', $parcela, PDO::PARAM_STR);
                            $stmt->bindParam(':data_fatura', $datafatura, PDO::PARAM_STR);
                            $stmt->bindParam(':uuid_conta', $uuid, PDO::PARAM_STR);
                            $stmt->bindParam(':descricao', $descricao, PDO::PARAM_STR);
                            
                            if ($id_associado !== null) {
                                $stmt->bindParam(':id_associado', $id_associado, PDO::PARAM_INT);
                            } else {
                                $stmt->bindValue(':id_associado', null, PDO::PARAM_NULL);
                            }
                            
                            if ($divisao !== null) {
                                $stmt->bindParam(':divisao', $divisao, PDO::PARAM_INT);
                            } else {
                                $stmt->bindValue(':divisao', null, PDO::PARAM_NULL);
                            }
                            
                            if ($as == 1) {
                                $stmt->bindParam(':uri_cupom', $uri_cupom, PDO::PARAM_STR);
                            } else {
                                $stmt->bindParam(':uri_cupom', $dataNull, PDO::PARAM_STR);
                            }
                            
                            $stmt->execute();
                            $result = $stmt->fetch(PDO::FETCH_ASSOC);
                            $registrolan = $result['lancamento'];

                            $std["parcelas"][$as]["numero"] = $as;
                            $std["parcelas"][$as]["valor_parcela"] = $valor_parcela_string;
                            $std["parcelas"][$as]["registrolan"] = $registrolan;
                            $std["parcelas"][$as]["mes_seq"] = $aux;
                            
                            $m_p = somames_gravar($aux);
                            $mes_pedido = explode("/", $m_p);
                            $aux = $m_p;
                        }
                        
                        $std["parcelas"][] = "";
                        $std["nparcelas"] = $qtde_parcelas;
                        $std["mes_seq"] = $m_p;
                        $std["razaosocial"] = $razaosocial;
                        $std["nomefantasia"] = $nomefantasia;
                        $std["codcarteira"] = $cartao;
                        $std["valorpedido"] = $valor_pedido;
                        $std["endereco"] = $endereco;
                        $std["bairro"] = $bairro;
                        $std["parcela_conv"] = $parcela_conv;
                        $std["datacad"] = $data;
                        $std["hora"] = $hora;
                        $std["cod_convenio"] = $codigo_convenio;
                        $std["primeiro_mes"] = $primeiro_mes;
                        $std["pede_senha"] = $pede_senha;
                        
                    } else {
                        // PARCELA ÚNICA
                        $uuid = UUID::v4();
                        $sql = "INSERT INTO sind.conta (associado,convenio,valor,data,hora,mes,empregador,uri_cupom,data_fatura,uuid_conta,descricao,id_associado,divisao) ";
                        $sql .= "VALUES (:associado,:convenio,:valor,:data,:hora,:mes,:empregador,:uri_cupom,:data_fatura,:uuid_conta,:descricao,:id_associado,:divisao) RETURNING lancamento";

                        $stmt = $pdo->prepare($sql);
                        $stmt->bindParam(':associado', $matricula, PDO::PARAM_STR);
                        $stmt->bindParam(':convenio', $codigo_convenio, PDO::PARAM_INT);
                        $stmt->bindParam(':valor', $valor_pedido_float, PDO::PARAM_STR);
                        $stmt->bindParam(':data', $data, PDO::PARAM_STR);
                        $stmt->bindParam(':hora', $hora, PDO::PARAM_STR);
                        $stmt->bindParam(':mes', $m_p, PDO::PARAM_STR);
                        $stmt->bindParam(':empregador', $empregador, PDO::PARAM_INT);
                        $stmt->bindParam(':uri_cupom', $uri_cupom, PDO::PARAM_STR);
                        $stmt->bindParam(':data_fatura', $datafatura, PDO::PARAM_STR);
                        $stmt->bindParam(':uuid_conta', $uuid, PDO::PARAM_STR);
                        $stmt->bindParam(':descricao', $descricao, PDO::PARAM_STR);
                        
                        if ($id_associado !== null) {
                            $stmt->bindParam(':id_associado', $id_associado, PDO::PARAM_INT);
                        } else {
                            $stmt->bindValue(':id_associado', null, PDO::PARAM_NULL);
                        }
                        
                        if ($divisao !== null) {
                            $stmt->bindParam(':divisao', $divisao, PDO::PARAM_INT);
                        } else {
                            $stmt->bindValue(':divisao', null, PDO::PARAM_NULL);
                        }
                        
                        $stmt->execute();
                        $result = $stmt->fetch(PDO::FETCH_ASSOC);
                        $registrolan = $result['lancamento'];

                        $std["situacao"] = 1;
                        $std["registrolan"] = $registrolan;
                        $std["matricula"] = $matricula;
                        $std["nome"] = $nome;
                        $std["nparcelas"] = 1;
                        $std["valorpedido"] = $valor_pedido;
                        $std["mes_seq"] = $m_p;
                        $std["razaosocial"] = $razaosocial;
                        $std["nomefantasia"] = $nomefantasia;
                        $std["endereco"] = $endereco;
                        $std["bairro"] = $bairro;
                        $std["parcela_conv"] = $parcela_conv;
                        $std["codcarteira"] = $cartao;
                        $std["datacad"] = $data;
                        $std["hora"] = $hora;
                        $std["cod_convenio"] = $codigo_convenio;
                        $std["primeiro_mes"] = "";
                        $std["pede_senha"] = $pede_senha;
                        $std["id_categoria"] = $id_categoria;
                        $std["descricao"] = $descricao;
                    }
                    
                    // ============================================
                    // LANÇAMENTO AUTOMÁTICO DA TAXA DE CARTÃO
                    // ============================================
                    error_log("💳 Iniciando lançamento automático da taxa de cartão");
                    
                    // 1. Buscar valor da taxa
                    $sql_taxa = "SELECT valor FROM sind.valor_taxa_cartao WHERE divisao = :divisao ORDER BY id DESC LIMIT 1";
                    $stmt_taxa = $pdo->prepare($sql_taxa);
                    $stmt_taxa->bindParam(':divisao', $divisao, PDO::PARAM_INT);
                    $stmt_taxa->execute();
                    $taxa_result = $stmt_taxa->fetch(PDO::FETCH_ASSOC);
                    
                    if (!$taxa_result) {
                        error_log("⚠️ Valor da taxa não encontrado, usando padrão R$ 7,50");
                        $valor_taxa = 7.50;
                    } else {
                        $valor_taxa = floatval($taxa_result['valor']);
                        error_log("✅ Valor da taxa encontrado: R$ " . number_format($valor_taxa, 2, ',', '.'));
                    }
                    
                    // 2. Verificar se taxa já foi lançada no mês
                    $sql_verifica = "SELECT COUNT(*) as total FROM sind.conta 
                                    WHERE associado = :matricula 
                                    AND empregador = :empregador 
                                    AND mes = :mes 
                                    AND convenio = 249 
                                    AND descricao LIKE '%Taxa de manutenção do cartão%'";
                    
                    $stmt_verifica = $pdo->prepare($sql_verifica);
                    $stmt_verifica->bindParam(':matricula', $matricula, PDO::PARAM_STR);
                    $stmt_verifica->bindParam(':empregador', $empregador, PDO::PARAM_INT);
                    $stmt_verifica->bindParam(':mes', $mes_inicial, PDO::PARAM_STR);
                    $stmt_verifica->execute();
                    $verifica_result = $stmt_verifica->fetch(PDO::FETCH_ASSOC);
                    
                    $taxa_ja_lancada = $verifica_result['total'] > 0;
                    
                    if (!$taxa_ja_lancada) {
                        // 3. Gravar taxa de cartão
                        error_log("💾 Gravando taxa de cartão automática");
                        
                        $uuid_taxa = UUID::v4();
                        $descricao_taxa = "Taxa de manutenção do cartão";
                        
                        $sql_taxa_insert = "INSERT INTO sind.conta (associado,convenio,valor,data,hora,mes,empregador,uuid_conta,descricao,id_associado,divisao,aprovado) ";
                        $sql_taxa_insert .= "VALUES (:associado,:convenio,:valor,:data,:hora,:mes,:empregador,:uuid_conta,:descricao,:id_associado,:divisao,:aprovado) RETURNING lancamento";
                        
                        $stmt_taxa_insert = $pdo->prepare($sql_taxa_insert);
                        $stmt_taxa_insert->bindParam(':associado', $matricula, PDO::PARAM_STR);
                        $stmt_taxa_insert->bindValue(':convenio', 249, PDO::PARAM_INT); // SASCRED-MT-TAXA-CARTAO
                        $stmt_taxa_insert->bindParam(':valor', $valor_taxa, PDO::PARAM_STR);
                        $stmt_taxa_insert->bindParam(':data', $data, PDO::PARAM_STR);
                        $stmt_taxa_insert->bindParam(':hora', $hora, PDO::PARAM_STR);
                        $stmt_taxa_insert->bindParam(':mes', $mes_inicial, PDO::PARAM_STR);
                        $stmt_taxa_insert->bindParam(':empregador', $empregador, PDO::PARAM_INT);
                        $stmt_taxa_insert->bindParam(':uuid_conta', $uuid_taxa, PDO::PARAM_STR);
                        $stmt_taxa_insert->bindParam(':descricao', $descricao_taxa, PDO::PARAM_STR);
                        $stmt_taxa_insert->bindValue(':aprovado', true, PDO::PARAM_BOOL);
                        
                        if ($id_associado !== null) {
                            $stmt_taxa_insert->bindParam(':id_associado', $id_associado, PDO::PARAM_INT);
                        } else {
                            $stmt_taxa_insert->bindValue(':id_associado', null, PDO::PARAM_NULL);
                        }
                        
                        if ($divisao !== null) {
                            $stmt_taxa_insert->bindParam(':divisao', $divisao, PDO::PARAM_INT);
                        } else {
                            $stmt_taxa_insert->bindValue(':divisao', null, PDO::PARAM_NULL);
                        }
                        
                        $stmt_taxa_insert->execute();
                        $taxa_result_insert = $stmt_taxa_insert->fetch(PDO::FETCH_ASSOC);
                        $taxa_lancamento_id = $taxa_result_insert['lancamento'];
                        
                        error_log("✅ Taxa de cartão gravada - ID: " . $taxa_lancamento_id);
                        
                        $std["taxa_lancada"] = true;
                        $std["taxa_lancamento_id"] = $taxa_lancamento_id;
                        $std["valor_taxa"] = $valor_taxa;
                    } else {
                        error_log(" Taxa de cartão NÃO foi gravada - já existe no mês (independente da descrição)");
                        $std["taxa_lancada"] = false;
                        $std["taxa_lancamento_id"] = null;
                        $std["valor_taxa"] = $valor_taxa;
                    }
                    
                    // ============================================
                    // LIMPAR DUPLICATAS DE TAXA (SE HOUVER)
                    // ============================================
                    // O trigger do banco pode ter gravado uma taxa automaticamente
                    // Vamos garantir que existe apenas 1 taxa por mês/associado/divisão
                    error_log(" VERIFICANDO E REMOVENDO DUPLICATAS DE TAXA");
                    
                    // Buscar todas as taxas deste associado/mes/divisao
                    $sql_buscar_duplicatas = "SELECT lancamento, data, hora, descricao 
                                              FROM sind.conta 
                                              WHERE associado = :matricula 
                                              AND empregador = :empregador 
                                              AND mes = :mes 
                                              AND convenio = 249
                                              AND divisao = :divisao
                                              ORDER BY data, hora";
                    
                    $stmt_duplicatas = $pdo->prepare($sql_buscar_duplicatas);
                    $stmt_duplicatas->bindParam(':matricula', $matricula, PDO::PARAM_STR);
                    $stmt_duplicatas->bindParam(':empregador', $empregador, PDO::PARAM_INT);
                    $stmt_duplicatas->bindParam(':mes', $mes_inicial, PDO::PARAM_STR);
                    $stmt_duplicatas->bindParam(':divisao', $divisao, PDO::PARAM_INT);
                    $stmt_duplicatas->execute();
                    
                    $todas_taxas = $stmt_duplicatas->fetchAll(PDO::FETCH_ASSOC);
                    $total_taxas = count($todas_taxas);
                    
                    if ($total_taxas > 1) {
                        error_log(" ENCONTRADAS {$total_taxas} TAXAS - Removendo duplicatas");
                        
                        // Manter apenas a PRIMEIRA taxa (mais antiga)
                        $primeira_taxa_id = $todas_taxas[0]['lancamento'];
                        $ids_para_deletar = array();
                        
                        for ($i = 1; $i < $total_taxas; $i++) {
                            $ids_para_deletar[] = $todas_taxas[$i]['lancamento'];
                            error_log("   Deletando taxa ID: " . $todas_taxas[$i]['lancamento'] . 
                                     " - Descrição: '" . $todas_taxas[$i]['descricao'] . "'");
                        }
                        
                        // Deletar as duplicatas
                        if (count($ids_para_deletar) > 0) {
                            $placeholders = implode(',', array_fill(0, count($ids_para_deletar), '?'));
                            $sql_deletar = "DELETE FROM sind.conta WHERE lancamento IN ($placeholders)";
                            $stmt_deletar = $pdo->prepare($sql_deletar);
                            $stmt_deletar->execute($ids_para_deletar);
                            
                            $deletados = $stmt_deletar->rowCount();
                            error_log(" {$deletados} taxa(s) duplicada(s) removida(s)");
                            error_log(" Mantida apenas taxa ID: {$primeira_taxa_id} - Descrição: '" . $todas_taxas[0]['descricao'] . "'");
                        }
                    } else {
                        error_log(" Apenas 1 taxa encontrada - Nenhuma duplicata para remover");
                    }
                    
                    // COMMIT DA TRANSAÇÃO
                    $pdo->commit();
                    error_log(" Transação confirmada com sucesso");
                    
                } catch (Exception $e) {
                    $pdo->rollback();
                    error_log(" Rollback executado - Erro: " . $e->getMessage());
                    throw $e;
                }
                
            } else {
                // Senha incorreta
                $std["situacao"] = 2;
                $std["matricula"] = $matricula;
                $std["nome"] = $nome;
                $std["nparcelas"] = $qtde_parcelas;
                $std["valorpedido"] = $valor_pedido;
                $std["mes_seq"] = $m_p;
                $std["razaosocial"] = $razaosocial;
                $std["nomefantasia"] = $nomefantasia;
                $std["endereco"] = $endereco;
                $std["bairro"] = $bairro;
                $std["parcela_conv"] = $parcela_conv;
                $std["codcarteira"] = $cartao;
                $std["datacad"] = $data;
                $std["hora"] = $hora;
                $std["cod_convenio"] = $codigo_convenio;
                $std["primeiro_mes"] = "";
                $std["pede_senha"] = $pede_senha;
                $std["id_categoria"] = $id_categoria;
            }
            
            $someArray = $std;
            echo json_encode($someArray);
        }
        
    } catch (PDOException $erro) {
        echo $erro->getMessage() . " Data : " . $data . " parcela : " . $parcela . " mes :" . $m_p . " valor : " . $valor_pedido_float;
    }
}
?>
