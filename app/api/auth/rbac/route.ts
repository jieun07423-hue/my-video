import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';
import { rbacService, UserRole } from '@/lib/services/rbac.service';
import { z } from 'zod';

const CheckPermissionSchema = z.object({
  role: z.enum(['owner', 'manager', 'kitchen', 'staff']),
  permission: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CheckPermissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: '잘못된 요청 형식입니다.' }, { status: 400 });
    }

    const { role, permission } = parsed.data;
    const allowed = rbacService.hasPermission(role as UserRole, permission);

    apiLogger.info({ role, permission, allowed }, 'RBAC 권한 검증 수행');

    return NextResponse.json({
      success: true,
      role,
      permission,
      allowed,
      availablePermissions: rbacService.getPermissionsForRole(role as UserRole),
    });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'RBAC 검증 실패');
    return NextResponse.json({ success: false, error: '권한 검증 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
