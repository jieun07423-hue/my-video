import { NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
}

export function createApiErrorResponse(
  error: unknown,
  defaultMessage: string,
  status: number = 500
): NextResponse {
  const errorMessage = error instanceof Error ? error.message : defaultMessage;
  
  apiLogger.error(
    { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      status 
    },
    `API Error: ${defaultMessage}`
  );

  return NextResponse.json(
    { error: errorMessage },
    { status }
  );
}

export function createSuccessResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function createNotFoundResponse(message: string = '리소스를 찾을 수 없습니다'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 404 }
  );
}

export function createBadRequestResponse(message: string = '잘못된 요청입니다'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 400 }
  );
}

export async function handleApiCall<T>(
  apiCall: () => Promise<T>,
  errorMessage: string
): Promise<NextResponse> {
  try {
    const result = await apiCall();
    return createSuccessResponse(result);
  } catch (error) {
    return createApiErrorResponse(error, errorMessage);
  }
}