import { dbLogger } from '@/lib/logger';
import type { CreateBusinessInput } from '@/lib/repositories/business.repository';
import type { DbClient } from './types';

interface MockBusinessRow extends CreateBusinessInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date | null;
}

interface MockSyncStateRow {
  id: string;
  dataSource: string;
  syncStatus: string;
  lastSyncedAt?: Date;
  errorMessage?: string | null;
  syncCount?: number;
  totalSynced?: number;
  newRecordsCount?: number;
  lastBusinessId?: string | null;
  updatedAt?: Date;
  createdAt?: Date;
}

interface MockCampaignRow {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}

interface MockCopyRow {
  id: string;
  [key: string]: unknown;
}

interface MockPermitRow {
  id: string;
  [key: string]: unknown;
}

interface MockNoteRow {
  id: string;
  businessId: string;
  content?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  [key: string]: unknown;
}

interface MockAuditLogRow {
  id: string;
  [key: string]: unknown;
}

interface MockSystemSettingRow {
  key: string;
  value: string;
  updatedAt: Date;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// In-memory mock data stores (테스트 간 격리를 위해 module-level 배열 사용)
// ---------------------------------------------------------------------------
const mockBusinessData: MockBusinessRow[] = [];
const mockAdCampaigns: MockCampaignRow[] = [];
const mockAdCopies: MockCopyRow[] = [];
const mockSeoulPermits: MockPermitRow[] = [];
const mockSyncStates: MockSyncStateRow[] = [];
const mockNoteData: MockNoteRow[] = [];
const mockSystemSettingData: MockSystemSettingRow[] = [];

// 주문-재고 mock 데이터
let mockProductIdCounter = 1;
const mockProductData: Array<Record<string, unknown>> = [];
const mockOrderData: Array<Record<string, unknown>> = [];
const mockOrderItemData: Array<Record<string, unknown>> = [];
const mockStockHistoryData: Array<Record<string, unknown>> = [];
const mockWebhookEndpointData: Array<Record<string, unknown>> = [];
const mockWebhookDeliveryLogData: Array<Record<string, unknown>> = [];

// ---------------------------------------------------------------------------
// Mock delegate implementations — Prisma model delegate의
// 사용되는 메서드만 구현하며, 나머지 메서드가 있는 Prisma 타입으로는
// as unknown as 단언이 필요함.
// ---------------------------------------------------------------------------

const mockBusiness = {
  createMany: async (args: { data: CreateBusinessInput[] }) => {
    dbLogger.info({ count: args.data.length }, 'Mock: 비즈니스 대량 생성');
    args.data.forEach((item) => mockBusinessData.push({ ...item, id: item.bizesId, createdAt: new Date(), updatedAt: new Date() }));
    return { count: args.data.length };
  },
  findMany: async (_args?: { where?: Record<string, unknown>; skip?: number; take?: number; orderBy?: Record<string, string> }) => mockBusinessData,
  findUnique: async (args: { where: { id?: string; bizesId?: string } }) => {
    if (args.where.id) return mockBusinessData.find((b) => b.id === args.where.id) || null;
    if (args.where.bizesId)
      return mockBusinessData.find((b) => b.bizesId === args.where.bizesId) || null;
    return null;
  },
  count: async (_args?: { where?: Record<string, unknown> }) => mockBusinessData.length,
  upsert: async (args: { where: { bizesId?: string }; create: CreateBusinessInput; update: Partial<CreateBusinessInput> }) => {
    mockBusinessData.push({ ...args.create, id: args.create.bizesId, createdAt: new Date(), updatedAt: new Date() });
    return mockBusinessData[mockBusinessData.length - 1];
  },
  update: async (args: { where: { id?: string }; data: Partial<CreateBusinessInput> }) => ({ id: args.where.id, ...args.data }),
  delete: async (args: { where: { id: string } }) => ({ id: args.where.id }),
};

const mockSyncState = {
  findUnique: async (args: { where: { dataSource?: string } }) => {
    const dataSource = args.where?.dataSource || 'public-data-portal';
    const state = mockSyncStates.find((s) => s.dataSource === dataSource);
    return state || { id: '1', dataSource, syncStatus: 'idle' };
  },
  update: async (args: { where: { dataSource?: string }; data: Record<string, unknown> }) => {
    const dataSource = args.where?.dataSource || 'public-data-portal';
    const index = mockSyncStates.findIndex((s) => s.dataSource === dataSource);
    const currentState: MockSyncStateRow =
      index !== -1 ? mockSyncStates[index] : { id: '1', dataSource, syncStatus: 'idle' };
    const state = { ...currentState, ...args.data };

    if (index !== -1) {
      mockSyncStates[index] = state;
    } else {
      mockSyncStates.push(state);
    }
    return state;
  },
};

const mockAuditLog = {
  create: async (args: { data: Record<string, unknown> }) => ({ id: 'mock-audit', ...args.data }),
  findMany: async (_args?: Record<string, unknown>) => [] as MockAuditLogRow[],
};

const mockAdmin = {
  findUnique: async (_args: { where: Record<string, unknown> }) => null,
};

const mockAdCampaign = {
  create: async (args: { data: Record<string, unknown> }) => {
    const campaign: MockCampaignRow = {
      id: `mock-campaign-${Date.now()}`,
      ...args.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockAdCampaigns.push(campaign);
    return campaign;
  },
  findUnique: async (args: { where: { id?: string } }) => {
    return mockAdCampaigns.find((c) => c.id === args.where.id) || null;
  },
  update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
    const campaign = mockAdCampaigns.find((c) => c.id === args.where.id);
    if (campaign) return { ...campaign, ...args.data };
    return null;
  },
  findMany: async (_args?: Record<string, unknown>) => mockAdCampaigns,
  count: async (_args?: Record<string, unknown>) => mockAdCampaigns.length,
};

const mockAdCopy = {
  createMany: async (args: { data: Record<string, unknown>[] }) => {
    args.data.forEach((copy, idx) => {
      mockAdCopies.push({ id: `mock-copy-${Date.now()}-${idx}`, ...copy });
    });
    return { count: args.data.length };
  },
  findMany: async (_args?: Record<string, unknown>) => mockAdCopies,
};

const mockSeoulPermit = {
  findUnique: async (args: { where: { id?: string } }) => {
    return mockSeoulPermits.find((p) => p.id === args.where.id) || null;
  },
  upsert: async (args: { where: Record<string, unknown>; create: Record<string, unknown> }) => ({ id: 'mock-permit', ...args.create }),
  findMany: async (_args?: Record<string, unknown>) => mockSeoulPermits,
  count: async (_args?: Record<string, unknown>) => mockSeoulPermits.length,
  groupBy: async (_args?: Record<string, unknown>) => [{ serviceCode: 'S001', _count: 10 }],
};

const mockNote = {
  create: async (args: { data: Record<string, unknown> }) => {
    const note: MockNoteRow = {
      id: `mock-note-${Date.now()}`,
      businessId: String(args.data.businessId || 'mock-biz'),
      ...args.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockNoteData.push(note);
    return note;
  },
  findMany: async (_args?: { where?: { deletedAt?: Record<string, unknown> | null }; skip?: number; take?: number }) => {
    return mockNoteData;
  },
  update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
    const note = mockNoteData.find((n) => n.id === args.where.id);
    if (note) return { ...note, ...args.data };
    return null;
  },
  delete: async (args: { where: { id: string } }) => {
    return { id: args.where.id };
  },
  count: async (_args?: { where?: { deletedAt?: Record<string, unknown> | null } }) => mockNoteData.length,
};

// 주문-재고 Mock delegates
const mockProduct = {
  create: async (args: { data: Record<string, unknown> }) => {
    const product = { id: `mock-product-${mockProductIdCounter++}`, ...args.data, createdAt: new Date(), updatedAt: new Date() };
    mockProductData.push(product);
    return product;
  },
  findUnique: async (args: { where: { id?: string; sku?: string } }) => {
    const key = args.where.id ? 'id' : 'sku';
    const value = args.where[key as keyof typeof args.where];
    return mockProductData.find((p) => p[key] === value) || null;
  },
  findMany: async (_args?: Record<string, unknown>) => mockProductData,
  update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
    const idx = mockProductData.findIndex((p) => p.id === args.where.id);
    if (idx !== -1) {
      mockProductData[idx] = { ...mockProductData[idx], ...args.data };
      return mockProductData[idx];
    }
    return null;
  },
  count: async (_args?: Record<string, unknown>) => mockProductData.length,
  delete: async (args: { where: { id: string } }) => {
    const idx = mockProductData.findIndex((p) => p.id === args.where.id);
    if (idx !== -1) return mockProductData.splice(idx, 1)[0];
    return null;
  },
};

let mockOrderIdCounter = 1;

const mockOrder = {
  create: async (args: { data: Record<string, unknown> }) => {
    const order = { id: `mock-order-${mockOrderIdCounter++}`, ...args.data, createdAt: new Date(), updatedAt: new Date() };
    mockOrderData.push(order);
    return order;
  },
  findUnique: async (args: { where: { id?: string; orderNumber?: string } }) => {
    const key = args.where.id ? 'id' : 'orderNumber';
    const value = args.where[key as keyof typeof args.where];
    return mockOrderData.find((o) => o[key] === value) || null;
  },
  findMany: async (_args?: Record<string, unknown>) => mockOrderData,
  update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
    const idx = mockOrderData.findIndex((o) => o.id === args.where.id);
    if (idx !== -1) {
      mockOrderData[idx] = { ...mockOrderData[idx], ...args.data };
      return mockOrderData[idx];
    }
    return null;
  },
  count: async (_args?: Record<string, unknown>) => mockOrderData.length,
};

const mockOrderItem = {
  create: async (args: { data: Record<string, unknown> }) => {
    const item = { id: `mock-oi-${Date.now()}`, ...args.data };
    mockOrderItemData.push(item);
    return item;
  },
  createMany: async (args: { data: Array<Record<string, unknown>> }) => {
    args.data.forEach((item) => {
      mockOrderItemData.push({ id: `mock-oi-${Date.now()}-${Math.random()}`, ...item });
    });
    return { count: args.data.length };
  },
  findMany: async (args?: { where?: { orderId?: string } }) => {
    const where = args?.where;
    if (where?.orderId) return mockOrderItemData.filter((i) => i.orderId === where.orderId);
    return mockOrderItemData;
  },
};

const mockStockHistory = {
  create: async (args: { data: Record<string, unknown> }) => {
    const entry = { id: `mock-sh-${Date.now()}`, ...args.data, createdAt: new Date() };
    mockStockHistoryData.push(entry);
    return entry;
  },
  findMany: async (args?: { where?: { productId?: string; orderId?: string } }) => {
    let result = [...mockStockHistoryData];
    const where = args?.where;
    if (where?.productId) result = result.filter((h) => h.productId === where.productId);
    if (where?.orderId) result = result.filter((h) => h.orderId === where.orderId);
    return result;
  },
};

let mockEndpointIdCounter = 1;

const mockWebhookEndpoint = {
  create: async (args: { data: Record<string, unknown> }) => {
    const endpoint = { id: `mock-endpoint-${mockEndpointIdCounter++}`, ...args.data, createdAt: new Date(), updatedAt: new Date() };
    mockWebhookEndpointData.push(endpoint);
    return endpoint;
  },
  findUnique: async (args: { where: { id?: string } }) => {
    return mockWebhookEndpointData.find((e) => e.id === args.where.id) || null;
  },
  findMany: async (_args?: { where?: { isActive?: boolean }; orderBy?: Record<string, string> }) => {
    let result = [...mockWebhookEndpointData];
    if (_args?.where?.isActive !== undefined) {
      result = result.filter((e) => e.isActive === _args.where!.isActive);
    }
    return result;
  },
  update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
    const idx = mockWebhookEndpointData.findIndex((e) => e.id === args.where.id);
    if (idx !== -1) {
      mockWebhookEndpointData[idx] = { ...mockWebhookEndpointData[idx], ...args.data, updatedAt: new Date() };
      return mockWebhookEndpointData[idx];
    }
    return null;
  },
  delete: async (args: { where: { id: string } }) => {
    const idx = mockWebhookEndpointData.findIndex((e) => e.id === args.where.id);
    if (idx !== -1) return mockWebhookEndpointData.splice(idx, 1)[0];
    return null;
  },
  count: async (_args?: Record<string, unknown>) => mockWebhookEndpointData.length,
};

const mockWebhookDeliveryLog = {
  create: async (args: { data: Record<string, unknown> }) => {
    const log = { id: `mock-dlog-${Date.now()}`, ...args.data, createdAt: new Date() };
    mockWebhookDeliveryLogData.push(log);
    return log;
  },
  findUnique: async (args: { where: { id?: string } }) => {
    return mockWebhookDeliveryLogData.find((l) => l.id === args.where.id) || null;
  },
  findMany: async (args?: { where?: Record<string, unknown>; orderBy?: Record<string, string>; take?: number; skip?: number }) => {
    let result = [...mockWebhookDeliveryLogData];
    if (args?.where) {
      for (const [key, value] of Object.entries(args.where)) {
        if (value !== undefined) result = result.filter((l) => l[key] === value);
      }
    }
    if (args?.orderBy) {
      const [field, dir] = Object.entries(args.orderBy)[0];
      result.sort((a, b) => {
        const av = a[field] as string | number | Date;
        const bv = b[field] as string | number | Date;
        return dir === 'desc' ? (av < bv ? 1 : -1) : av < bv ? -1 : 1;
      });
    }
    if (args?.skip) result = result.slice(args.skip);
    if (args?.take) result = result.slice(0, args.take);
    return result;
  },
  update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
    const idx = mockWebhookDeliveryLogData.findIndex((l) => l.id === args.where.id);
    if (idx !== -1) {
      mockWebhookDeliveryLogData[idx] = { ...mockWebhookDeliveryLogData[idx], ...args.data };
      return mockWebhookDeliveryLogData[idx];
    }
    return null;
  },
  count: async (args?: { where?: Record<string, unknown> }) => {
    let result = [...mockWebhookDeliveryLogData];
    if (args?.where) {
      for (const [key, value] of Object.entries(args.where)) {
        if (value !== undefined) result = result.filter((l) => l[key] === value);
      }
    }
    return result.length;
  },
};

// ---------------------------------------------------------------------------
// BusinessClaimRequest Mock
// ---------------------------------------------------------------------------
const mockClaimRequestData: Array<Record<string, unknown>> = [];

const mockBusinessClaimRequest = {
  create: async (args: { data: Record<string, unknown> }) => {
    const claim = { id: `mock-cr-${Date.now()}`, ...args.data, createdAt: new Date(), updatedAt: new Date() };
    mockClaimRequestData.push(claim);
    return claim;
  },
  findUnique: async (args: { where: { id?: string } }) => {
    return mockClaimRequestData.find((c) => c.id === args.where.id) || null;
  },
  findMany: async (args?: { where?: Record<string, unknown>; orderBy?: Record<string, string>; skip?: number; take?: number }) => {
    let result = [...mockClaimRequestData];
    if (args?.where) {
      for (const [key, value] of Object.entries(args.where)) {
        if (value !== undefined) result = result.filter((c) => c[key] === value);
      }
    }
    if (args?.orderBy) {
      const [field, dir] = Object.entries(args.orderBy)[0];
      result.sort((a, b) => {
        const av = a[field] as string | number | Date;
        const bv = b[field] as string | number | Date;
        return dir === 'desc' ? (av < bv ? 1 : -1) : av < bv ? -1 : 1;
      });
    }
    if (args?.skip) result = result.slice(args.skip);
    if (args?.take) result = result.slice(0, args.take);
    return result;
  },
  update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
    const idx = mockClaimRequestData.findIndex((c) => c.id === args.where.id);
    if (idx !== -1) {
      mockClaimRequestData[idx] = { ...mockClaimRequestData[idx], ...args.data, updatedAt: new Date() };
      return mockClaimRequestData[idx];
    }
    return null;
  },
  count: async (args?: { where?: Record<string, unknown> }) => {
    let result = [...mockClaimRequestData];
    if (args?.where) {
      for (const [key, value] of Object.entries(args.where)) {
        if (value !== undefined) result = result.filter((c) => c[key] === value);
      }
    }
    return result.length;
  },
};

const mockSystemSetting = {
  findUnique: async (args: { where: { key: string } }) => {
    return mockSystemSettingData.find((s) => s.key === args.where.key) || null;
  },
  findMany: async () => mockSystemSettingData,
  upsert: async (args: { where: { key: string }; create: { key: string; value: string }; update: { value: string } }) => {
    const idx = mockSystemSettingData.findIndex((s) => s.key === args.where.key);
    if (idx !== -1) {
      mockSystemSettingData[idx] = {
        ...mockSystemSettingData[idx],
        value: args.update.value,
        updatedAt: new Date()
      };
      return mockSystemSettingData[idx];
    } else {
      const row = {
        key: args.create.key,
        value: args.create.value,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockSystemSettingData.push(row);
      return row;
    }
  },
  delete: async (args: { where: { key: string } }) => {
    const idx = mockSystemSettingData.findIndex((s) => s.key === args.where.key);
    if (idx !== -1) {
      return mockSystemSettingData.splice(idx, 1)[0];
    }
    throw new Error('Record to delete does not exist.');
  }
};

// ---------------------------------------------------------------------------
// QR Code, Menu, Store mock delegates
// ---------------------------------------------------------------------------

const mockQrCodeData: Array<Record<string, unknown>> = [];

const mockQrCode = {
  create: async (args: { data: Record<string, unknown> }) => {
    const qr = { id: `mock-qr-${Date.now()}`, ...args.data, createdAt: new Date() };
    mockQrCodeData.push(qr);
    return qr;
  },
  findUnique: async (args: { where: { id?: string } }) => mockQrCodeData.find((q) => q.id === args.where.id) || null,
  findMany: async (_args?: Record<string, unknown>) => mockQrCodeData,
  update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
    const idx = mockQrCodeData.findIndex((q) => q.id === args.where.id);
    if (idx !== -1) {
      mockQrCodeData[idx] = { ...mockQrCodeData[idx], ...args.data };
      return mockQrCodeData[idx];
    }
    return null;
  },
  count: async (_args?: Record<string, unknown>) => mockQrCodeData.length,
  delete: async (args: { where: { id: string } }) => {
    const idx = mockQrCodeData.findIndex((q) => q.id === args.where.id);
    if (idx !== -1) return mockQrCodeData.splice(idx, 1)[0];
    return null;
  },
};

const mockMenuData: Array<Record<string, unknown>> = [];

const mockMenu = {
  create: async (args: { data: Record<string, unknown> }) => {
    const m = { id: `mock-menu-${Date.now()}`, ...args.data, createdAt: new Date(), updatedAt: new Date() };
    mockMenuData.push(m);
    return m;
  },
  findMany: async (_args?: Record<string, unknown>) => mockMenuData,
  findUnique: async (args: { where: { id?: string } }) => mockMenuData.find((m) => m.id === args.where.id) || null,
  update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
    const idx = mockMenuData.findIndex((m) => m.id === args.where.id);
    if (idx !== -1) {
      mockMenuData[idx] = { ...mockMenuData[idx], ...args.data };
      return mockMenuData[idx];
    }
    return null;
  },
  count: async (_args?: Record<string, unknown>) => mockMenuData.length,
};

const mockStoreData: Array<Record<string, unknown>> = [];

const mockStore = {
  create: async (args: { data: Record<string, unknown> }) => {
    const s = { id: `mock-store-${Date.now()}`, ...args.data, createdAt: new Date(), updatedAt: new Date() };
    mockStoreData.push(s);
    return s;
  },
  findMany: async (_args?: Record<string, unknown>) => mockStoreData,
  findUnique: async (args: { where: { id?: string; slug?: string } }) => {
    if (args.where.id) return mockStoreData.find((s) => s.id === args.where.id) || null;
    if (args.where.slug) return mockStoreData.find((s) => s.slug === args.where.slug) || null;
    return null;
  },
  update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
    const idx = mockStoreData.findIndex((s) => s.id === args.where.id);
    if (idx !== -1) {
      mockStoreData[idx] = { ...mockStoreData[idx], ...args.data };
      return mockStoreData[idx];
    }
    return null;
  },
  count: async (_args?: Record<string, unknown>) => mockStoreData.length,
};

// ---------------------------------------------------------------------------
// Mock DbClient 생성 / 리셋
// ---------------------------------------------------------------------------

let cachedMock: DbClient | null = null;

export function createMockDb(): DbClient {
  if (cachedMock) return cachedMock;

  const mock: DbClient = {
    business: mockBusiness as unknown as DbClient['business'],
    syncState: mockSyncState as unknown as DbClient['syncState'],
    auditLog: mockAuditLog as unknown as DbClient['auditLog'],
    admin: mockAdmin as unknown as DbClient['admin'],
    adCampaign: mockAdCampaign as unknown as DbClient['adCampaign'],
    adCopy: mockAdCopy as unknown as DbClient['adCopy'],
    seoulPermit: mockSeoulPermit as unknown as DbClient['seoulPermit'],
    note: mockNote as unknown as DbClient['note'],
    product: mockProduct as unknown as DbClient['product'],
    order: mockOrder as unknown as DbClient['order'],
    orderItem: mockOrderItem as unknown as DbClient['orderItem'],
    stockHistory: mockStockHistory as unknown as DbClient['stockHistory'],
    webhookEndpoint: mockWebhookEndpoint as unknown as DbClient['webhookEndpoint'],
    webhookDeliveryLog: mockWebhookDeliveryLog as unknown as DbClient['webhookDeliveryLog'],
    businessClaimRequest: mockBusinessClaimRequest as unknown as DbClient['businessClaimRequest'],
    systemSetting: mockSystemSetting as unknown as DbClient['systemSetting'],
    qrCode: mockQrCode as unknown as DbClient['qrCode'],
    menu: mockMenu as unknown as DbClient['menu'],
    store: mockStore as unknown as DbClient['store'],
    $connect: async () => {
      dbLogger.info('Mock 데이터베이스 모드 사용 중');
    },
    $disconnect: async () => {},
    $transaction: async <T>(fn: (tx: any) => Promise<T>, _options?: { timeout?: number }) => {
      return fn(mock);
    },
  };

  cachedMock = mock;
  return mock;
}

/**
 * 모든 mock 데이터를 초기화. 각 테스트 beforeEach 등에서 호출.
 */
export function resetMockData(): void {
  mockBusinessData.length = 0;
  mockAdCampaigns.length = 0;
  mockAdCopies.length = 0;
  mockSeoulPermits.length = 0;
  mockSyncStates.length = 0;
  mockNoteData.length = 0;
  mockProductData.length = 0;
  mockOrderData.length = 0;
  mockOrderItemData.length = 0;
  mockStockHistoryData.length = 0;
  mockWebhookEndpointData.length = 0;
  mockWebhookDeliveryLogData.length = 0;
  mockClaimRequestData.length = 0;
  mockSystemSettingData.length = 0;
  mockQrCodeData.length = 0;
  mockMenuData.length = 0;
  mockStoreData.length = 0;
  mockProductIdCounter = 1;
  mockOrderIdCounter = 1;
  mockEndpointIdCounter = 1;
}
