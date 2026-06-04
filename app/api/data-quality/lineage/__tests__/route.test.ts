import { describe, it, expect, beforeEach } from '@jest/globals';
import { GET } from '../route';
import { NextRequest } from 'next/server';

describe('/api/data-quality/lineage', () => {
  it('returns lineage query results', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/lineage' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('lineage');
    expect(data).toHaveProperty('count');
    expect(Array.isArray(data.lineage)).toBe(true);
  });

  it('returns lineage with businessId filter', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/lineage?businessId=1234567890' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('lineage');
    expect(data).toHaveProperty('count');
    expect(Array.isArray(data.lineage)).toBe(true);
  });

  it('returns lineage with field filter', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/lineage?field=phone' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('lineage');
    expect(data).toHaveProperty('count');
    expect(Array.isArray(data.lineage)).toBe(true);
  });

  it('returns lineage with changeType filter', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/lineage?changeType=correction' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('lineage');
    expect(data).toHaveProperty('count');
    expect(Array.isArray(data.lineage)).toBe(true);
  });

  it('returns lineage summary when action=summary', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/lineage?action=summary&businessId=1234567890' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('businessId');
    expect(data).toHaveProperty('totalChanges');
    expect(data).toHaveProperty('fieldChanges');
    expect(data).toHaveProperty('recentChanges');
    expect(data).toHaveProperty('lastModified');
    expect(data).toHaveProperty('changeFrequency');
  });

  it('returns error when action=summary without businessId', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/lineage?action=summary' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('returns lineage stats when action=stats', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/lineage?action=stats' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('totalRecords');
    expect(data).toHaveProperty('totalChanges');
    expect(data).toHaveProperty('changesByType');
    expect(data).toHaveProperty('changesByField');
    expect(data).toHaveProperty('changesBySource');
    expect(data).toHaveProperty('averageChangesPerBusiness');
    expect(data).toHaveProperty('mostActiveBusinesses');
  });

  it('returns lineage stats with date filter', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/lineage?action=stats&startDate=2024-01-01&endDate=2024-12-31' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('totalRecords');
    expect(data).toHaveProperty('totalChanges');
    expect(data).toHaveProperty('changesByType');
    expect(data).toHaveProperty('changesByField');
    expect(data).toHaveProperty('changesBySource');
    expect(data).toHaveProperty('averageChangesPerBusiness');
    expect(data).toHaveProperty('mostActiveBusinesses');
  });

  it('returns field lineage when action=field', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/lineage?action=field&businessId=1234567890&field=phone' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('lineage');
    expect(data).toHaveProperty('count');
    expect(Array.isArray(data.lineage)).toBe(true);
  });

  it('returns error when action=field without required params', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/lineage?action=field' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('returns lineage report when action=report', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/lineage?action=report&businessId=1234567890' } as NextRequest;
    const response = await GET(request);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/plain');
    expect(text).toContain('데이터 리니지 리포트');
    expect(text).toContain('1234567890');
  });

  it('exports lineage as JSON', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/lineage?action=export&format=json' } as NextRequest;
    const response = await GET(request);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(response.headers.get('Content-Disposition')).toContain('lineage.json');
    const data = JSON.parse(text);
    expect(Array.isArray(data)).toBe(true);
  });

  it('exports lineage as CSV', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/lineage?action=export&format=csv' } as NextRequest;
    const response = await GET(request);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/csv');
    expect(response.headers.get('Content-Disposition')).toContain('lineage.csv');
    expect(text).toContain('businessId');
  });

  it('handles errors gracefully', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/lineage?invalid=true' } as NextRequest;
    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});
