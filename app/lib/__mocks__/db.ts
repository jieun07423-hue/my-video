import { jest } from '@jest/globals';

const db = {
  business: {
    createMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  syncState: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  admin: {
    findUnique: jest.fn(),
  },
  adCampaign: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  adCopy: {
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  seoulPermit: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  note: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

export default db;
