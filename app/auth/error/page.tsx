'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || '알 수 없는 오류'
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  // 에러 메시지 매핑
  const getErrorMessage = (errorCode: string) => {
    const messages: Record<string, string> = {
      'Configuration': '서버 설정 오류입니다.',
      'AccessDenied': '접근이 거부되었습니다.',
      'Verification': '인증 링크가 유효하지 않습니다.',
      'OAuthSignin': 'OAuth 로그인 오류입니다.',
      'OAuthCallback': 'OAuth 콜백 오류입니다.',
      'Default': '로그인 중 문제가 발생했습니다.'
    }
    return messages[errorCode] || messages['Default']
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            인증 오류
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {getErrorMessage(error)}
          </p>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              오류가 계속되면 관리자에게 문의하세요.
            </p>
          </div>
          <div className="mt-6">
            <a
              href="/auth/signin"
              className="w-full flex justify-center py-2 px-4 border border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              로그인 페이지로 돌아가기
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}