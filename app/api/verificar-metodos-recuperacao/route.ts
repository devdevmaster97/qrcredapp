import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * API para verificar métodos de recuperação disponíveis para um cartão
 * @param request Requisição com cartão
 * @returns Resposta com os métodos disponíveis
 */
export async function POST(request: NextRequest) {
  try {
    // Extrair dados do formulário
    const formData = await request.formData();
    const cartao = formData.get('cartao') as string;

    // Validar campos obrigatórios
    if (!cartao) {
      return NextResponse.json(
        { success: false, message: 'Número do cartão é obrigatório' },
        { status: 400 }
      );
    }

    // Limpar o cartão (remover não numéricos)
    const cartaoLimpo = cartao.replace(/\D/g, '');

    // Consultar dados do associado para verificar se existe e obter email/celular
    const params = new URLSearchParams();
    params.append('cartao', cartaoLimpo);

    console.log('Buscando dados do associado para verificar métodos de recuperação:', cartaoLimpo);

    const responseAssociado = await axios.post(
      'https://sas.makecard.com.br/localiza_associado_app_2.php',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000 // 10 segundos de timeout
      }
    );

    console.log('Resposta localiza_associado_app_2:', responseAssociado.data);

    // Verificar se o associado foi encontrado
    // A API PHP retorna situacao: 3 quando não encontra o cartão
    if (!responseAssociado.data || responseAssociado.data.situacao === 3 || !responseAssociado.data.matricula) {
      console.log('Cartão não encontrado na base de dados, situacao:', responseAssociado.data?.situacao);
      return NextResponse.json(
        { success: false, message: 'Cartão não encontrado' },
        { status: 404 }
      );
    }

    const dadosAssociado = responseAssociado.data;

    // Verificar quais métodos estão disponíveis
    const temEmail = Boolean(dadosAssociado.email && dadosAssociado.email.includes('@'));
    const temCelular = Boolean(dadosAssociado.cel && dadosAssociado.cel.replace(/\D/g, '').length >= 10);
    
    // Verificar se o celular está habilitado para WhatsApp (usando o campo celwatzap)
    // Se o campo não existir, assumimos que não tem WhatsApp
    const temWhatsapp = Boolean(
      dadosAssociado.celwatzap === 'S' || 
      dadosAssociado.celwatzap === '1' || 
      dadosAssociado.celwatzap === 'true' || 
      dadosAssociado.celwatzap === true
    );

    // Se não tiver nenhum método disponível
    if (!temEmail && !temCelular) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Não existem métodos de recuperação para este cartão. Entre em contato com o suporte.' 
        },
        { status: 404 }
      );
    }

    // Mascarar os dados de contato para segurança
    const emailMascarado = temEmail ? mascaraEmail(dadosAssociado.email) : null;
    const celularMascarado = temCelular ? mascaraTelefone(dadosAssociado.cel) : null;

    // Retornar os métodos disponíveis
    return NextResponse.json({
      success: true,
      temEmail,
      temCelular,
      temWhatsapp: temWhatsapp && temCelular, // Só tem WhatsApp se tiver celular e celwatzap = S
      email: emailMascarado,
      celular: celularMascarado
    });

  } catch (error) {
    console.error('Erro ao verificar métodos de recuperação:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao verificar métodos de recuperação. Tente novamente mais tarde.',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Mascara o email para exibição, mostrando apenas parte do email
 * Ex: jo***@gm***.com
 */
function mascaraEmail(email: string): string {
  if (!email || email.indexOf('@') === -1) return '***@***.com';
  
  const [usuario, dominio] = email.split('@');
  const dominioPartes = dominio.split('.');
  const extensao = dominioPartes.pop() || '';
  const nomeUsuarioMascarado = usuario.substring(0, Math.min(2, usuario.length)) + '***';
  const nomeDominioMascarado = dominioPartes.join('.').substring(0, Math.min(2, dominioPartes.join('.').length)) + '***';
  
  return `${nomeUsuarioMascarado}@${nomeDominioMascarado}.${extensao}`;
}

/**
 * Mascara o telefone para exibição, mostrando apenas parte do número
 * Ex: (**) *****-1234
 */
function mascaraTelefone(telefone: string): string {
  if (!telefone) return '(**) *****-****';
  
  const numeroLimpo = telefone.replace(/\D/g, '');
  if (numeroLimpo.length < 4) return '(**) *****-****';
  
  const ultimosDigitos = numeroLimpo.slice(-4);
  return `(**) *****-${ultimosDigitos}`;
} 