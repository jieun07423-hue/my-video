'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from './components/Navbar';
import { Sparkles, MessageSquare, BarChart3, Settings, Zap, ArrowRight, Target, Shield, Clock, Users } from 'lucide-react';

export default function HomePage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <Navbar />
      
<main style={{ paddingTop: '80px' }}>
        <section style={{
          padding: '80px 20px', 
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {}
          <div style={{ 
            position: 'absolute', 
            top: '10%', 
            left: '5%', 
            width: '300px', 
            height: '300px', 
            background: 'radial-gradient(circle, rgba(74, 144, 217, 0.3) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(60px)'
          }} />
          <div style={{ 
            position: 'absolute', 
            bottom: '10%', 
            right: '5%', 
            width: '400px', 
            height: '400px', 
            background: 'radial-gradient(circle, rgba(233, 69, 96, 0.3) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(60px)'
          }} />

          <div style={{ 
            position: 'relative', 
            zIndex: 10, 
            maxWidth: '800px', 
            margin: '0 auto',
            opacity: isLoaded ? 1 : 0,
            transform: isLoaded ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all 0.8s ease'
          }}>
            {}
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '9999px',
              border: '1px solid #4a90d9',
              background: 'rgba(74, 144, 217, 0.1)',
              marginBottom: '32px'
            }}>
              <Sparkles size={16} color="#4a90d9" />
              <span style={{ color: '#a0a0b0', fontSize: '14px' }}>AI Powered Advertising</span>
            </div>

            {}
            <h1 style={{ 
              fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', 
              fontWeight: 700, 
              color: '#ffffff',
              marginBottom: '24px',
              lineHeight: 1.2
            }}>
              스마트<br/>
              <span style={{ color: '#4a90d9' }}>광고 카피</span>
            </h1>

            {}
            <p style={{ 
              fontSize: 'clamp(1rem, 3vw, 1.5rem)', 
              color: '#a0a0b0',
              marginBottom: '40px',
              lineHeight: 1.6
            }}>
              AI가 당신의 사업에 맞는 고전환 광고 카피를<br/>
              <span style={{ color: '#4a90d9' }}>자동으로 생성</span>합니다.
            </p>

            
            <div style={{ 
              display: 'flex', 
              gap: '16px', 
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <Link href="/ad" style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '16px 32px',
                background: 'linear-gradient(90deg, #4a90d9 0%, #357abd 100%)',
                color: '#ffffff',
                borderRadius: '12px',
                fontWeight: 600,
                transition: 'transform 0.3s ease'
              }}>
                <Zap size={20} />
               광고 생성 바로가기
                <ArrowRight size={20} />
              </Link>

              <button style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '16px 32px',
                background: 'transparent',
                color: '#a0a0b0',
                border: '1px solid #2d2d4a',
                borderRadius: '12px',
                fontWeight: 600
              }}>
                <MessageSquare size={20} />
                Telegram에서 시작
              </button>
            </div>
          </div>

          
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
            maxWidth: '900px',
            margin: '80px auto 0',
            padding: '0 20px'
          }}>
            {[
              { value: '3초', label: '광고 생성 시간', icon: Zap },
              { value: '20개', label: '생성 옵션', icon: Target },
              { value: '3단계', label: '품질 필터링', icon: Shield }
            ].map((stat, index) => (
              <div key={index} style={{
                padding: '24px',
                background: 'rgba(22, 33, 62, 0.8)',
                border: '1px solid #2d2d4a',
                borderRadius: '16px',
                textAlign: 'center',
                transition: 'transform 0.3s ease',
                opacity: isLoaded ? 1 : 0,
                transform: isLoaded ? 'translateY(0)' : 'translateY(20px)',
                transitionDelay: `${400 + index * 100}ms`
              }}>
                <div style={{ 
                  display: 'inline-flex', 
                  padding: '12px', 
                  borderRadius: '12px', 
                  background: 'rgba(74, 144, 217, 0.1)',
                  marginBottom: '12px'
                }}>
                  <stat.icon size={24} color="#4a90d9" />
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ffffff' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '14px', color: '#a0a0b0', marginTop: '8px' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        
        <section style={{ padding: '60px 20px', background: 'rgba(22, 33, 62, 0.3)' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ 
              fontSize: '2rem', 
              fontWeight: 700, 
              color: '#ffffff', 
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              광고 카피 생성
            </h2>
            <p style={{ 
              color: '#a0a0b0', 
              textAlign: 'center',
              marginBottom: '40px'
            }}>
              간단한 입력으로 전문적인 광고 카피를 생성하세요
            </p>

            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '24px'
            }}>
              {[
                { icon: '🦷', title: '치과', path: '/ad?industry=치과' },
                { icon: '🏠', title: '부동산', path: '/ad?industry=부동산' },
                { icon: '💇', title: '미용실', path: '/ad?industry=미용실' },
                { icon: '🏪', title: '편의점', path: '/ad?industry=편의점' },
              ].map((item, index) => (
                <Link key={index} href={item.path} style={{
                  display: 'block',
                  padding: '24px',
                  background: 'rgba(22, 33, 62, 0.8)',
                  border: '1px solid #2d2d4a',
                  borderRadius: '16px',
                  textAlign: 'center',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '12px' }}>{item.icon}</div>
                  <div style={{ fontWeight: 600, color: '#ffffff' }}>{item.title}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        
        <section style={{ padding: '80px 20px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ 
              fontSize: '2rem', 
              fontWeight: 700, 
              color: '#ffffff', 
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              주요 기능
            </h2>
            <p style={{ color: '#a0a0b0', textAlign: 'center', marginBottom: '60px' }}>
              소상공인을 위한 스마트한 광고 솔루션
            </p>

            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px'
            }}>
              {[
                { icon: <Sparkles size={32} />, title: 'AI 생성', desc: 'OpenClaw + Ollama 기반 AI가 최적의 광고 카피를 생성합니다.', color: '#4a90d9' },
                { icon: <MessageSquare size={32} />, title: 'Telegram 연동', desc: 'Telegram에서 명령어로 빠르게 광고를 생성할 수 있습니다.', color: '#e94560' },
                { icon: <BarChart3 size={32} />, title: '3단계 필터링', desc: '20개 → 5개 → 3개 순차 필터링으로 최상의 결과를 만듭니다.', color: '#4a90d9' },
                { icon: <Settings size={32} />, title: '자동 저장', desc: '생성된 광고는 자동으로 DB에 저장되어 관리됩니다.', color: '#e94560' }
              ].map((feature, index) => (
                <div key={index} style={{
                  padding: '32px',
                  background: 'rgba(22, 33, 62, 0.8)',
                  border: '1px solid #2d2d4a',
                  borderRadius: '16px',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ 
                    display: 'inline-flex',
                    padding: '16px',
                    borderRadius: '12px',
                    background: `${feature.color}20`,
                    marginBottom: '20px'
                  }}>
                    <span style={{ color: feature.color }}>{feature.icon}</span>
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
                    {feature.title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#a0a0b0', lineHeight: 1.6 }}>
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        
        <section style={{ 
          padding: '60px 20px', 
          background: 'rgba(22, 33, 62, 0.5)' 
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 style={{ 
              fontSize: '2rem', 
              fontWeight: 700, 
              color: '#ffffff', 
              textAlign: 'center',
              marginBottom: '16px'
            }}>
              실시간 통계
            </h2>
            <p style={{ color: '#a0a0b0', textAlign: 'center', marginBottom: '40px' }}>
              광고 캠페인 현황
            </p>

            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '24px'
            }}>
              {[
                { value: '156', label: '총 캠페인' },
                { value: '142', label: '완료' },
                { value: '8', label: '진행중' },
                { value: '6', label: '대기중' }
              ].map((stat, index) => (
                <div key={index} style={{
                  padding: '24px',
                  background: 'rgba(22, 33, 62, 0.8)',
                  border: '1px solid #2d2d4a',
                  borderRadius: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '14px', color: '#a0a0b0' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        
        <section style={{ padding: '80px 20px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{
              padding: '48px',
              background: 'linear-gradient(135deg, #4a90d9 0%, #357abd 100%)',
              borderRadius: '24px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)'
              }} />
              
              <div style={{ position: 'relative', zIndex: 10 }}>
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '9999px',
                  marginBottom: '24px'
                }}>
                  <Zap size={16} color="#fde047" />
                  <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600 }}>지금 바로 시작</span>
                </div>

                <h2 style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: 700, 
                  color: '#ffffff',
                  marginBottom: '24px'
                }}>
                  무료로<br/><span style={{ opacity: 0.9 }}>광고 카피를 생성</span>
                </h2>

                <p style={{ 
                  fontSize: '1.25rem', 
                  color: 'rgba(255,255,255,0.8)',
                  marginBottom: '32px'
                }}>
                  Telegram에서 @We0098bot에게<br/>/ad 강남 치과 라고 입력해보세요
                </p>

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link href="/ad" style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    padding: '16px 32px',
                    background: '#ffffff',
                    color: '#4a90d9',
                    borderRadius: '12px',
                    fontWeight: 700,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                  }}>
                    <Zap size={20} />
                    지금 시작
                    <ArrowRight size={20} />
                  </Link>

                  <button style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    padding: '16px 32px',
                    background: 'rgba(255,255,255,0.2)',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '12px',
                    fontWeight: 600
                  }}>
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