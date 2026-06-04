import { describe, it, expect, beforeEach } from '@jest/globals';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

describe('/api/data-quality/governance', () => {
  it('returns policies list for GET', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/governance' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('policies');
    expect(data).toHaveProperty('count');
    expect(Array.isArray(data.policies)).toBe(true);
  });

  it('returns governance report when action=report', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/governance?action=report' } as NextRequest;
    const response = await GET(request);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/plain');
    expect(text).toContain('데이터 품질 거버넌스 리포트');
  });

  it('returns policies when action=policies', async () => {
    const request = { url: 'http://localhost:3000/api/data-quality/governance?action=policies' } as NextRequest;
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('policies');
    expect(data).toHaveProperty('count');
  });

  it('handles POST init action', async () => {
    const request = new Request('http://localhost:3000/api/data-quality/governance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'init' }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('policies');
    expect(data).toHaveProperty('count');
    expect(data.policies.length).toBeGreaterThan(0);
  });

  it('handles POST create action', async () => {
    const request = new Request('http://localhost:3000/api/data-quality/governance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        name: '테스트 정책',
        description: '테스트용',
        rules: [
          { name: '규칙', field: 'name', condition: 'required', parameters: {}, message: '필수', severity: 'high' },
        ],
      }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('rules');
    expect(data.name).toBe('테스트 정책');
  });

  it('returns error for create without required fields', async () => {
    const request = new Request('http://localhost:3000/api/data-quality/governance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create' }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });

  it('handles POST compliance action', async () => {
    const request = new Request('http://localhost:3000/api/data-quality/governance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'compliance',
        business: { name: '테스트 사업자' },
        policyId: 'non-existent',
      }),
    });

    const response = await POST(request as NextRequest);
    expect(response.status).toBe(500);
  });

  it('returns error for invalid POST action', async () => {
    const request = new Request('http://localhost:3000/api/data-quality/governance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'invalid' }),
    });

    const response = await POST(request as NextRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error');
  });
});
