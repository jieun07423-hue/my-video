import NextAuth, { DefaultSession } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from './db'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
    }
  }
}

const credentialsProvider = Credentials({
  name: 'credentials',
  credentials: {
    email: { label: '이메일', type: 'email' },
    password: { label: '비밀번호', type: 'password' }
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) {
      return null
    }

    try {
      const admin = await db.admin.findUnique({
        where: { username: credentials.email as string }
      })

      if (!admin || !admin.passwordHash) {
        return null
      }

      const passwordMatch = await bcrypt.compare(
        credentials.password as string,
        admin.passwordHash
      )

      if (!passwordMatch) {
        return null
      }

      return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      }
    } catch (error) {
      console.error('Auth error:', error)
      return null
    }
  }
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    credentialsProvider,
    // 카카오톡 OAuth 제공자 (예시)
    {
      id: 'kakao',
      name: 'Kakao',
      type: 'oauth',
      authorization: {
        url: 'https://kauth.kakao.com/oauth/authorize',
        params: {
          scope: 'profile_nickname profile_image account_email',
        },
      },
      token: 'https://kauth.kakao.com/oauth/token',
      userinfo: 'https://kapi.kakao.com/v2/user/me',
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.properties.nickname || '',
          email: profile.kakao_account?.email || '',
          image: profile.properties.profile_image || '',
        }
      },
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: false,
    },
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
      }
      return session
    },
  },
})

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
    }
  }
}