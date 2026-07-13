import db from '@/lib/db';
import { dbLogger } from '@/lib/logger';

export type ClaimRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface CreateClaimRequestInput {
  businessId: string;
  requesterName: string;
  requesterContact: string;
  requesterNote?: string;
}

export interface SearchClaimRequestsOptions {
  status?: ClaimRequestStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export class ClaimRequestRepository {
  async create(data: CreateClaimRequestInput) {
    return db.businessClaimRequest.create({
      data,
      include: { business: true },
    });
  }

  async findById(id: string) {
    return db.businessClaimRequest.findUnique({
      where: { id },
      include: { business: true },
    });
  }

  async search(options: SearchClaimRequestsOptions) {
    const { status, search, page = 1, limit = 20 } = options;
    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { requesterName: { contains: search, mode: 'insensitive' } },
        { requesterContact: { contains: search, mode: 'insensitive' } },
        { adminNote: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      db.businessClaimRequest.findMany({
        where,
        include: { business: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.businessClaimRequest.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async approve(id: string, reviewedBy: string, adminNote?: string) {
    dbLogger.info({ id, reviewedBy }, 'Claim request approved');
    return db.businessClaimRequest.update({
      where: { id },
      data: {
        status: 'approved',
        reviewedBy,
        reviewedAt: new Date(),
        ...(adminNote !== undefined ? { adminNote } : {}),
      },
      include: { business: true },
    });
  }

  async reject(id: string, reviewedBy: string, adminNote: string) {
    dbLogger.info({ id, reviewedBy }, 'Claim request rejected');
    return db.businessClaimRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedBy,
        reviewedAt: new Date(),
        adminNote,
      },
      include: { business: true },
    });
  }

  async cancel(id: string) {
    dbLogger.info({ id }, 'Claim request cancelled');
    return db.businessClaimRequest.update({
      where: { id },
      data: { status: 'cancelled' },
      include: { business: true },
    });
  }

  async getStats() {
    const [pending, approved, rejected, total] = await Promise.all([
      db.businessClaimRequest.count({ where: { status: 'pending' } }),
      db.businessClaimRequest.count({ where: { status: 'approved' } }),
      db.businessClaimRequest.count({ where: { status: 'rejected' } }),
      db.businessClaimRequest.count(),
    ]);
    return { total, pending, approved, rejected };
  }
}

export const claimRequestRepository = new ClaimRequestRepository();
