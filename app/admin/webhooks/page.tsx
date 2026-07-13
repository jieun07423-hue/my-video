'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  isActive: boolean;
  maxRetries: number;
  timeoutMs: number;
  createdAt: string;
  updatedAt: string;
}

interface DeliveryLog {
  id: string;
  endpointId: string;
  eventType: string;
  status: 'pending' | 'success' | 'failed';
  responseCode?: number;
  errorMessage?: string;
  attempt: number;
  maxRetries: number;
  nextRetryAt?: string;
  createdAt: string;
}

interface EventCatalogEntry {
  event: string;
  category: string;
  description: string;
  payloadFields: Array<{ name: string; type: string; description: string }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TABS = ['엔드포인트', '전송 로그', '이벤트 카탈로그'] as const;
type Tab = (typeof TABS)[number];

const EVENTS = [
  { value: 'order.created', label: '주문 생성' },
  { value: 'order.cancelled', label: '주문 취소' },
  { value: 'order.status_changed', label: '주문 상태 변경' },
  { value: 'stock.shortage', label: '재고 부족' },
  { value: 'stock.restored', label: '재고 복구' },
  { value: 'stock.adjusted', label: '재고 조정' },
  { value: 'product.sold_out', label: '품절' },
  { value: 'payment.completed', label: '결제 완료' },
  { value: 'payment.failed', label: '결제 실패' },
  { value: 'settlement.completed', label: '정산 완료' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'success': return 'bg-green-100 text-green-800';
    case 'failed': return 'bg-red-100 text-red-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'success': return '성공';
    case 'failed': return '실패';
    case 'pending': return '대기';
    default: return status;
  }
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function WebhooksAdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('엔드포인트');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-700">웹훅 시스템 관리</span>
        </div>
      </Navbar>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">웹훅 관리</h1>
          <p className="text-gray-600">
            외부 시스템 연동 웹훅 엔드포인트를 관리하고 전송 상태를 모니터링합니다.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === '엔드포인트' && <EndpointManagement />}
        {activeTab === '전송 로그' && <DeliveryLogViewer />}
        {activeTab === '이벤트 카탈로그' && <EventCatalogViewer />}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Endpoint Management
// ---------------------------------------------------------------------------
function EndpointManagement() {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchEndpoints = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/webhooks/endpoints');
      const json = await res.json();
      if (json.success) {
        setEndpoints(json.data);
      } else {
        setError(json.error);
      }
    } catch {
      setError('엔드포인트 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEndpoints();
  }, [fetchEndpoints]);

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까? 연결된 웹훅 전송 로그도 함께 삭제됩니다.')) return;
    try {
      const res = await fetch(`/api/webhooks/endpoints/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchEndpoints();
      } else {
        alert(json.error);
      }
    } catch {
      alert('삭제 중 오류가 발생했습니다');
    }
  };

  if (loading && endpoints.length === 0) {
    return <div className="text-gray-500 mt-4">데이터 로딩 중...</div>;
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">총 {endpoints.length}개 엔드포인트</span>
        <button
          onClick={() => {
            setEditingId(null);
            setShowForm(true);
          }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          새 엔드포인트
        </button>
      </div>

      {/* Endpoint Form Modal */}
      {showForm && (
        <EndpointFormModal
          endpointId={editingId}
          onClose={() => { setShowForm(false); setEditingId(null); }}
          onSaved={() => { setShowForm(false); setEditingId(null); fetchEndpoints(); }}
        />
      )}

      {/* Endpoint List */}
      <div className="space-y-3">
        {endpoints.map((ep) => (
          <div
            key={ep.id}
            className={`rounded-lg border p-4 ${
              ep.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{ep.name}</h3>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      ep.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {ep.isActive ? '활성' : '비활성'}
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm text-gray-500">{ep.url}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {ep.events.map((evt) => {
                    const evtLabel = EVENTS.find((e) => e.value === evt)?.label || evt;
                    return (
                      <span
                        key={evt}
                        className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700"
                      >
                        {evtLabel}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-1 flex gap-4 text-xs text-gray-400">
                  <span>재시도: {ep.maxRetries}회</span>
                  <span>타임아웃: {ep.timeoutMs}ms</span>
                </div>
              </div>
              <div className="ml-4 flex gap-2">
                <button
                  onClick={() => {
                    setEditingId(ep.id);
                    setShowForm(true);
                  }}
                  className="rounded px-2 py-1 text-sm text-blue-600 hover:bg-blue-50"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(ep.id)}
                  className="rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        ))}

        {endpoints.length === 0 && !loading && (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
            등록된 웹훅 엔드포인트가 없습니다. 새 엔드포인트를 추가해주세요.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Endpoint Form Modal
// ---------------------------------------------------------------------------
function EndpointFormModal({
  endpointId,
  onClose,
  onSaved,
}: {
  endpointId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [maxRetries, setMaxRetries] = useState(3);
  const [timeoutMs, setTimeoutMs] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (endpointId) {
      fetch(`/api/webhooks/endpoints/${endpointId}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            const ep = json.data;
            setName(ep.name);
            setUrl(ep.url);
            setSecret(ep.secret || '');
            setSelectedEvents(ep.events);
            setMaxRetries(ep.maxRetries);
            setTimeoutMs(ep.timeoutMs);
          }
        })
        .catch(() => setError('데이터 로딩 실패'));
    }
  }, [endpointId]);

  const toggleEvent = (evt: string) => {
    setSelectedEvents((prev) =>
      prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('이름을 입력해주세요'); return; }
    if (!url.trim()) { setError('URL을 입력해주세요'); return; }
    if (selectedEvents.length === 0) { setError('최소 하나의 이벤트를 선택해주세요'); return; }

    setLoading(true);
    try {
      const method = endpointId ? 'PUT' : 'POST';
      const path = endpointId
        ? `/api/webhooks/endpoints/${endpointId}`
        : '/api/webhooks/endpoints';

      const res = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          url,
          ...(secret ? { secret } : {}),
          events: selectedEvents,
          maxRetries,
          timeoutMs,
        }),
      });

      const json = await res.json();
      if (json.success) {
        onSaved();
      } else {
        setError(json.error);
      }
    } catch {
      setError('저장 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          {endpointId ? '엔드포인트 수정' : '새 엔드포인트'}
        </h2>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="ERP 연동, 알림톡 등"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Callback URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="https://hooks.example.com/webhook"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              시크릿 키 <span className="text-gray-400">(선택, 서명 검증용)</span>
            </label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">구독 이벤트</label>
            <div className="grid grid-cols-2 gap-2">
              {EVENTS.map((evt) => (
                <label
                  key={evt.value}
                  className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(evt.value)}
                    onChange={() => toggleEvent(evt.value)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {evt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">최대 재시도</label>
              <input
                type="number"
                min={0}
                max={10}
                value={maxRetries}
                onChange={(e) => setMaxRetries(parseInt(e.target.value, 10))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">타임아웃 (ms)</label>
              <input
                type="number"
                min={1000}
                max={30000}
                step={1000}
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(parseInt(e.target.value, 10))}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delivery Log Viewer
// ---------------------------------------------------------------------------
function DeliveryLogViewer() {
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed' | 'pending'>('all');
  const [filterEvent, setFilterEvent] = useState('all');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterEvent !== 'all') params.set('eventType', filterEvent);

      const res = await fetch(`/api/webhooks/logs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.items);
        setTotal(json.data.total);
      } else {
        setError(json.error);
      }
    } catch {
      setError('전송 로그를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterEvent]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRetry = async (logId: string) => {
    try {
      const res = await fetch(`/api/webhooks/logs/${logId}/retry`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        alert(json.data.delivered ? '재전송 성공!' : '재전송 실패');
        fetchLogs();
      } else {
        alert(json.error);
      }
    } catch {
      alert('재시도 중 오류가 발생했습니다');
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">모든 상태</option>
          <option value="success">성공</option>
          <option value="failed">실패</option>
          <option value="pending">대기</option>
        </select>

        <select
          value={filterEvent}
          onChange={(e) => setFilterEvent(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="all">모든 이벤트</option>
          {EVENTS.map((evt) => (
            <option key={evt.value} value={evt.value}>{evt.label}</option>
          ))}
        </select>

        <span className="self-center text-sm text-gray-500">
          총 {total}건
        </span>
      </div>

      {/* Log Table */}
      {loading ? (
        <div className="text-gray-500 mt-4">데이터 로딩 중...</div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
          전송 로그가 없습니다.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">이벤트</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">상태</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">시도</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">응답</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">시간</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {logs.map((log) => {
                const evtLabel = EVENTS.find((e) => e.value === log.eventType)?.label || log.eventType;
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">{evtLabel}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(log.status)}`}
                      >
                        {getStatusLabel(log.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {log.attempt}/{log.maxRetries}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-gray-500">
                      {log.responseCode ?? '-'}
                      {log.errorMessage && (
                        <span className="ml-1 text-xs text-red-500" title={log.errorMessage}>
                          !!
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {new Date(log.createdAt).toLocaleString('ko-KR')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {log.status === 'failed' && (
                        <button
                          onClick={() => handleRetry(log.id)}
                          className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                        >
                          재시도
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event Catalog Viewer
// ---------------------------------------------------------------------------
function EventCatalogViewer() {
  const [catalog, setCatalog] = useState<EventCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/webhooks/events')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCatalog(json.data.events);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'order': return '주문';
      case 'stock': return '재고';
      case 'payment': return '결제';
      case 'settlement': return '정산';
      default: return cat;
    }
  };

  if (loading) return <div className="text-gray-500 mt-4">데이터 로딩 중...</div>;

  const grouped = catalog.reduce<Record<string, EventCatalogEntry[]>>((acc, entry) => {
    if (!acc[entry.category]) acc[entry.category] = [];
    acc[entry.category].push(entry);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-gray-500">
          현재 시스템에서 발행 가능한 모든 웹훅 이벤트 목록입니다.
          총 {catalog.length}개 이벤트
        </p>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([category, events]) => (
          <div key={category}>
            <h3 className="mb-3 text-lg font-semibold text-gray-900">
              {getCategoryLabel(category)}
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({events.length}개 이벤트)
              </span>
            </h3>
            <div className="space-y-3">
              {events.map((evt) => (
                <div key={evt.event} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <code className="rounded bg-gray-100 px-2 py-0.5 text-sm font-mono text-blue-700">
                      {evt.event}
                    </code>
                  </div>
                  <p className="mb-2 text-sm text-gray-600">{evt.description}</p>
                  <details className="text-xs text-gray-500">
                    <summary className="cursor-pointer hover:text-gray-700">
                      Payload 필드 ({evt.payloadFields.length}개)
                    </summary>
                    <div className="mt-2">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-2 py-1 text-left font-medium text-gray-500">필드</th>
                            <th className="px-2 py-1 text-left font-medium text-gray-500">타입</th>
                            <th className="px-2 py-1 text-left font-medium text-gray-500">설명</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {evt.payloadFields.map((field) => (
                            <tr key={field.name}>
                              <td className="px-2 py-1 font-mono text-gray-700">{field.name}</td>
                              <td className="px-2 py-1 text-gray-500">{field.type}</td>
                              <td className="px-2 py-1 text-gray-500">{field.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
