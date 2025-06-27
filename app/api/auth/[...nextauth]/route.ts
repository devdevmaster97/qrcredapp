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
}

interface CustomUser extends User {
  cartao: string;
  matricula: string;
  empregador: string;
  senha: string;
}

declare module 'next-auth' {
  interface Session {
    user: CustomUser;
  }
  interface JWT {
    cartao: string;
    matricula: string;
    empregador: string;
    senha: string;
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
        if (!credentials?.cartao || !credentials?.senha) {
          throw new Error('Cartão e senha são obrigatórios');
        }

        try {
          const response = await axios.post("https://sas.makecard.com.br/login_app.php", {
            cartao: credentials.cartao,
            senha: credentials.senha
          });

          const data = response.data;

          if (data.success) {
            return {
              id: credentials.cartao,
              cartao: credentials.cartao,
              matricula: data.matricula,
              empregador: data.empregador,
              senha: credentials.senha,
              name: data.nome,
              email: data.email || `${credentials.cartao}@qrcred.com.br`
            } as CustomUser;
          }

          throw new Error(data.message || 'Credenciais inválidas');
        } catch (error) {
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
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const customUser = user as CustomUser;
        return {
          ...token,
          cartao: customUser.cartao,
          matricula: customUser.matricula,
          empregador: customUser.empregador,
          senha: customUser.senha
        };
      }
      return token;
    },
    async session({ session, token }) {
      const customToken = token as CustomToken;
      if (session.user) {
        session.user.cartao = customToken.cartao;
        session.user.matricula = customToken.matricula;
        session.user.empregador = customToken.empregador;
        session.user.senha = customToken.senha;
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