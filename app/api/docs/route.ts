import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/docs - API 문서 리다이렉트
 */
export async function GET() {
  // API 문서 페이지로 리다이렉트
  return NextResponse.redirect('/api-docs/');
}