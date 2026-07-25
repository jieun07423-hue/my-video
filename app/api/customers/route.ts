import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';

interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  storeId: string;
  visitCount: number;
  totalSpent: number;
  lastVisit: string;
  notes: string;
  birthday: string | null;
  createdAt: string;
}

const customers = new Map<string, CustomerRecord>();

function generateId(): string {
  return `cust_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const phone = searchParams.get('phone');

    if (phone && storeId) {
      const found = Array.from(customers.values()).find(
        c => c.phone === phone && c.storeId === storeId
      );
      return NextResponse.json({ success: true, data: found || null });
    }

    const result = Array.from(customers.values())
      .filter(c => !storeId || c.storeId === storeId)
      .sort((a, b) => b.visitCount - a.visitCount);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to list customers');
    return NextResponse.json({ error: '고객 조회에 실패했습니다.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, name, phone, notes, birthday } = body;

    if (!storeId || !name || !phone) {
      return NextResponse.json({ error: '스토어 ID, 이름, 연락처는 필수입니다.' }, { status: 400 });
    }

    const existing = Array.from(customers.values()).find(
      c => c.phone === phone && c.storeId === storeId
    );

    if (existing) {
      existing.visitCount += 1;
      existing.lastVisit = new Date().toISOString();
      if (notes) existing.notes = notes;
      return NextResponse.json({ success: true, data: existing });
    }

    const record: CustomerRecord = {
      id: generateId(),
      storeId,
      name,
      phone,
      visitCount: 1,
      totalSpent: 0,
      lastVisit: new Date().toISOString(),
      notes: notes || '',
      birthday: birthday || null,
      createdAt: new Date().toISOString(),
    };

    customers.set(record.id, record);
    apiLogger.info({ customerId: record.id, name }, 'Customer created');

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to create customer');
    return NextResponse.json({ error: '고객 등록에 실패했습니다.' }, { status: 500 });
  }
}