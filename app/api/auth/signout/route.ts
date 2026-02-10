import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth'
import { signOut } from 'next-auth'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: '이미 로그아웃 상태입니다' }, { status: 400 })
    }

    await signOut()
    
    return NextResponse.json({ message: '성공적으로 로그아웃되었습니다' })
  } catch (error) {
    console.error('Signout error:', error)
    return NextResponse.json(
      { error: '로그아웃 처리 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}