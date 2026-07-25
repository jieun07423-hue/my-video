import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';

export type AdminRole = 'super_admin' | 'admin' | 'viewer';

export async function requireAuth() {
  const session = await auth();
  
  if (!session) {
    return null;
  }
  
  return session;
}

export async function requireRole(allowedRoles: AdminRole[]) {
  const session = await auth();
  
  if (!session) {
    return null;
  }
  
  const userRole = (session.user as { role?: AdminRole } | undefined)?.role;
  
  if (!userRole || !allowedRoles.includes(userRole)) {
    return null;
  }
  
  return session;
}

export async function checkPermission(requiredRole: AdminRole = 'admin') {
  const session = await auth();
  
  if (!session) {
    return { 
      allowed: false, 
      response: NextResponse.json(
        { error: '인증이 필요합니다' }, 
        { status: 401 }
      ) 
    };
  }
  
  const userRole = (session.user as { role?: AdminRole } | undefined)?.role;
  const roleHierarchy: Record<AdminRole, number> = {
    super_admin: 3,
    admin: 2,
    viewer: 1,
  };
  
  if (!userRole || roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
    apiLogger.warn({ userId: (session.user as { id?: string } | undefined)?.id, userRole, requiredRole }, '권한 부족');
    return { 
      allowed: false, 
      response: NextResponse.json(
        { error: '권한이 없습니다' }, 
        { status: 403 }
      ) 
    };
  }
  
  return { allowed: true, session };
}