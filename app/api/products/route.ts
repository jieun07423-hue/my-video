import { NextRequest, NextResponse } from 'next/server';
import { productRepository } from '@/lib/repositories/product.repository';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse, createBadRequestResponse } from '@/lib/api/handlers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    const result = await productRepository.search({
      page,
      limit,
      category: category || undefined,
      isActive: isActive !== null ? isActive === 'true' : undefined,
    });

    apiLogger.info({ page, limit, count: result.items.length }, 'Products retrieved via Repository');
    return NextResponse.json({
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to fetch products');
    return createApiErrorResponse(error, '조회 실패', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const { name, sku, description, price, stockQuantity, lowStockThreshold, category } = body as { name?: string; sku?: string; description?: string; price?: number; stockQuantity?: number | null; lowStockThreshold?: number; category?: string };

    if (!name || !sku || price === undefined) {
      return createBadRequestResponse('name, sku, price는 필수 항목입니다');
    }

    const product = await productRepository.create({
      storeId: String(body.storeId || 'default'),
      name: String(name),
      sku: String(sku),
      description: description ? String(description) : undefined,
      price: Number(price),
      stockQuantity: stockQuantity != null ? Number(stockQuantity) : null,
      lowStockThreshold: lowStockThreshold != null ? Number(lowStockThreshold) : 5,
      category: category ? String(category) : undefined,
    });

    apiLogger.info({ productId: product.id, sku }, 'Product created via Repository');
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to create product');
    return createApiErrorResponse(error, '생성 실패', 400);
  }
}
