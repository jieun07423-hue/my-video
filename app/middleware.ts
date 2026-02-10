import { auth } from '@/app/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl

  // 인증이 필요없는 경로들
  const publicPaths = [
    '/auth/signin',
    '/auth/error',
    '/api/auth',
    '/api/businesses',
    '/api/dashboard/stats',
    '/api/sync',
    '/api/webhook',
  ]

  // API 라우트는 별도의 인증 미들웨어에서 처리
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')) {
    // API 라우트는 각각의 미들웨어에서 인증 처리
    return NextResponse.next()
  }

  // public 경로가 아니고 인증되지 않은 경우
  if (!publicPaths.some(path => pathname.startsWith(path))) {
    const session = req.auth
    if (!session) {
      const url = req.nextUrl.clone()
      url.pathname = '/auth/signin'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
    */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}