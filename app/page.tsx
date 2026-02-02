'use client';

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import { StatCard } from './components/ui/StatCard';
import { BarChart3, Database, Bell, Search, TrendingUp, Shield, Users, Zap, ArrowRight, Star } from 'lucide-react';
import { clsx } from 'clsx';

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeFeature, setActiveFeature] = useState<number | null>(null);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="relative">
        <Navbar />
        
        <main className="relative">
          <HeroSection isLoaded={isLoaded} />
          <StatsSection isLoaded={isLoaded} />
          <FeaturesSection 
            activeFeature={activeFeature} 
            setActiveFeature={setActiveFeature}
            isLoaded={isLoaded}
          />
          <CTASection isLoaded={isLoaded} />
        </main>
      </div>
    </div>
  );
}

function HeroSection({ isLoaded }: { isLoaded: boolean }) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-amber-600/10"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className={`text-center transition-all duration-1000 delay-200 ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-400/20 to-yellow-500/20 border border-amber-300/30 rounded-full px-4 py-2 mb-6">
            <Star className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">스마트 비즈니스 관리 솔루션</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent leading-tight">
              소상공인
              <br className="md:hidden" />
              <span className="bg-gradient-to-r from-amber-500 to-yellow-600 bg-clip-text text-transparent"> 정보 트래커</span>
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            공공데이터포털에서 소상공인 정보를 자동으로 수집하고
            <span className="text-blue-600 font-semibold"> 스마트하게 관리</span>합니다.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="group inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
              <span>지금 시작하기</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button className="group inline-flex items-center space-x-2 px-8 py-4 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition-all duration-300">
              <BarChart3 className="w-5 h-5" />
              <span>데모 보기</span>
            </button>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            { value: '10,000+', label: '관리 중인 소상공인' },
            { value: '99.9%', label: '데이터 정확도' },
            { value: '24/7', label: '실시간 동기화' }
          ].map((stat, index) => (
            <div
              key={index}
              className={`transition-all duration-700 delay-${(index + 1) * 100} ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${(index + 1) * 100 + 400}ms` }}
            >
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-amber-600 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-sm text-slate-600 mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatsSection({ isLoaded }: { isLoaded: boolean }) {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">실시간 통계</h2>
          <p className="text-slate-600">현재 관리되고 있는 소상공인 데이터 현황</p>
        </div>
        
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="전체 소상공인" 
            value={8456} 
            color="blue"
            icon="🏪"
            trend="up"
            trendValue={234}
            delay={isLoaded ? 200 : 0}
          />
          <StatCard 
            title="오늘 신규" 
            value={42} 
            color="green"
            icon="🆕"
            trend="up"
            trendValue={15}
            delay={isLoaded ? 300 : 0}
          />
          <StatCard 
            title="신규 등록" 
            value={128} 
            color="amber"
            icon="📝"
            trend="up"
            trendValue={67}
            delay={isLoaded ? 400 : 0}
          />
          <StatCard 
            title="영업 중" 
            value={7234} 
            color="purple"
            icon="🏃"
            trend="up"
            trendValue={156}
            delay={isLoaded ? 500 : 0}
          />
        </div>
      </div>
    </div>
  );
}

function FeaturesSection({ 
  activeFeature, 
  setActiveFeature,
  isLoaded 
}: { 
  activeFeature: number | null;
  setActiveFeature: (index: number | null) => void;
  isLoaded: boolean;
}) {
  const features = [
    {
      icon: <Database className="w-8 h-8" />,
      title: "자동 데이터 수집",
      description: "공공데이터포털 API를 통해 자동으로 소상공인 정보를 수집하고 데이터베이스에 동기화합니다.",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      features: ["실시간 데이터 동기화", "데이터 정확도 검증", "중복 데이터 제거"]
    },
    {
      icon: <Bell className="w-8 h-8" />,
      title: "신규 등록 감지",
      description: "새로 등록된 소상공인을 자동으로 감지하고 Slack으로 실시간 알림을 전송합니다.",
      color: "from-amber-500 to-yellow-600",
      bgColor: "bg-amber-50",
      features: ["실시간 알림 시스템", "Slack 연동", "커스텀 알림 설정"]
    },
    {
      icon: <Search className="w-8 h-8" />,
      title: "고급 검색 기능",
      description: "상호명, 주소, 업종별로 소상공인을 검색하고 필터링할 수 있습니다.",
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-green-50",
      features: ["다양한 검색 조건", "실시간 필터링", "검색 결과 내보내기"]
    }
  ];

  return (
    <div className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent to-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">핵심 기능</h2>
          <p className="text-xl text-slate-600">소상공인 관리를 혁신하는 스마트 기능들</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group relative transition-all duration-700 delay-${index * 100} ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
              style={{ transitionDelay: `${index * 100 + 600}ms` }}
              onMouseEnter={() => setActiveFeature(index)}
              onMouseLeave={() => setActiveFeature(null)}
            >
              <div className={clsx(
                'relative h-full p-8 rounded-2xl border transition-all duration-300 cursor-pointer',
                activeFeature === index 
                  ? `${feature.bgColor} border-transparent shadow-2xl scale-105` 
                  : 'bg-white border-slate-200 hover:shadow-xl hover:scale-102'
              )}>
                <div className={clsx(
                  'inline-flex items-center justify-center w-16 h-16 rounded-xl text-white mb-6 transition-all duration-300',
                  `bg-gradient-to-r ${feature.color}`,
                  activeFeature === index ? 'scale-110 shadow-lg' : ''
                )}>
                  {feature.icon}
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">{feature.description}</p>

                <div className={clsx(
                  'space-y-2 transition-all duration-300 overflow-hidden',
                  activeFeature === index ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                )}>
                  {feature.features.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2 text-sm text-slate-700">
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-500 to-amber-500 rounded-full"></div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <TrendingUp className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CTASection({ isLoaded }: { isLoaded: boolean }) {
  return (
    <div className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className={`
          relative bg-gradient-to-r from-slate-900 to-blue-900 rounded-3xl p-12 text-center overflow-hidden transition-all duration-1000 delay-800 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          <div className="absolute inset-0 opacity-5"></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold text-white">지금 바로 시작하세요</span>
            </div>
            
            <h2 className="text-4xl font-bold text-white mb-6">
              소상공인 관리를
              <br />
              <span className="text-transparent bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text">
                스마트하게 변화시키세요
              </span>
            </h2>
            
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              지금 바로 소상공인 정보 트래커를 시작하고 효율적인 비즈니스 관리를 경험해보세요.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="group inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                <span>무료로 시작하기</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button className="group inline-flex items-center space-x-2 px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300">
                <Users className="w-5 h-5" />
                <span>문의하기</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
