import { apiLogger } from '@/lib/logger';

export interface SettlementReport {
  storeId: string;
  date: string;
  totalSales: number;
  pgFee: number;
  vat: number;
  netPayout: number;
  transactionCount: number;
}

export class SettlementService {
  async calculateDailySettlement(storeId: string, date: string, grossSales: number, txCount: number): Promise<SettlementReport> {
    const pgFeeRate = 0.022; // 2.2% Toss Payments fee
    const pgFee = Math.round(grossSales * pgFeeRate);
    const vat = Math.round((grossSales - pgFee) * 0.1);
    const netPayout = grossSales - pgFee - vat;

    apiLogger.info({ storeId, date, grossSales, netPayout }, '일일 정산 자동 계산 완료');

    return {
      storeId,
      date,
      totalSales: grossSales,
      pgFee,
      vat,
      netPayout,
      transactionCount: txCount,
    };
  }
}

export const settlementService = new SettlementService();
