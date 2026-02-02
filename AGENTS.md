# AGENTS.md - Small Business Tracker Project Guide

## Project Overview

**Small Business Tracker** (소상공인 정보 트래커) - Next.js 14 App Router app that collects/manages small business data from public portals using PostgreSQL, Prisma ORM, TanStack Query, Pino logging, and Slack notifications.

## Essential Commands

```bash
# Development
npm run dev                    # Start dev server (localhost:3000)
npm run build                  # Production build with type checking
npm start                      # Production server
npm run lint                   # ESLint check

# Database
npx prisma generate            # Generate Prisma client (outputs to app/generated/prisma)
npx prisma migrate dev         # Run migrations
npx prisma studio              # Database viewer
npm run prisma:seed           # Seed database (tsx prisma/seed.ts)

# Testing
# Status: No test framework configured (Playwright installed but not configured)
```

## Code Style Guidelines

### Import Organization
```typescript
// 1. React/Next.js imports
import { ReactNode } from 'react';
import type { Metadata, NextRequest } from 'next';

// 2. External libraries
import { useQuery } from '@tanstack/react-query';
import pino from 'pino';

// 3. Internal imports (use @/* path alias)
import { db } from '@/app/lib/db';
import { BusinessRepository } from '@/app/lib/repositories/business.repository';
```

### Naming Conventions
- **Components**: PascalCase (`BusinessCard`, `StatsGrid`)
- **Files**: kebab-case for components, camelCase for utilities
- **Functions/Variables**: camelCase (`getBusinessData`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Database**: English field names with Korean comments

### TypeScript Standards
- **Strict mode enabled**: `"strict": true` in tsconfig.json
- Use `interface` for object shapes, `type` for unions/primitives
- **Explicit return types** for public functions and API routes
- **No `any` types** - use proper typing
- **Path alias**: `@/*` points to project root
- **ESLint Rules**: `@typescript-eslint/no-explicit-any` and `no-unused-vars` are **OFF**

### Error Handling
- Always use try-catch in API routes
- Return structured error responses with proper HTTP status codes
- User-facing messages in **Korean**, internal logging in **English**
- Use structured logging for debugging

## Repository Pattern (MANDATORY)

All database operations MUST use repository classes - **NO DIRECT DATABASE ACCESS**:

```typescript
export class BusinessRepository {
  async createMany(data: CreateBusinessInput[]) { }
  async search(options: SearchOptions) { }
  async findByBizesId(bizesId: string) { }
  async upsertMany(data: CreateBusinessInput[]) { }
}

export const businessRepository = new BusinessRepository();
```

**Rules:**
- Always use global `db` from `@/app/lib/db`
- Use `skipDuplicates: true` for bulk operations
- Include proper logging with `dbLogger`

## Logging Standards

Use structured logging with Pino:

```typescript
import { apiLogger, dbLogger, syncLogger } from '@/app/lib/logger';

apiLogger.info({ count: data.length }, 'Processing business data');
dbLogger.error({ error: error.message }, 'Database operation failed');
```

**Logger Types:** `logger` (base), `apiLogger` (API), `dbLogger` (DB), `syncLogger` (sync), `webLogger` (web), `authLogger` (auth), `notificationLogger` (notifications).

## API Route Patterns

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { businessRepository } from '@/app/lib/repositories/business.repository';
import { apiLogger } from '@/app/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await businessRepository.search({ page, limit });
    apiLogger.info({ count: result.items.length }, 'Businesses retrieved');
    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({ error: error.message }, 'Failed to fetch businesses');
    return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  }
}
```

## React Query Pattern

```typescript
export function useBusinesses(options: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['businesses', options],
    queryFn: () => businessRepository.search(options),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

## Environment Variables

**Required:** `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `DATA_GO_KR_SERVICE_KEY`, `SLACK_WEBHOOK_URL`, `LOG_LEVEL` (default: 'info')

## Key Database Models

- **Business**: `bizesId` (unique), `name`, addresses, 3-tier industry codes (대/중/소분류), `BusinessStatus` enum, `RecordStatus` enum
- **SyncState**: Track last sync time, status, error messages, counts
- **AuditLog**: Full audit trail

**Enums:**
```typescript
enum BusinessStatus { pending, active, inactive, dissolved, pending_renewal }
enum RecordStatus { new, synced, verified }
```

## Development Workflow

1. `npm install` - Install dependencies
2. Copy `.env.example` to `.env` and set variables
3. `npx prisma migrate dev` - Run migrations
4. `npx prisma generate` - Generate client
5. `npm run dev` - Start development

## Localization

- UI text: **Korean**
- Code comments: Korean for business logic, English for technical details
- Error messages: Korean (user-facing)
- Variable/function names: **English**
- Database field names: **English** with Korean comments

## Prisma Config

```typescript
generator client {
  provider = "prisma-client"
  output   = "app/generated/prisma"  // Custom location
}
```

## Deployment

- **Platform**: Vercel
- **Build**: `npm run build`
- **Node**: 18.x+
- **Environment variables**: Configure in Vercel dashboard
