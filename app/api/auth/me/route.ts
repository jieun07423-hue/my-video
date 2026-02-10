import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth'

export async function GET(request: NextRequest) {
  const session = await auth()
  
  if (!session) {
    return NextResponse.json({ error: '인증되지 않은 사용자입니다' }, { status: 401 })
  }

  return NextResponse.json({ 
    user: {
      id: session.user.id,
      email: session.user.email,
    },
    session
  })
}