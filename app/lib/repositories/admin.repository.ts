import { dbLogger } from '../logger';
import db from '@/lib/db';
import { Admin } from '@prisma/client';

export class AdminRepository {
  async findByUsername(username: string): Promise<Admin | null> {
    try {
      return await db.admin.findUnique({
        where: { username },
      });
    } catch (error) {
      dbLogger.error({ error, username }, 'Failed to find admin by username');
      throw error;
    }
  }
}

export const adminRepository = new AdminRepository();
