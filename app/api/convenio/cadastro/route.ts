import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';

interface BackendResponse {
  situacao?: string | number;
  mensagem?: string;
  data?: Record<string, string | number | boolean | null>;
  cpf?: string;
  cnpj?: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Validar campos obrigatórios
    const camposObrigatorios = [
      'razaoSocial',
      'nomeFantasia',
      'cep',
      'endereco',
      'numero',
      'bairro',
      'cidade',
      'uf',
      'celular',
      'email',
      'responsavel',
      'categoria',
      'tipoEmpresa'
    ];

    for (const campo of camposObrigatorios) {
      if (!formData.get(campo)) {
        return NextResponse.json(
          { success: false, message: `O campo ${campo} é obrigatório` },
          { status: 400 }
        );
      }
    }

    // Validar CPF/CNPJ baseado no tipo de empresa
    const tipoEmpresa = formData.get('tipoEmpresa') as string;
    if (tipoEmpresa === '2' && !formData.get('cnpj')) {
      return NextResponse.json(
        { success: false, message: 'CNPJ é obrigatório para Pessoa Jurídica' },
        { status: 400 }
      );
    }
    if (tipoEmpresa === '1' && !formData.get('cpf')) {
      return NextResponse.json(
        { success: false, message: 'CPF é obrigatório para Pessoa Física' },
        { status: 400 }
      );
    }

    // Preparar dados para envio ao backend
    const params = new URLSearchParams();
    params.append('C_razaosocial', formData.get('razaoSocial') as string);
    params.append('C_nomefantasia', formData.get('nomeFantasia') as string);
    params.append('C_endereco', formData.get('endereco') as string);
    params.append('C_numero', formData.get('numero') as string);
    params.append('C_complemento', formData.get('complemento') as string || '');
    params.append('C_bairro', formData.get('bairro') as string);
    params.append('C_cidade', formData.get('cidade') as string);
    params.append('C_uf', formData.get('uf') as string);
    params.append('C_cep', formData.get('cep') as string);
    params.append('C_tel1', formData.get('telefone') as string || '');
    params.append('C_tel2', '');
    params.append('C_cel', formData.get('celular') as string);
    params.append('C_tipo', '2'); // COMPRAS
    params.append('C_contato', formData.get('responsavel') as string);
    params.append('C_prolabore', formData.get('prolabore') as string || '4');
    params.append('C_prolabore2', formData.get('prolabore2') as string || '0');
    params.append('C_cnpj', formData.get('cnpj') as string || '');
    params.append('C_cpf', formData.get('cpf') as string || '');
    params.append('C_Inscestadual', '');
    params.append('C_categoria', formData.get('categoria') as string);
    params.append('C_categoriarecibo', '0');
    params.append('C_parcelamento', '0');
    params.append('C_registro', '');
    params.append('C_datacadastro', new Date().toISOString().split('T')[0]);
    params.append('C_email', formData.get('email') as string);
    params.append('C_email2', '');
    params.append('C_inscmunicipal', '');
    params.append('C_tipoempresa', tipoEmpresa);
    params.append('C_cobranca', '1');
    params.append('C_desativado', '0');
    params.append('C_app', '1');

    console.log('Dados sendo enviados:', Object.fromEntries(params));

    // Enviar requisição para o backend
    const response = await axios.post('https://sas.makecard.com.br/grava_convenio.php', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('Resposta completa do backend:', {
      status: response.status,
      data: response.data,
      headers: response.headers
    });

    // Verificar se há mensagem de CPF/CNPJ duplicado na resposta, independente da situação
    const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    const hasCpfDuplicado = responseText.includes('CPF já cadastrado') || 
                           responseText.includes('cpf já cadastrado') ||
                           responseText.includes('CPF duplicado') ||
                           (response.data.cpf && responseText.includes('já cadastrado'));
    
    const hasCnpjDuplicado = responseText.includes('CNPJ já cadastrado') || 
                            responseText.includes('cnpj já cadastrado') ||
                            responseText.includes('CNPJ duplicado') ||
                            (response.data.cnpj && responseText.includes('já cadastrado'));

    // Se há indicação de duplicado, retornar erro mesmo se situacao=1
    if (hasCpfDuplicado) {
      console.log('CPF duplicado detectado na resposta:', response.data);
      return NextResponse.json({
        success: false,
        message: `CPF já cadastrado. Use outro CPF ou entre em contato para revalidar sua senha.`,
        data: response.data
      }, { status: 400 });
    }

    if (hasCnpjDuplicado) {
      console.log('CNPJ duplicado detectado na resposta:', response.data);
      return NextResponse.json({
        success: false,
        message: `CNPJ já cadastrado. Use outro CNPJ ou entre em contato para revalidar sua senha.`,
        data: response.data
      }, { status: 400 });
    }

    // Verificar a resposta do backend por código de situação
    if (response.data.situacao === '2' || response.data.situacao === 2) {
      return NextResponse.json({
        success: false,
        message: `CPF ${response.data.cpf} já cadastrado. Use outro CPF ou entre em contato para revalidar sua senha.`,
        data: response.data
      }, { status: 400 });
    }

    if (response.data.situacao === '3' || response.data.situacao === 3) {
      return NextResponse.json({
        success: false,
        message: `CNPJ ${response.data.cnpj} já cadastrado. Use outro CNPJ ou entre em contato para revalidar sua senha.`,
        data: response.data
      }, { status: 400 });
    }

    // Verificar se o cadastro foi bem sucedido
    if (response.data.situacao === '1' || response.data.situacao === 1) {
      return NextResponse.json({
        success: true,
        message: 'Cadastro realizado com sucesso! Verifique seu e-mail para obter as credenciais.',
        data: response.data
      });
    }

    // Se chegou aqui, algo deu errado
    console.error('Erro no cadastro - Resposta do backend:', response.data);
    return NextResponse.json({
      success: false,
      message: response.data.mensagem || 'Erro ao realizar cadastro. Tente novamente.'
    }, { status: 500 });

  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    const responseData = axiosError.response?.data as BackendResponse;
    
    console.error('Erro detalhado no cadastro:', {
      message: axiosError.message,
      response: responseData,
      status: axiosError.response?.status,
      config: axiosError.config
    });

    // Se o erro for 500 mas o cadastro foi bem sucedido, retornar sucesso
    // REMOVIDO: Esta lógica estava causando inconsistência entre erro mostrado e cadastro salvo
    // if (responseData?.situacao === '1' || responseData?.situacao === 1) {
    //   return NextResponse.json({
    //     success: true,
    //     message: 'Cadastro realizado com sucesso! Verifique seu e-mail para obter as credenciais.',
    //     data: responseData
    //   });
    // }

    // Verificar CPF/CNPJ já cadastrado no erro
    if (responseData?.situacao === '2' || responseData?.situacao === 2) {
      return NextResponse.json({
        success: false,
        message: `CPF ${responseData.cpf} já cadastrado. Use outro CPF ou entre em contato para revalidar sua senha.`,
        data: responseData
      }, { status: 400 });
    }

    if (responseData?.situacao === '3' || responseData?.situacao === 3) {
      return NextResponse.json({
        success: false,
        message: `CNPJ ${responseData.cnpj} já cadastrado. Use outro CNPJ ou entre em contato para revalidar sua senha.`,
        data: responseData
      }, { status: 400 });
    }

    return NextResponse.json(
      { 
        success: false, 
        message: responseData?.mensagem || 'Erro ao realizar cadastro. Tente novamente.',
        details: responseData
      },
      { status: axiosError.response?.status || 500 }
    );
  }
} 