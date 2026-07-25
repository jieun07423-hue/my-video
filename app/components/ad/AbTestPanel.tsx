'use client';

import { useState } from 'react';
import { FlaskConical, CheckCircle, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

interface AbTestResult {
  variantA: { copies: string[]; tone: string };
  variantB: { copies: string[]; tone: string };
}

interface AbTestPanelProps {
  industry: string;
  location: string;
  target: string;
  goal: string;
  strengths: string;
  keywords: string[];
  toneA: string;
  toneB: string;
  onSelectWinner: (variant: 'A' | 'B', copies: string[]) => void;
}

export default function AbTestPanel({
  industry,
  location,
  target,
  goal,
  strengths,
  keywords,
  toneA,
  toneB,
  onSelectWinner,
}: AbTestPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AbTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [winner, setWinner] = useState<'A' | 'B' | null>(null);

  const handleRunTest = async () => {
    if (!industry.trim() || !location.trim()) {
      setError('업종과 지역이 필요합니다.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setWinner(null);

    try {
      const [resA, resB] = await Promise.all([
        fetch('/api/ad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            industry, location, target: target || undefined,
            goal: goal || undefined, strengths: strengths || undefined,
            keywords, tone: toneA,
          }),
        }),
        fetch('/api/ad', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            industry, location, target: target || undefined,
            goal: goal || undefined, strengths: strengths || undefined,
            keywords, tone: toneB,
          }),
        }),
      ]);

      if (!resA.ok || !resB.ok) {
        throw new Error('AB 테스트 생성에 실패했습니다.');
      }

      const dataA = await resA.json();
      const dataB = await resB.json();

      setResult({
        variantA: { copies: dataA.finalCopies || dataA.top5Copies || dataA.initialCopies, tone: toneA },
        variantB: { copies: dataB.finalCopies || dataB.top5Copies || dataB.initialCopies, tone: toneB },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  };

  const selectVariant = (variant: 'A' | 'B') => {
    setWinner(variant);
    const copies = variant === 'A' ? result!.variantA.copies : result!.variantB.copies;
    onSelectWinner(variant, copies);
  };

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
      <div className="mb-4 flex items-center gap-2">
        <FlaskConical size={18} className="text-amber-500" />
        <h3 className="text-base font-bold text-white">AB 테스트</h3>
        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-500">실험</span>
      </div>

      <p className="mb-4 text-sm text-gray-400">두 가지 톤으로 각각 광고를 생성하고 결과를 비교하세요.</p>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-700 bg-white/5 p-3">
          <span className="text-xs text-gray-500">Variant A</span>
          <p className="mt-1 text-sm font-medium text-white">{toneA}</p>
        </div>
        <div className="rounded-xl border border-gray-700 bg-white/5 p-3">
          <span className="text-xs text-gray-500">Variant B</span>
          <p className="mt-1 text-sm font-medium text-white">{toneB}</p>
        </div>
      </div>

      <button
        onClick={handleRunTest}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <><Loader2 size={18} className="animate-spin" /> AB 테스트 실행 중...</>
        ) : (
          <><FlaskConical size={18} /> AB 테스트 시작</>
        )}
      </button>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-rose-500/10 p-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-500" />
          <p className="text-sm text-rose-500">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className={`rounded-xl border p-4 transition-all ${winner === 'A' ? 'border-green-500 bg-green-500/10' : 'border-gray-700 bg-white/5'}`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-500">Variant A - {result.variantA.tone}</span>
              {winner === 'A' && <CheckCircle size={16} className="text-green-500" />}
            </div>
            <div className="space-y-2">
              {result.variantA.copies.slice(0, 3).map((copy, i) => (
                <p key={i} className="rounded-lg bg-white/5 p-2 text-sm leading-relaxed text-gray-300">{copy}</p>
              ))}
            </div>
            {!winner && (
              <button
                onClick={() => selectVariant('A')}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-500 transition-colors hover:bg-amber-500/20"
              >
                선택 <ArrowRight size={14} />
              </button>
            )}
          </div>

          <div className={`rounded-xl border p-4 transition-all ${winner === 'B' ? 'border-green-500 bg-green-500/10' : 'border-gray-700 bg-white/5'}`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-500">Variant B - {result.variantB.tone}</span>
              {winner === 'B' && <CheckCircle size={16} className="text-green-500" />}
            </div>
            <div className="space-y-2">
              {result.variantB.copies.slice(0, 3).map((copy, i) => (
                <p key={i} className="rounded-lg bg-white/5 p-2 text-sm leading-relaxed text-gray-300">{copy}</p>
              ))}
            </div>
            {!winner && (
              <button
                onClick={() => selectVariant('B')}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-500 transition-colors hover:bg-amber-500/20"
              >
                선택 <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}