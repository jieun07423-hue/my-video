import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse, createBadRequestResponse } from '@/lib/api/handlers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (isActive !== null) where.isActive = isActive === 'true';

    const [items, total] = await Promise.all([
      db.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.product.count({ where }),
    ]);

    apiLogger.info({ page, limit, count: items.length }, 'Products retrieved');
    return NextResponse.json({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to fetch products');
    return createApiErrorResponse(error, '조회 실패', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, sku, description, price, stockQuantity, lowStockThreshold, category } = body;

    if (!name || !sku || price === undefined) {
      return createBadRequestResponse('name, sku, price는 필수 항목입니다');
    }

    const product = await db.product.create({
      data: {
        name,
        sku,
        description: description || null,
        price,
        stockQuantity: stockQuantity ?? null,
        lowStockThreshold: lowStockThreshold ?? 5,
        category: category || null,
      },
    });

    apiLogger.info({ productId: product.id, sku }, 'Product created');
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to create product');
    return createApiErrorResponse(error, '생성 실패', 400);
  }
}
