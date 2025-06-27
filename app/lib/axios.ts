import axios from 'axios';

// Determinar se estamos em ambiente de desenvolvimento
const isDevelopment = process.env.NODE_ENV === 'development';

// Criar uma instância do axios com a configuração base
const api = axios.create({
  // Em desenvolvimento, usar a rota de proxy do Next.js para evitar problemas de CORS
  baseURL: isDevelopment ? '/api' : 'https://sas.makecard.com.br/',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  }
});

// Interceptor para adicionar logs e tratar erros
api.interceptors.request.use(
  config => {
    // Log da requisição (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      console.log('Requisição:', config.url, config.data);
    }
    return config;
  },
  error => {
    console.error('Erro na requisição:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  response => {
    // Log da resposta (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development') {
      console.log('Resposta:', response.data);
    }
    return response;
  },
  error => {
    console.error('Erro na resposta:', error);
    return Promise.reject(error);
  }
);

export default api; 