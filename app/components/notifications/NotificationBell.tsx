'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell, BellRing, CheckCircle, RefreshCw, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface NotificationEvent {
  type: 'sync_update' | 'new_businesses' | 'ad_completed' | 'system';
  title: string;
  message: string;
  timestamp: string;
  link?: string;
}

const TYPE_STYLES: Record<string, { icon: React.ReactNode; color: string }> = {
  sync_update: { icon: <RefreshCw size={14} />, color: 'border-blue-500 bg-blue-500/10' },
  new_businesses: { icon: <CheckCircle size={14} />, color: 'border-green-500 bg-green-500/10' },
  ad_completed: { icon: <BellRing size={14} />, color: 'border-amber-500 bg-amber-500/10' },
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource('/api/notifications/subscribe');
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: NotificationEvent = JSON.parse(event.data);
        if (data.type === 'system') return;

        setNotifications(prev => {
          const next = [data, ...prev].slice(0, 20);
          return next;
        });
        setUnreadCount(prev => prev + 1);
      } catch {
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = () => setUnreadCount(0);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => { setIsOpen(!isOpen); markAllRead(); }}
        className="relative rounded-lg p-2 transition-all duration-200 hover:bg-white/10"
        aria-label="알림"
      >
        {unreadCount > 0 ? (
          <>
            <BellRing size={18} className="text-amber-500" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </>
        ) : (
          <Bell size={18} style={{ color: '#a0a0b0' }} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border bg-[#1a1a2e] shadow-xl backdrop-blur-md" style={{ borderColor: '#2d2d4a' }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: '#2d2d4a' }}>
            <h3 className="text-sm font-semibold text-white">알림</h3>
            {notifications.length > 0 && (
              <button onClick={() => setNotifications([])} className="text-xs text-gray-400 hover:text-white transition-colors">
                모두 지우기
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">알림이 없습니다.</p>
            ) : (
              notifications.map((n, i) => {
                const style = TYPE_STYLES[n.type] || { icon: null, color: 'border-gray-700 bg-white/5' };
                return (
                  <div
                    key={`${n.timestamp}-${i}`}
                    className={`mx-2 my-1 rounded-xl border p-3 ${style.color}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0">{style.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{n.title}</p>
                        <p className="mt-0.5 text-xs text-gray-400">{n.message}</p>
                        <p className="mt-1 text-[10px] text-gray-500">
                          {new Date(n.timestamp).toLocaleString('ko-KR')}
                        </p>
                      </div>
                    </div>
                    {n.link && (
                      <Link
                        href={n.link}
                        onClick={() => setIsOpen(false)}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                      >
                        바로가기 <ExternalLink size={10} />
                      </Link>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}