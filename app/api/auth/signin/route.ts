import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 실제 환경에서는 카카오 OAuth로 리다이렉트
    const kakaoAuthUrl = new URL('https://kauth.kakao.com/oauth/authorize')
    kakaoAuthUrl.searchParams.set('client_id', process.env.KAKAO_CLIENT_ID!)
    kakaoAuthUrl.searchParams.set('redirect_uri', process.env.NEXTAUTH_URL + '/api/auth/callback/kakao')
    kakaoAuthUrl.searchParams.set('response_type', 'code')
    kakaoAuthUrl.searchParams.set('scope', 'profile_nickname profile_image account_email')

    return NextResponse.json({ 
      authUrl: kakaoAuthUrl.toString()
    })
  } catch (error) {
    console.error('Signin error:', error)
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}