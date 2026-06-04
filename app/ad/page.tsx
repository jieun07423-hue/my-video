'use client';

import React, { useState, useCallback } from 'react';
import Navbar from '../components/Navbar';
import { Sparkles, Zap, Loader2, ChevronDown, ChevronUp, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface AdGenerateResult {
  campaign: {
    id: string;
    industry: string;
    location: string;
    status: string;
    createdAt: string;
  };
  initialCopies: string[];
  top5Copies: string[];
  finalCopies: string[];
  duration: number;
}

const INDUSTRIES = [
  { label: '치과', emoji: '🦷' },
  { label: '부동산', emoji: '🏠' },
  { label: '미용실', emoji: '💇' },
  { label: '편의점', emoji: '🏪' },
  { label: '음식점', emoji: '🍽️' },
  { label: '카페', emoji: '☕' },
  { label: '학원', emoji: '📚' },
  { label: '병원', emoji: '🏥' },
  { label: '세탁소', emoji: '👔' },
  { label: '피트니스', emoji: '💪' },
];

const TONE_OPTIONS = ['신뢰/전문', '친근/따뜻', '세련/고급', '유머/재치', '긴급/할인'];

export default function AdPage() {
  const [industry, setIndustry] = useState('');
  const [location, setLocation] = useState('');
  const [target, setTarget] = useState('');
  const [goal, setGoal] = useState('');
  const [strengths, setStrengths] = useState('');
  const [keywords, setKeywords] = useState('');
  const [tone, setTone] = useState('신뢰/전문');
  const [result, setResult] = useState<AdGenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllCopies, setShowAllCopies] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!industry.trim() || !location.trim()) {
      setError('업종과 지역은 필수 입력 항목입니다.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: industry.trim(),
          location: location.trim(),
          target: target.trim() || undefined,
          goal: goal.trim() || undefined,
          strengths: strengths.trim() || undefined,
          keywords: keywords.trim() ? keywords.split(',').map(k => k.trim()).filter(Boolean) : [],
          tone: tone || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || '광고 생성에 실패했습니다.');
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [industry, location, target, goal, strengths, keywords, tone]);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pt-24 pb-16">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#4a90d9] bg-[rgba(74,144,217,0.1)] px-4 py-1.5">
            <Sparkles size={16} color="#4a90d9" />
            <span className="text-sm" style={{ color: '#a0a0b0' }}>AI Powered Advertising</span>
          </div>
          <h1 className="mb-3 text-4xl font-bold text-white">광고 카피 생성</h1>
          <p className="text-lg" style={{ color: '#a0a0b0' }}>
            AI가 당신의 사업에 맞는 고전환 광고 카피를 만들어드립니다
          </p>
        </div>

        {/* 입력 폼 */}
        <div className="mb-8 rounded-2xl p-6" style={{ background: 'rgba(22, 33, 62, 0.8)', border: '1px solid #2d2d4a' }}>
          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-white">업종 선택</label>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setIndustry(item.label)}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200"
                  style={{
                    background: industry === item.label ? '#4a90d9' : 'rgba(74, 144, 217, 0.1)',
                    color: industry === item.label ? '#ffffff' : '#a0a0b0',
                    border: industry === item.label ? '1px solid #4a90d9' : '1px solid #2d2d4a',
                  }}
                >
                  {item.emoji} {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white" htmlFor="location">
                지역 *
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="예: 강남, 홍대, 부산"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-sm"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid #2d2d4a',
                  color: '#ffffff',
                }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white" htmlFor="target">
                타겟 고객
              </label>
              <input
                id="target"
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="예: 30대 여성, 직장인"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-sm"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid #2d2d4a',
                  color: '#ffffff',
                }}
              />
            </div>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white" htmlFor="goal">
                광고 목표
              </label>
              <input
                id="goal"
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="예: 예약 유도, 방문 유도"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-sm"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid #2d2d4a',
                  color: '#ffffff',
                }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white" htmlFor="strengths">
                차별점/강점
              </label>
              <input
                id="strengths"
                type="text"
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="예: 통증 최소화, 20년 경력"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-sm"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid #2d2d4a',
                  color: '#ffffff',
                }}
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-white" htmlFor="keywords">
              키워드 (쉼표로 구분)
            </label>
            <input
              id="keywords"
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="예: 임플란트, 무료상담, 강남역"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200 placeholder:text-sm"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid #2d2d4a',
                color: '#ffffff',
              }}
            />
          </div>

          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-white">광고 톤</label>
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => setTone(option)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200"
                  style={{
                    background: tone === option ? '#4a90d9' : 'rgba(255,255,255,0.05)',
                    color: tone === option ? '#ffffff' : '#a0a0b0',
                    border: tone === option ? '1px solid #4a90d9' : '1px solid #2d2d4a',
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold text-white shadow-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: 'linear-gradient(90deg, #4a90d9 0%, #357abd 100%)',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                AI가 광고를 생성 중입니다...
              </>
            ) : (
              <>
                <Zap size={20} />
                광고 카피 생성하기
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl p-4" style={{ background: 'rgba(233, 69, 96, 0.1)', border: '1px solid rgba(233, 69, 96, 0.3)' }}>
              <AlertCircle size={18} color="#e94560" className="mt-0.5 shrink-0" />
              <p className="text-sm" style={{ color: '#e94560' }}>{error}</p>
            </div>
          )}
        </div>

        {/* 결과 표시 */}
        {result && (
          <div className="space-y-6">
            {/* 최종 3개 */}
            <div className="rounded-2xl p-6" style={{ background: 'rgba(74, 144, 217, 0.08)', border: '1px solid rgba(74, 144, 217, 0.3)' }}>
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle size={20} color="#4a90d9" />
                <h2 className="text-lg font-bold text-white">최종 추천 광고 카피</h2>
              </div>
              <div className="grid gap-3">
                {result.finalCopies.map((copy, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-4"
                    style={{ background: 'rgba(74, 144, 217, 0.1)', border: '1px solid rgba(74, 144, 217, 0.2)' }}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: '#4a90d9' }}>
                        {i + 1}
                      </span>
                      <span className="text-xs font-medium" style={{ color: '#4a90d9' }}>추천</span>
                    </div>
                    <p className="text-base leading-relaxed text-white">{copy}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 */}
            <div className="rounded-2xl p-6" style={{ background: 'rgba(22, 33, 62, 0.8)', border: '1px solid #2d2d4a' }}>
              <h2 className="mb-4 text-lg font-bold text-white">2차 필터링 (Top 5)</h2>
              <div className="space-y-2">
                {result.top5Copies.map((copy, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-3.5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #2d2d4a' }}
                  >
                    <p className="text-sm leading-relaxed" style={{ color: '#c0c0d0' }}>{copy}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 전체 20개 (접기 가능) */}
            <div className="rounded-2xl" style={{ background: 'rgba(22, 33, 62, 0.8)', border: '1px solid #2d2d4a' }}>
              <button
                onClick={() => setShowAllCopies(!showAllCopies)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">전체 초안 ({result.initialCopies.length}개)</span>
                  <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: 'rgba(255,255,255,0.05)', color: '#a0a0b0' }}>
                    1차 생성
                  </span>
                </div>
                {showAllCopies ? <ChevronUp size={18} color="#a0a0b0" /> : <ChevronDown size={18} color="#a0a0b0" />}
              </button>
              {showAllCopies && (
                <div className="border-t px-4 pb-4 pt-2" style={{ borderColor: '#2d2d4a' }}>
                  <div className="space-y-1.5">
                    {result.initialCopies.map((copy, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <span className="mt-0.5 shrink-0 text-xs font-medium" style={{ color: '#4a90d9', minWidth: '24px' }}>{i + 1}.</span>
                        <p className="text-sm leading-relaxed" style={{ color: '#888' }}>{copy}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 메타 정보 */}
            <div className="flex items-center justify-between rounded-xl p-4" style={{ background: 'rgba(22, 33, 62, 0.6)', border: '1px solid #2d2d4a' }}>
              <div className="flex items-center gap-3 text-xs" style={{ color: '#a0a0b0' }}>
                <span>생성 시간: {(result.duration / 1000).toFixed(1)}초</span>
                <span>|</span>
                <span>업종: {result.campaign.industry}</span>
                <span>|</span>
                <span>지역: {result.campaign.location}</span>
              </div>
              <button
                onClick={() => {
                  setResult(null);
                  setShowAllCopies(false);
                }}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200"
                style={{ background: 'rgba(74, 144, 217, 0.1)', color: '#4a90d9' }}
              >
                <RefreshCw size={14} />
                새로 생성
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
