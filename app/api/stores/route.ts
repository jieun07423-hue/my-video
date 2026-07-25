import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, ownerId, businessType, phoneNumber, address } = body;

    if (!name || !slug || !ownerId) {
      return NextResponse.json(
        { error: '스토어 이름, 슬러그, 소유자 ID는 필수 항목입니다.' },
        { status: 400 }
      );
    }

    const existing = await db.store.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: '이미 사용 중인 슬러그입니다.' },
        { status: 409 }
      );
    }

    const store = await db.store.create({
      data: {
        name,
        slug,
        ownerId,
        businessType: businessType || null,
        phoneNumber: phoneNumber || null,
        address: address || null,
      },
    });

    apiLogger.info({ storeId: store.id, slug }, '스토어 생성 완료');
    return NextResponse.json({ success: true, data: store }, { status: 201 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '스토어 생성 실패');
    return NextResponse.json({ error: '스토어 생성에 실패했습니다.' }, { status: 500 });
  }
}
