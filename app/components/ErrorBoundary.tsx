'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 전역 에러 바운더리 컴포넌트
 * 애플리케이션 전체의 에러를 잡아 사용자 친화적인 에러 페이지 표시
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // 에러 로깅 서비스로 전송 (실제 환경에서는 API 호출로 변경)
    this.logErrorToService(error, errorInfo);
    
    // 부모 컴포넌트에 에러 통지
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo
    });
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // 에러 로깅 데이터 생성
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // 콘솔에도 출력
    console.error('Error logged:', errorData);
    
    // 에러 로깅 API 호출
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    }).catch(fetchError => {
      console.error('Failed to log error to service:', fetchError);
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 커스텀 폴백이 있으면 사용
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 에러 UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            {/* 에러 헤더 */}
            <div className="bg-gradient-to-r from-red-500 to-pink-500 px-6 py-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                알 수 없는 오류가 발생했습니다
              </h1>
              <p className="text-red-100 text-sm">
                서비스 이용에 불편을 드려 죄송합니다
              </p>
            </div>

            {/* 에러 상세 정보 */}
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">
                  문제 해결 방법
                </h2>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>페이지를 새로고침 해보세요</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>인터넷 연결 상태를 확인하세요</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>잠시 후 다시 시도해보세요</span>
                  </li>
                </ul>
              </div>

              {/* 개발 환경에서만 에러 상세 표시 */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-6">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900 mb-2">
                    에러 상세 정보 (개발 환경)
                  </summary>
                  <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 max-h-60 overflow-y-auto">
                    <div className="mb-3">
                      <strong>에러 메시지:</strong>
                      <pre className="mt-1 text-red-600 whitespace-pre-wrap">
                        {this.state.error.message}
                      </pre>
                    </div>
                    {this.state.error.stack && (
                      <div className="mb-3">
                        <strong>스택 트레이스:</strong>
                        <pre className="mt-1 text-slate-600 whitespace-pre-wrap">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                    {this.state.errorInfo && (
                      <div>
                        <strong>컴포넌트 스택:</strong>
                        <pre className="mt-1 text-slate-600 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* 액션 버튼 */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  다시 시도
                </button>
                
                <button
                  onClick={this.handleReload}
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-slate-500 to-slate-600 text-white font-medium rounded-lg hover:from-slate-600 hover:to-slate-700 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  페이지 새로고침
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Home className="w-4 h-4 mr-2" />
                  홈으로
                </button>
              </div>

              {/* 고객 지원 정보 */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <p className="text-center text-sm text-slate-500">
                  문제가 계속되면 관리자에게 문의해주세요
                </p>
                <div className="mt-3 text-center">
                  <a 
                    href="mailto:support@example.com" 
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    support@example.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 에러 폴백 컴포넌트
 * 에러 발생 시 표시할 간단한 UI
 */
export const ErrorFallback: React.FC<{
  error?: Error;
  resetError?: () => void;
}> = ({ error, resetError }) => (
  <div className="text-center py-12">
    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
    <h2 className="text-xl font-semibold text-slate-900 mb-2">
      문제가 발생했습니다
    </h2>
    {error && (
      <p className="text-slate-600 text-sm mb-4">
        {error.message}
      </p>
    )}
    {resetError && (
      <button
        onClick={resetError}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        다시 시도
      </button>
    )}
  </div>
);