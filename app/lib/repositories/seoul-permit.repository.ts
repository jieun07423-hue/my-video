import db from '@/lib/db';
import { syncLogger } from '@/lib/logger';

export interface CreateSeoulPermitInput {
  manageNo: string;
  bplcNm: string;
  bpNm?: string;
  bizcnd?: string;
  locplcd?: string;
  rdnWhladdr?: string;
  siteTel?: string;
  apvPermYmd?: string;
  apvCancelYmd?: string;
  trdStateGbn?: string;
  trdStateNm?: string;
  dtlStateGbn?: string;
  dtlStateNm?: string;
  dcbyYmd?: string;
  sitePostNo?: string;
  xCoord?: number;
  yCoord?: number;
  serviceCode: string;
}

export class SeoulPermitRepository {
  async upsertMany(data: CreateSeoulPermitInput[]): Promise<number> {
    let inserted = 0;

    for (const item of data) {
      try {
        await db.seoulPermit.upsert({
          where: { manageNo: item.manageNo },
          update: {
            bplcNm: item.bplcNm,
            bpNm: item.bpNm,
            bizcnd: item.bizcnd,
            locplcd: item.locplcd,
            rdnWhladdr: item.rdnWhladdr,
            siteTel: item.siteTel,
            apvPermYmd: item.apvPermYmd,
            apvCancelYmd: item.apvCancelYmd,
            trdStateGbn: item.trdStateGbn,
            trdStateNm: item.trdStateNm,
            dtlStateGbn: item.dtlStateGbn,
            dtlStateNm: item.dtlStateNm,
            dcbyYmd: item.dcbyYmd,
            sitePostNo: item.sitePostNo,
            xCoord: item.xCoord ? item.xCoord : null,
            yCoord: item.yCoord ? item.yCoord : null,
            serviceCode: item.serviceCode,
          },
          create: {
            manageNo: item.manageNo,
            bplcNm: item.bplcNm,
            bpNm: item.bpNm,
            bizcnd: item.bizcnd,
            locplcd: item.locplcd,
            rdnWhladdr: item.rdnWhladdr,
            siteTel: item.siteTel,
            apvPermYmd: item.apvPermYmd,
            apvCancelYmd: item.apvCancelYmd,
            trdStateGbn: item.trdStateGbn,
            trdStateNm: item.trdStateNm,
            dtlStateGbn: item.dtlStateGbn,
            dtlStateNm: item.dtlStateNm,
            dcbyYmd: item.dcbyYmd,
            sitePostNo: item.sitePostNo,
            xCoord: item.xCoord ? item.xCoord : null,
            yCoord: item.yCoord ? item.yCoord : null,
            serviceCode: item.serviceCode,
          },
        });
        inserted++;
      } catch (error) {
        dbLogger.error({ error: error.message, manageNo: item.manageNo }, 'Failed to upsert permit');
      }
    }

    return inserted;
  }

  async findMany(options: {
    serviceCode?: string;
    trdStateNm?: string;
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ items: any[]; total: number }> {
    const { serviceCode, trdStateNm, search, page, limit } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (serviceCode) where.serviceCode = serviceCode;
    if (trdStateNm) where.trdStateNm = trdStateNm;
    if (search) {
      where.OR = [
        { bplcNm: { contains: search, mode: 'insensitive' } },
        { bpNm: { contains: search, mode: 'insensitive' } },
        { rdnWhladdr: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      db.seoulPermit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.seoulPermit.count({ where }),
    ]);

    return { items, total };
  }

  async countByServiceCode(): Promise<any[]> {
    return db.seoulPermit.groupBy({
      by: ['serviceCode', 'trdStateNm'],
      _count: true,
    });
  }

  async getStats(): Promise<{ total: number; active: number; closed: number; byService: any[] }> {
    const total = await db.seoulPermit.count();
    const active = await db.seoulPermit.count({
      where: { trdStateNm: { not: '폐업' } },
    });
    const closed = await db.seoulPermit.count({
      where: { trdStateNm: '폐업' },
    });
    const byService = await this.countByServiceCode();

    return { total, active, closed, byService };
  }
}

export const seoulPermitRepository = new SeoulPermitRepository();