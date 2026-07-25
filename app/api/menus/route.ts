import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const category = searchParams.get('category');

    if (!storeId) {
      return NextResponse.json({ error: '스토어 ID가 필요합니다.' }, { status: 400 });
    }

    const where: Record<string, unknown> = { storeId };
    if (category) where.category = category;

    const menus = await db.menu.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ success: true, data: menus });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to fetch menus');
    return NextResponse.json({ error: '메뉴 목록 조회에 실패했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, name, description, price, category, imageUrl, isAvailable, sortOrder } = body;

    if (!storeId || !name || price === undefined) {
      return NextResponse.json({ error: '스토어 ID, 메뉴명, 가격은 필수입니다.' }, { status: 400 });
    }

    const menu = await db.menu.create({
      data: {
        storeId,
        name,
        description: description || null,
        price,
        category: category || null,
        imageUrl: imageUrl || null,
        isAvailable: isAvailable ?? true,
        sortOrder: sortOrder ?? 0,
      },
    });

    apiLogger.info({ menuId: menu.id, name }, 'Menu created');
    return NextResponse.json({ success: true, data: menu }, { status: 201 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to create menu');
    return NextResponse.json({ error: '메뉴 생성에 실패했습니다.' }, { status: 500 });
  }
}