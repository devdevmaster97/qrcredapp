import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cod_convenio = searchParams.get('cod_convenio');

    if (!cod_convenio) {
      return NextResponse.json(
        { success: false, message: 'Código do convênio é obrigatório' },
        { status: 400 }
      );
    }

    console.log(`🏥 Buscando endereço do convênio: ${cod_convenio}`);

    // Fazer requisição para buscar dados do convênio
    const params = new URLSearchParams();
    params.append('cod_convenio', cod_convenio.toString());

    const response = await axios.post(
      'https://sas.makecard.com.br/buscar_convenio_endereco_app.php',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000
      }
    );

    console.log(`📥 Resposta do backend para convênio ${cod_convenio}:`, response.data);

    if (response.data && response.data.success) {
      return NextResponse.json({
        success: true,
        data: {
          convenio_nome: response.data.convenio_nome || response.data.nome_fantasia || response.data.razaosocial,
          endereco: response.data.endereco,
          numero: response.data.numero,
          complemento: response.data.complemento,
          bairro: response.data.bairro,
          cidade: response.data.cidade,
          estado: response.data.estado || response.data.uf,
          cep: response.data.cep,
          telefone: response.data.telefone || response.data.tel,
          celular: response.data.celular || response.data.cel,
          latitude: response.data.latitude,
          longitude: response.data.longitude
        }
      });
    } else {
      // Se a API específica não existir, retornar dados básicos
      console.log(`⚠️ API específica não encontrada, retornando dados básicos para convênio ${cod_convenio}`);
      return NextResponse.json({
        success: true,
        data: {
          convenio_nome: 'Convênio',
          endereco: 'Endereço não disponível',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          estado: '',
          cep: '',
          telefone: '',
          celular: '',
          latitude: null,
          longitude: null
        }
      });
    }

  } catch (error) {
    console.error('❌ Erro ao buscar endereço do convênio:', error);
    
    // Em caso de erro, retornar dados básicos para não quebrar a interface
    return NextResponse.json({
      success: true,
      data: {
        convenio_nome: 'Convênio',
        endereco: 'Endereço não disponível no momento',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        telefone: '',
        celular: '',
        latitude: null,
        longitude: null
      }
    });
  }
} 