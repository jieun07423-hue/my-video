import { apiLogger } from '@/lib/logger';

interface CustomerStampRecord {
  phone: string;
  storeId: string;
  stamps: number;
  coupons: string[];
}

const stampStore = new Map<string, CustomerStampRecord>();

export class RewardService {
  async addStamp(phone: string, storeId: string, count: number = 1): Promise<{ stamps: number; couponIssued: boolean; couponCode?: string }> {
    const key = `${storeId}:${phone}`;
    const record = stampStore.get(key) || { phone, storeId, stamps: 0, coupons: [] };

    record.stamps += count;
    let couponIssued = false;
    let couponCode: string | undefined;

    if (record.stamps >= 10) {
      record.stamps -= 10;
      couponCode = `COUPON-${Date.now().toString(36).toUpperCase()}`;
      record.coupons.push(couponCode);
      couponIssued = true;
    }

    stampStore.set(key, record);
    apiLogger.info({ phone, storeId, stamps: record.stamps, couponIssued }, '스탬프 적립 및 리워드 처리');

    return { stamps: record.stamps, couponIssued, couponCode };
  }

  async getCustomerRewards(phone: string, storeId: string): Promise<CustomerStampRecord> {
    const key = `${storeId}:${phone}`;
    return stampStore.get(key) || { phone, storeId, stamps: 0, coupons: [] };
  }
}

export const rewardService = new RewardService();
