'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from './components/Navbar';
import { Sparkles, MessageSquare, BarChart3, Settings, Zap, ArrowRight, Target, Shield, Clock, Users } from 'lucide-react';

interface CampaignStats {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
}

interface BusinessStats {
  total: number;
  active: number;
  inactive: number;
  newToday: number;
}

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [businessStats, setBusinessStats] = useState<BusinessStats | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [campaignRes, businessRes] = await Promise.all([
          fetch('/api/ad/stats'),
          fetch('/api/dashboard/stats')
        ]);

        if (campaignRes.ok) {
          const campaignData = await campaignRes.json();
          setCampaignStats({
            total: campaignData.total || 0,
            completed: campaignData.completed || 0,
            pending: campaignData.pending || 0,
            inProgress: campaignData.inProgress || 0
          });
        }

        if (businessRes.ok) {
          const businessData = await businessRes.json();
          setBusinessStats({
            total: businessData.total || 0,
            active: businessData.active || 0,
            inactive: businessData.inactive || 0,
            newToday: businessData.newToday || 0
          });
        }
      } catch (error) {
        console.error('Stats fetch error:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1a2e] to-[#16213e] font-sans">
      <Navbar />
      
      <main className="pt-20">
        <section className="py-20 px-5 text-center relative overflow-hidden">
          <div className="absolute top-[10%] left-[5%] w-[300px] h-[300px] bg-blue-500/30 rounded-full blur-[60px]" />
          <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] bg-rose-500/30 rounded-full blur-[60px]" />

          <div 
            className={`relative z-10 max-w-[800px] mx-auto transition-all duration-800 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500 bg-blue-500/10 mb-8">
              <Sparkles size={16} className="text-blue-500" />
              <span className="text-gray-400 text-sm">AI Powered Advertising</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              스마트<br/>
              <span className="text-blue-500">광고 카피</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-400 mb-10 leading-relaxed">
              AI가 당신의 사업에 맞는 고전환 광고 카피를<br/>
              <span className="text-blue-500">자동으로 생성</span>합니다.
            </p>

            <div className="flex gap-4 justify-center flex-wrap">
              <Link 
                href="/ad" 
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:scale-105 transition-transform"
              >
                <Zap size={20} />
                광고 생성 바로가기
                <ArrowRight size={20} />
              </Link>

              <button className="inline-flex items-center gap-2 px-8 py-4 bg-transparent text-gray-400 border border-gray-700 rounded-xl font-semibold">
                <MessageSquare size={20} />
                Telegram에서 시작
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-[900px] mx-auto mt-20 px-5">
            {[
              { value: '3초', label: '광고 생성 시간', icon: Zap },
              { value: '20개', label: '생성 옵션', icon: Target },
              { value: '3단계', label: '품질 필터링', icon: Shield }
            ].map((stat, index) => (
              <div 
                key={index} 
                className={`p-6 bg-[#16213e]/80 border border-gray-700 rounded-2xl text-center transition-all duration-500 ${
                  isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                }`}
                style={{ transitionDelay: `${400 + index * 100}ms` }}
              >
                <div className="inline-flex p-3 rounded-xl bg-blue-500/10 mb-3">
                  <stat.icon size={24} className="text-blue-500" />
                </div>
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-gray-400 mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16 px-5 bg-[#16213e]/30">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-4">
              광고 카피 생성
            </h2>
            <p className="text-gray-400 text-center mb-10">
              간단한 입력으로 전문적인 광고 카피를 생성하세요
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: '🦷', title: '치과', path: '/ad?industry=치과' },
                { icon: '🏠', title: '부동산', path: '/ad?industry=부동산' },
                { icon: '💇', title: '미용실', path: '/ad?industry=미용실' },
                { icon: '🏪', title: '편의점', path: '/ad?industry=편의점' },
              ].map((item, index) => (
                <Link 
                  key={index} 
                  href={item.path}
                  className="block p-6 bg-[#16213e]/80 border border-gray-700 rounded-2xl text-center hover:bg-[#16213e] transition-all"
                >
                  <div className="text-5xl mb-3">{item.icon}</div>
                  <div className="font-semibold text-white">{item.title}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-5">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-4">
              주요 기능
            </h2>
            <p className="text-gray-400 text-center mb-16">
              소상공인을 위한 스마트한 광고 솔루션
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: <Sparkles size={32} />, title: 'AI 생성', desc: 'OpenClaw + Ollama 기반 AI가 최적의 광고 카피를 생성합니다.', color: 'blue' },
                { icon: <MessageSquare size={32} />, title: 'Telegram 연동', desc: 'Telegram에서 명령어로 빠르게 광고를 생성할 수 있습니다.', color: 'rose' },
                { icon: <BarChart3 size={32} />, title: '3단계 필터링', desc: '20개 → 5개 → 3개 순차 필터링으로 최상의 결과를 만듭니다.', color: 'blue' },
                { icon: <Settings size={32} />, title: '자동 저장', desc: '생성된 광고는 자동으로 DB에 저장되어 관리됩니다.', color: 'rose' }
              ].map((feature, index) => (
                <div 
                  key={index}
                  className="p-8 bg-[#16213e]/80 border border-gray-700 rounded-2xl hover:border-gray-600 transition-all"
                >
                  <div className={`inline-flex p-4 rounded-xl bg-${feature.color}-500/20 mb-5`}>
                    <span className={`text-${feature.color}-500`}>{feature.icon}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-5 bg-[#16213e]/50">
          <div className="max-w-[1200px] mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-4">
              실시간 통계
            </h2>
            <p className="text-gray-400 text-center mb-10">
              광고 캠페인 현황
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: campaignStats?.total ?? '-', label: '총 캠페인' },
                { value: campaignStats?.completed ?? '-', label: '완료' },
                { value: campaignStats?.inProgress ?? '-', label: '진행중' },
                { value: campaignStats?.pending ?? '-', label: '대기중' }
              ].map((stat, index) => (
                <div 
                  key={index}
                  className="p-6 bg-[#16213e]/80 border border-gray-700 rounded-2xl text-center"
                >
                  <div className="text-3xl font-bold text-white mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-5">
          <div className="max-w-[800px] mx-auto">
            <div className="p-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.05)_10px,rgba(255,255,255,0.05)_20px)]" />
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full mb-6">
                  <Zap size={16} className="text-yellow-300" />
                  <span className="text-white text-sm font-semibold">지금 바로 시작</span>
                </div>

                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                  무료로<br/><span className="opacity-90">광고 카피를 생성</span>
                </h2>

                <p className="text-xl text-white/80 mb-8">
                  Telegram에서 @We0098bot에게<br/>/ad 강남 치과 라고 입력해보세요
                </p>

                <div className="flex gap-4 justify-center flex-wrap">
                  <Link 
                    href="/ad"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-500 rounded-xl font-bold shadow-xl hover:scale-105 transition-transform"
                  >
                    <Zap size={20} />
                    지금 시작
                    <ArrowRight size={20} />
                  </Link>

                  <button className="inline-flex items-center gap-2 px-8 py-4 bg-white/20 text-white border border-white/30 rounded-xl font-semibold">
                    <MessageSquare size={20} />
                    Telegram 열기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
