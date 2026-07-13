import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import db, { getPrismaClientInstance } from './db'
import { adminRepository } from '@/lib/repositories/admin.repository'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import type { DefaultSession } from '@auth/core/types'

/**
 * NextAuth v5 — @auth/core 모듈 Augmentation.
 * Session.user에 role 필드를 추가하여 커스텀 타입을 전파.
 */
declare module '@auth/core/types' {
  interface Session {
    user: {
      id: string
      email: string
      role: string
    } & DefaultSession['user']
  }
}

const credentialsProvider = Credentials({
  name: 'credentials',
  credentials: {
    email: { label: '이메일', type: 'email' },
    password: { label: '비밀번호', type: 'password' },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) {
      return null
    }

    try {
      const admin = await adminRepository.findByUsername(credentials.email as string)

      if (!admin || !admin.passwordHash) {
        return null
      }

      const passwordMatch = await bcrypt.compare(
        credentials.password as string,
        admin.passwordHash,
      )

      if (!passwordMatch) {
        return null
      }

      return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      }
    } catch (error) {
      console.error('Auth error:', error)
      return null
    }
  },
})

const USE_REAL_DB = !!process.env.DATABASE_URL
const prismaClient = USE_REAL_DB ? getPrismaClientInstance() : null

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: prismaClient ? PrismaAdapter(prismaClient) : undefined,
  providers: [
    credentialsProvider,
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
      profile(profile: { id: { toString: () => string }; properties: { nickname?: string; profile_image?: string }; kakao_account?: { email?: string } }) {
        return {
          id: profile.id.toString(),
          name: profile.properties?.nickname || '',
          email: profile.kakao_account?.email || '',
          image: profile.properties?.profile_image || '',
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
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.role = (user as { role?: string }).role || 'admin'
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.role = token.role as string
      }
      return session
    },
  },
})