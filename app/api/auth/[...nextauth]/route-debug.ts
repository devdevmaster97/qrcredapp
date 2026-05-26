import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";
import { User } from "next-auth";
import { JWT } from "next-auth/jwt";

interface CustomToken extends JWT {
  cartao: string;
  matricula: string;
  empregador: string;
  senha: string;
  nome: string;
  nome_divisao: string;
}

interface CustomUser extends User {
  cartao: string;
  matricula: string;
  empregador: string;
  senha: string;
  nome: string;
  nome_divisao: string;
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      cartao: string;
      matricula: string;
      empregador: string;
      senha: string;
      nome: string;
      nome_divisao: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
  interface JWT {
    cartao: string;
    matricula: string;
    empregador: string;
    senha: string;
    nome: string;
    nome_divisao: string;
  }
}

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        cartao: { label: "Cartão", type: "text" },
        senha: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        console.log('🔍 [NextAuth authorize] INICIADO');
        console.log('🔍 [NextAuth authorize] credentials:', credentials);
        
        if (!credentials?.cartao || !credentials?.senha) {
          console.error('❌ [NextAuth authorize] Credenciais faltando!');
          throw new Error('Cartão e senha são obrigatórios');
        }

        console.log('🔍 [NextAuth authorize] Chamando PHP com:', { cartao: credentials.cartao, senha: '***' });

        try {
          const response = await axios.post("https://sas.makecard.com.br/login_app.php", {
            cartao: credentials.cartao,
            senha: credentials.senha
          });

          const data = response.data;
          console.log('🔍 [NextAuth authorize] Resposta do PHP:', data);

          if (data.success) {
            const userObj = {
              id: credentials.cartao,
              cartao: credentials.cartao,
              matricula: data.matricula,
              empregador: data.empregador,
              senha: credentials.senha,
              nome: data.nome,
              name: data.nome,
              email: data.email || `${credentials.cartao}@qrcred.com.br`
            } as CustomUser;
            
            console.log('✅ [NextAuth authorize] User object criado:', userObj);
            return userObj;
          }

          console.error('❌ [NextAuth authorize] Login falhou:', data.message);
          throw new Error(data.message || 'Credenciais inválidas');
        } catch (error) {
          console.error('❌ [NextAuth authorize] Erro:', error);
          if (axios.isAxiosError(error) && error.response?.data?.message) {
            throw new Error(error.response.data.message);
          }
          throw new Error('Erro ao realizar login');
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const customUser = user as CustomUser;
        console.log('🔍 [NextAuth jwt] User recebido:', customUser);
        
        const newToken = {
          ...token,
          cartao: customUser.cartao,
          matricula: customUser.matricula,
          empregador: customUser.empregador,
          senha: customUser.senha,
          nome: customUser.nome
        };
        
        console.log('🔍 [NextAuth jwt] Token criado:', newToken);
        return newToken;
      }
      console.log('🔍 [NextAuth jwt] Token existente:', token);
      return token;
    },
    async session({ session, token }) {
      const customToken = token as CustomToken;
      console.log('🔍 [NextAuth session] Token recebido:', customToken);
      
      if (session.user) {
        session.user.cartao = customToken.cartao;
        session.user.matricula = customToken.matricula;
        session.user.empregador = customToken.empregador;
        session.user.senha = customToken.senha;
        session.user.nome = customToken.nome;
        
        console.log('🔍 [NextAuth session] Session.user final:', session.user);
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
    error: "/login?error=1",
  },
});

export { handler as GET, handler as POST };
