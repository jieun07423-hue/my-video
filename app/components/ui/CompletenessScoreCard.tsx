'use client';

import React from 'react';
import { clsx } from 'clsx';

interface FieldScore {
  field: string;
  label: string;
  weight: number;
  isPresent: boolean;
  score: number;
}

interface CompletenessScoreProps {
  bizesId: string;
  totalScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  fieldScores: FieldScore[];
  missingFields: string[];
  delay?: number;
}

const gradeConfig = {
  A: { color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-300', label: '우수' },
  B: { color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-300', label: '양호' },
  C: { color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-300', label: '보통' },
  D: { color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-300', label: '미흡' },
  F: { color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-300', label: '부족' },
};

function getScoreColor(score: number): string {
  if (score >= 90) return 'bg-emerald-500';
  if (score >= 75) return 'bg-blue-500';
  if (score >= 60) return 'bg-amber-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

export function CompletenessScoreCard({
  bizesId,
  totalScore,
  grade,
  fieldScores,
  missingFields,
  delay = 0,
}: CompletenessScoreProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const config = gradeConfig[grade];

  return (
    <div
      className={clsx(
        'transition-all duration-500 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      <div className={clsx('rounded-2xl border p-6 bg-white shadow-md', config.border)}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">데이터 완성도</h3>
            <p className="text-xs text-gray-400 mt-1">{bizesId}</p>
          </div>
          <div className={clsx('px-3 py-1 rounded-full text-sm font-bold', config.bg, config.color)}>
            {grade}등급 - {config.label}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-end justify-between mb-2">
            <span className="text-3xl font-bold text-gray-900">{totalScore}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={clsx('h-full rounded-full transition-all duration-1000', getScoreColor(totalScore))}
              style={{ width: isVisible ? `${totalScore}%` : '0%' }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {fieldScores.map((field) => (
            <div key={field.field} className="flex items-center justify-between text-sm">
              <span className={clsx('flex items-center gap-2', field.isPresent ? 'text-gray-700' : 'text-red-500')}>
                <span className={clsx('w-2 h-2 rounded-full', field.isPresent ? 'bg-emerald-500' : 'bg-red-400')} />
                {field.label}
              </span>
              <span className={clsx('font-mono text-xs', field.isPresent ? 'text-gray-500' : 'text-red-400')}>
                {field.isPresent ? `${field.weight}점` : '누락'}
              </span>
            </div>
          ))}
        </div>

        {missingFields.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-1">보완 필요 필드</p>
            <div className="flex flex-wrap gap-1">
              {missingFields.map((field) => (
                <span key={field} className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs">
                  {fieldScores.find((f) => f.field === field)?.label || field}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
