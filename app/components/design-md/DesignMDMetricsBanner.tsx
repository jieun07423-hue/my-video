'use client';

import React from 'react';
import { Database, Zap, Shield, Users } from 'lucide-react';

interface DashboardMetrics {
  syncSuccessRate: number;
  avgResponseTime: number;
  dataQualityScore: number;
  activeUsers: number;
}

interface DesignMDMetricsBannerProps {
  metrics: DashboardMetrics;
  className?: string;
}

/**
 * DESIGN.md 스타일 메트릭스 배너
 * - 100% monospaced typography (font-mono, Geist Mono substitute per DESIGN.md)
 * - Warm cream #fdfcfc 캔버스 (--canvas), nearly-black #201d1d 인크 (--ink)
 * - 드롭 섀도우·그라데이션 절대 금지
 * - ASCII bracket 마커 [+]로 포인트 시각화
 * - section 리듬 96px ({spacing.section})
 * - interactive element는 rounded-sm (4px), 컨테이너는 rounded-none (0px)
 * - semantic accent ramp는 TUI 전용; 마케팅 chroma는 단색 유지
 */
export function DesignMDMetricsBanner({ metrics, className }: DesignMDMetricsBannerProps) {
  const renderIcon = (name: keyof typeof icons) => icons[name];

  const icons = {
    sync: Database,
    response: Zap,
    quality: Shield,
    users: Users,
  };

  const renderMetric = (
    title: string,
    value: string | number,
    label: 'sync' | 'response' | 'quality' | 'users',
  ) => {
    const valueStr =
      typeof value === 'number'
        ? `${value}${label === 'sync' ? '%' : label === 'response' ? 'ms' : label === 'quality' ? '/100' : ''}`
        : String(value);

    const IconComponent = renderIcon(label);

    return (
      <div key={title} className="mb-12 border-t bg-[var(--canvas)] max-w-2xl">
        <div className="py-24 bg-[var(--canvas)]">
          <h2 className="text-3xl font-extrabold leading-none mb-6 tracking-widest">
            {title}
          </h2>

          <p className="text-sm font-medium leading-relaxed">
            {valueStr}
          </p>

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-[var(--mute)] capitalize">{title}</span>
            <IconComponent className="text-[var(--ink)]" />
          </div>
        </div>

        <hr className="border-t border-hairline-strong my-8" />

        <div className="flex items-baseline gap-4">
          <div className="text-[var(--mute)] text-xs capitalize">
            [+] {title}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      className="max-w-3xl mx-auto {className} py-24"
      aria-label="대시보드 메트릭스"
    >
      <h2 className="text-3xl font-extrabold leading-none mb-12 tracking-widest">
        대시보드
      </h2>

      <div className="space-y-12">
        {renderMetric('동기화 성공률', metrics.syncSuccessRate, 'sync')}

        {renderMetric('평균 응답 시간', metrics.avgResponseTime, 'response')}

        {renderMetric('데이터 품질 점수', metrics.dataQualityScore, 'quality')}

        {renderMetric('활성 사용자', metrics.activeUsers, 'users')}
      </div>
    </section>
  );
}