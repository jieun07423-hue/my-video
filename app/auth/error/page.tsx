'use client'

import { useSession } from 'next-auth/react'

export default function AuthErrorPage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            인증 오류
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            로그인 중 문제가 발생했습니다.
          </p>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              오류가 계속되면 관리자에게 문의하세요.
            </p>
          </div>
          {session && (
            <div className="mt-6">
              <button
                onClick={() => window.location.href = '/admin'}
                className="w-full flex justify-center py-2 px-4 border border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                관리자 페이지로 돌아가기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}