import { NextRequest, NextResponse } from 'next/server';
import {
  processQualityRequest,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  getRequestStats,
  generateApiKeyDocumentation,
} from '@/lib/services/quality/quality-api-gateway.service';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse } from '@/lib/api/handlers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'docs') {
      const docs = generateApiKeyDocumentation();
      return new NextResponse(docs, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (action === 'keys') {
      const keys = listApiKeys();
      const safeKeys = keys.map(k => ({
        id: k.id,
        name: k.name,
        permissions: k.permissions,
        rateLimit: k.rateLimit,
        createdAt: k.createdAt,
        expiresAt: k.expiresAt,
        active: k.active,
      }));
      return NextResponse.json({ keys: safeKeys });
    }

    if (action === 'stats') {
      const apiKeyId = searchParams.get('apiKeyId') || undefined;
      const hours = parseInt(searchParams.get('hours') || '24', 10);
      const stats = getRequestStats(apiKeyId, hours);
      return NextResponse.json(stats);
    }

    return NextResponse.json({ error: 'action 파라미터가 필요합니다' }, { status: 400 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'API 게이트웨이 조회 실패');
    return createApiErrorResponse(error, 'API 게이트웨이 조회 실패', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name, permissions, rateLimit, expiresAt, keyId } = body;

    if (action === 'create-key') {
      if (!name || !permissions) {
        return NextResponse.json({ error: 'name과 permissions이 필요합니다' }, { status: 400 });
      }

      const apiKey = createApiKey(name, permissions, rateLimit, expiresAt ? new Date(expiresAt) : undefined);
      apiLogger.info({ keyId: apiKey.id, name: apiKey.name }, 'API 키 생성');
      return NextResponse.json({
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key,
        permissions: apiKey.permissions,
        rateLimit: apiKey.rateLimit,
        createdAt: apiKey.createdAt,
        expiresAt: apiKey.expiresAt,
      });
    }

    if (action === 'revoke-key') {
      if (!keyId) {
        return NextResponse.json({ error: 'keyId가 필요합니다' }, { status: 400 });
      }

      const success = revokeApiKey(keyId);
      if (success) {
        return NextResponse.json({ success: true, message: 'API 키가 폐기되었습니다' });
      }
      return NextResponse.json({ error: 'API 키를 찾을 수 없습니다' }, { status: 404 });
    }

    if (action === 'process') {
      const { apiKey, resource, parameters } = body;
      if (!apiKey || !resource) {
        return NextResponse.json({ error: 'apiKey와 resource가 필요합니다' }, { status: 400 });
      }

      const result = await processQualityRequest({
        apiKey,
        resource,
        action: 'read',
        parameters: parameters || {},
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'API 게이트웨이 처리 실패');
    return createApiErrorResponse(error, 'API 게이트웨이 처리 실패', 500);
  }
}
