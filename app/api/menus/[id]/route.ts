import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { apiLogger } from '@/lib/logger';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const existing = await db.menu.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: '메뉴를 찾을 수 없습니다.' }, { status: 404 });
    }

    const menu = await db.menu.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.price !== undefined && { price: body.price }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.isAvailable !== undefined && { isAvailable: body.isAvailable }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });

    apiLogger.info({ menuId: params.id }, 'Menu updated');
    return NextResponse.json({ success: true, data: menu });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to update menu');
    return NextResponse.json({ error: '메뉴 수정에 실패했습니다.' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.menu.delete({ where: { id: params.id } });
    apiLogger.info({ menuId: params.id }, 'Menu deleted');
    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to delete menu');
    return NextResponse.json({ error: '메뉴 삭제에 실패했습니다.' }, { status: 500 });
  }
}