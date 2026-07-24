import db from '@/lib/db';
import { dbLogger } from '@/lib/logger';
import { Prisma } from '@prisma/client';

export interface CreateProductInput {
  storeId: string;
  name: string;
  sku: string;
  description?: string;
  price: number | Prisma.Decimal;
  stockQuantity?: number | null;
  lowStockThreshold?: number;
  isSoldOut?: boolean;
  isActive?: boolean;
  category?: string;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  description?: string;
  price?: number | Prisma.Decimal;
  stockQuantity?: number | null;
  lowStockThreshold?: number;
  isSoldOut?: boolean;
  isActive?: boolean;
  category?: string;
}

export interface SearchProductsOptions {
  page?: number;
  limit?: number;
  query?: string;
  category?: string;
  isActive?: boolean;
}

export class ProductRepository {
  async create(data: CreateProductInput) {
    dbLogger.info({ name: data.name, sku: data.sku }, '상품 생성 시작');
    try {
      const product = await db.product.create({
        data: {
          store: { connect: { id: data.storeId } },
          name: data.name,
          sku: data.sku,
          description: data.description,
          price: new Prisma.Decimal(data.price.toString()),
          stockQuantity: data.stockQuantity,
          lowStockThreshold: data.lowStockThreshold,
          isSoldOut: data.isSoldOut ?? false,
          isActive: data.isActive ?? true,
          category: data.category,
        },
      });
      dbLogger.info({ productId: product.id }, '상품 생성 완료');
      return product;
    } catch (error: any) {
      dbLogger.error({ error: error.message, sku: data.sku }, '상품 생성 실패');
      throw error;
    }
  }

  async createMany(data: CreateProductInput[]) {
    dbLogger.info({ count: data.length }, '상품 벌크 생성 시작');
    try {
      const preparedData = data.map(item => ({
        storeId: item.storeId,
        name: item.name,
        sku: item.sku,
        description: item.description,
        price: new Prisma.Decimal(item.price.toString()),
        stockQuantity: item.stockQuantity,
        lowStockThreshold: item.lowStockThreshold ?? 5,
        isSoldOut: item.isSoldOut ?? false,
        isActive: item.isActive ?? true,
        category: item.category,
      }));

      const result = await db.product.createMany({
        data: preparedData,
        skipDuplicates: true,
      });
      dbLogger.info({ count: result.count }, '상품 벌크 생성 완료');
      return result;
    } catch (error: any) {
      dbLogger.error({ error: error.message }, '상품 벌크 생성 실패');
      throw error;
    }
  }

  async findById(id: string) {
    return db.product.findUnique({
      where: { id },
    });
  }

  async findBySku(sku: string) {
    return db.product.findUnique({
      where: { sku },
    });
  }

  async update(id: string, data: UpdateProductInput) {
    dbLogger.info({ productId: id }, '상품 수정 시작');
    try {
      const updateData: Prisma.ProductUpdateInput = { ...data };
      if (data.price !== undefined) {
        updateData.price = new Prisma.Decimal(data.price.toString());
      }
      const product = await db.product.update({
        where: { id },
        data: updateData,
      });
      dbLogger.info({ productId: id }, '상품 수정 완료');
      return product;
    } catch (error: any) {
      dbLogger.error({ error: error.message, productId: id }, '상품 수정 실패');
      throw error;
    }
  }

  async delete(id: string) {
    dbLogger.info({ productId: id }, '상품 삭제 시작');
    try {
      const result = await db.product.delete({
        where: { id },
      });
      dbLogger.info({ productId: id }, '상품 삭제 완료');
      return result;
    } catch (error: any) {
      dbLogger.error({ error: error.message, productId: id }, '상품 삭제 실패');
      throw error;
    }
  }

  async search(options: SearchProductsOptions = {}) {
    const { page = 1, limit = 20, query, category, isActive } = options;
    
    const where: Prisma.ProductWhereInput = {};
    
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    
    if (category) {
      where.category = category;
    }
    
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    try {
      const [items, total] = await Promise.all([
        db.product.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        db.product.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      dbLogger.error({ error: error.message }, '상품 검색 실패');
      throw error;
    }
  }

  async getCategories() {
    try {
      const products = await db.product.findMany({
        select: { category: true },
        distinct: ['category'],
        where: { category: { not: null } },
      });
      return products.map(p => p.category).filter(Boolean) as string[];
    } catch (error: any) {
      dbLogger.error({ error: error.message }, '카테고리 목록 조회 실패');
      throw error;
    }
  }
}

export const productRepository = new ProductRepository();
