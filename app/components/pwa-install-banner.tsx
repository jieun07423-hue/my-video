'use client';

import { useEffect, useState } from 'react';

// beforeinstallprompt 이벤트에 대한 minimal 타입 정의
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: string }>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// beforeinstallprompt 이벤트 핸들러
let deferredPrompt: BeforeInstallPromptEvent | null = null;

useEffect(() => {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // prevented 기본 동작 억제
    e.preventDefault();
    // 이벤트 객체를 BeforeInstallPromptEvent 형태로 캐스팅 후 저장
    deferredPrompt = e as BeforeInstallPromptEvent;
  });

  return () => {
    window.removeEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
    });
  };
}, []);

// PWA 인스톨 버튼 상태
const [showInstallButton, setShowInstallButton] = useState(false);

const handleInstallClick = () => {
  if (deferredPrompt) {
    // 인스톨 다이얼로그 표시
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      // 인스톨 완료 후 상태 초기화
      deferredPrompt = null;
      setShowInstallButton(false);
    });
  }
};

// PWA 인스톨 배너 컴포넌트
const PwaInstallBanner = () => {
  if (!showInstallButton) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-white/90 rounded-full p-4 shadow-lg border border-gray-200 animate-in fade-in-0">
      <div className="flex items-center gap-3">
        <svg className="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect>
          <path d="M16 2l4 4-4 4M8 2l4 4-4 4"></path>
        </svg>
        <span className="text-gray-800 font-medium">앱에 추가하시겠습니까?</span>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors" onClick={handleInstallClick}>
          추가
        </button>
        <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors" onClick={() => setShowInstallButton(false)}>
          나중에
        </button>
      </div>
    </div>
  );
};

export { PwaInstallBanner };