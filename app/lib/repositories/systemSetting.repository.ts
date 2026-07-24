import { dbLogger } from '../logger';
import db from '@/lib/db';
import { SystemSetting } from '@prisma/client';

export class SystemSettingRepository {
  async get(key: string): Promise<SystemSetting | null> {
    try {
      return await db.systemSetting.findUnique({
        where: { key },
      });
    } catch (error) {
      dbLogger.error({ error, key }, 'Failed to get system setting');
      throw error;
    }
  }

  async getValue(key: string, defaultValue = ''): Promise<string> {
    try {
      const setting = await this.get(key);
      return setting ? setting.value : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  async set(key: string, value: string): Promise<SystemSetting> {
    try {
      return await db.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    } catch (error) {
      dbLogger.error({ error, key }, 'Failed to set system setting');
      throw error;
    }
  }

  async delete(key: string): Promise<SystemSetting | null> {
    try {
      return await db.systemSetting.delete({
        where: { key },
      });
    } catch (error) {
      dbLogger.error({ error, key }, 'Failed to delete system setting');
      throw error;
    }
  }

  async getAll(): Promise<SystemSetting[]> {
    try {
      return await db.systemSetting.findMany();
    } catch (error) {
      dbLogger.error({ error }, 'Failed to get all system settings');
      throw error;
    }
  }
}

export const systemSettingRepository = new SystemSettingRepository();
