'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Send, Sparkles, Zap, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useSpeechRecognition } from '@/lib/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/lib/hooks/useSpeechSynthesis';
import { VoiceButton, ListeningAnimation, GenieChat, ChatMessage } from '@/components/genie';

// 날짜 파싱 함수
function parseDate(text: string): string | null {
  const datePattern = /(\d{4})[년\-\/](\d{1,2})[월\-\/](\d{1,2})/;
  const match = text.match(datePattern);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    const day = match[3].padStart(2, '0');
    return `${year}${month}${day}`;
  }
  
  if (text.includes('오늘')) {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }
  if (text.includes('어제')) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().slice(0, 10).replace(/-/g, '');
  }
  
  return null;
}

// 지역 코드 매핑
const regionMap: Record<string, string> = {
  '서울': '11', '서울특별시': '11',
  '부산': '26', '부산광역시': '26',
  '대구': '27', '대구광역시': '27',
  '인천': '28', '인천광역시': '28',
  '광주': '29', '광주광역시': '29',
  '대전': '30', '대전광역시': '30',
  '울산': '31', '울산광역시': '31',
  '세종': '32', '세종특별자치시': '32',
  '경기': '41', '경기도': '41',
  '강원': '42', '강원도': '42',
  '충북': '43', '충청북도': '43',
  '충남': '44', '충청남도': '44',
  '전북': '45', '전라북도': '45',
  '전남': '46', '전라남도': '46',
  '경북': '47', '경상북도': '47',
  '경남': '48', '경상남도': '48',
  '제주': '50', '제주특별자치도': '50',
};

// 분석 결과 포맷팅
function formatAnalysisResult(data: any, type: string): string {
  if (!data?.body?.items || data.body.items.length === 0) {
    return '데이터를 찾을 수 없습니다.';
  }

  const totalCount = data.body.totalCount || 0;
  const items = data.body.items.slice(0, 10);

  let result = `📊 분석 결과 (총 ${totalCount.toLocaleString()}건)\n\n`;

  if (type === 'date') {
    result += '📅 최근 등록된 사업자:\n';
    items.forEach((item: any, index: number) => {
      result += `${index + 1}. ${item.bsnmNm || item.entrpsNm || '상호명 없음'}`;
      if (item.indutyLclsNm) result += ` [${item.indutyLclsNm}]`;
      if (item.adres) result += ` - ${item.adres.slice(0, 30)}...`;
      result += '\n';
    });
  } else if (type === 'region') {
    result += '📍 지역별 사업자:\n';
    items.forEach((item: any, index: number) => {
      result += `${index + 1}. ${item.bsnmNm || '상호명 없음'}`;
      if (item.adres) result += ` - ${item.adres.slice(0, 25)}...`;
      result += '\n';
    });
  } else if (type === 'industry') {
    result += '🏭 업종별 사업자:\n';
    items.forEach((item: any, index: number) => {
      result += `${index + 1}. ${item.bsnmNm || '상호명 없음'}`;
      if (item.indutyNm) result += ` [${item.indutyNm}]`;
      result += '\n';
    });
  }

  return result;
}

// Intent detection with analysis support
function detectIntent(text: string): { intent: string; entities: Record<string, string>; analysisType?: string } {
  const lowerText = text.toLowerCase();
  
  // 날짜별 분석
  if (lowerText.includes('날짜') || lowerText.includes('일자') || parseDate(text)) {
    const date = parseDate(text);
    if (date || lowerText.includes('오늘') || lowerText.includes('어제') || lowerText.includes('최근')) {
      return { 
        intent: 'analyze', 
        analysisType: 'date',
        entities: { date: date || new Date().toISOString().slice(0, 10).replace(/-/g, '') } 
      };
    }
  }
  
  // 지역별 분석
  for (const [region, code] of Object.entries(regionMap)) {
    if (lowerText.includes(region)) {
      return { 
        intent: 'analyze', 
        analysisType: 'region',
        entities: { regionCode: code, regionName: region }
      };
    }
  }
  
  // 업종별 분석
  const industries = ['식당', '카페', '미용', '편의점', '주유소', '세탁', '학원', '병원', '약국', '음식점'];
  for (const industry of industries) {
    if (lowerText.includes(industry)) {
      return { 
        intent: 'analyze', 
        analysisType: 'industry',
        entities: { industry }
      };
    }
  }
  
  // 추이 분석
  if (lowerText.includes('추이') || lowerText.includes('변화') || lowerText.includes('기간')) {
    return { 
      intent: 'analyze', 
      analysisType: 'trend',
      entities: {}
    };
  }
  
  // Business search intents
  if (lowerText.includes('검색') || lowerText.includes('찾아') || lowerText.includes('사업자') || lowerText.includes('상호')) {
    return { 
      intent: 'search_business', 
      entities: { query: text.replace(/검색|찾아|사업자|상호/gi, '').trim() }
    };
  }
  
  // Stats intents
  if (lowerText.includes('통계') || lowerText.includes('개수') || lowerText.includes('몇 개') || lowerText.includes('총')) {
    return { intent: 'get_stats', entities: {} };
  }
  
  // Help intents
  if (lowerText.includes('도움') || lowerText.includes('뭐 해') || lowerText.includes('무엇') || lowerText.includes('기능')) {
    return { intent: 'help', entities: {} };
  }
  
  // Greeting intents
  if (lowerText.includes('안녕') || lowerText.includes('반갑') || lowerText.includes('하이') || lowerText === 'hi' || lowerText === 'hello') {
    return { intent: 'greeting', entities: {} };
  }
  
  return { intent: 'general', entities: {} };
}

// Analysis API call
async function callAnalyzeAPI(type: string, entities: Record<string, string>): Promise<string> {
  try {
    const body: any = { type };
    
    if (type === 'date') body.date = entities.date;
    if (type === 'region') body.regionCode = entities.regionCode;
    if (type === 'industry') body.industryCode = entities.industry;
    if (type === 'trend') {
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      body.startDate = weekAgo.toISOString().slice(0, 10).replace(/-/g, '');
      body.endDate = now.toISOString().slice(0, 10).replace(/-/g, '');
    }
    
    const response = await fetch('/api/genie/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const result = await response.json();
    
    if (!result.success) {
      return `❌ 분석 실패: ${result.error || '알 수 없는 오류'}`;
    }
    
    return formatAnalysisResult(result.data, type);
  } catch (error) {
    console.error('분석 API 오류:', error);
    return '죄송합니다. 분석 중 오류가 발생했습니다. 나중에 다시 시도해 주세요.';
  }
}

// Response generator
function generateResponse(intent: string, entities: Record<string, string>, analysisType?: string): string {
  switch (intent) {
    case 'analyze':
      if (analysisType === 'date') return '📅 날짜별 분석을 시작합니다. 잠시만 기다려주세요...';
      if (analysisType === 'region') return `📍 ${entities.regionName || '지역'} 분석을 시작합니다. 잠시만 기다려주세요...`;
      if (analysisType === 'industry') return `🏭 ${entities.industry} 관련 분석을 시작합니다. 잠시만 기다려주세요...`;
      if (analysisType === 'trend') return '📈 기간별 추이 분석을 시작합니다. 잠시만 기다려주세요...';
      return '분석을 시작합니다...';
    
    case 'greeting':
      return '안녕하세요! 🧞 저는 지니예요. 음성 또는 텍스트로 무엇이든 물어보세요!\n\n예를 들어:\n• "서울 식당 검색해줘"\n• "오늘 사업자 통계"\n• "부산 카페 분석"';
    
    case 'search_business':
      return ` '${entities.query || '사업자'}' 검색 결과를 확인하려면 오른쪽 검색창에서 직접 검색해 주세요.\n\n음성 검색은 자동으로 텍스트로 변환되어 입력됩니다!`;
    
    case 'get_stats':
      return '통계 정보를 확인하려면 대시보드 페이지로 이동해 주세요.\n\n💡 팁: "오늘 통계 분석해줘"라고 말씀하시면 직접 검색 결과를 확인할 수 있어요.';
    
    case 'help':
      return '🧞‍♂️ 지니가 도와드릴 수 있는 것들:\n\n1️⃣ **날짜별 분석**\n   "오늘 사업자 분석해줘"\n\n2️⃣ **지역별 분석**\n   "서울 사업자 분석해줘"\n\n3️⃣ **업종별 분석**\n   "식당 분석해줘"\n\n4️⃣ **추이 분석**\n   "최근 추이 분석해줘"';
    
    case 'general':
      return '죄송해요, 그건 이해하지 못했어요. 😅\n\n다시 한번 말씀해 주시거나 다음을 시도해 보세요:\n• "오늘 통계 분석"\n• "부산 카페 분석"\n• "도움말"';
    
    default:
      return '다시 한번 말씀해 주세요.';
  }
}

// Quick suggestion prompts
const SUGGESTIONS = [
  { text: '오늘 사업자 분석', icon: '📅' },
  { text: '서울 사업자 분석', icon: '📍' },
  { text: '도움말', icon: '💡' },
];

export default function GeniePage() {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Speech recognition
  const {
    transcript,
    interimTranscript,
    isListening,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    error: speechError,
  } = useSpeechRecognition({
    lang: 'ko-KR',
    onResult: (result) => {
      if (result.isFinal) {
        setInputText(prev => prev + ' ' + result.transcript);
      }
    },
    onEnd: () => {
      if (transcript.trim()) {
        handleSendMessage(transcript);
      }
    },
  });

  // Speech synthesis
  const {
    speak,
    isSpeaking,
    cancel: cancelSpeech,
    isSupported: isTtsSupported,
  } = useSpeechSynthesis({
    lang: 'ko-KR',
  });

  // Mount check for hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-speak assistant messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && isTtsSupported) {
      const timer = setTimeout(() => {
        speak(lastMessage.content);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [messages, isTtsSupported, speak]);

  // Handle voice toggle
  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      setInputText('');
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Handle send message
  const handleSendMessage = useCallback(async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText.trim()) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);

    // Intent detection
    const { intent, entities, analysisType } = detectIntent(messageText);
    const initialResponse = generateResponse(intent, entities, analysisType);

    const assistantMessage: ChatMessage = {
      id: `${Date.now() + 1}`,
      role: 'assistant',
      content: initialResponse,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, assistantMessage]);

    // If analysis intent, call API
    if (intent === 'analyze' && analysisType) {
      setIsProcessing(true);
      
      // Get real analysis result
      const analysisResult = await callAnalyzeAPI(analysisType, entities);
      
      // Update the message with real data
      setMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: analysisResult,
            timestamp: new Date(),
          };
        }
        return updated;
      });
    }

    setIsProcessing(false);
  }, [inputText, speak]);

  // Handle keyboard submit
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Clear conversation
  const handleClear = useCallback(() => {
    setMessages([]);
    cancelSpeech();
  }, [cancelSpeech]);

  // Speak specific text
  const handleSpeak = useCallback((text: string) => {
    if (isSpeaking) {
      cancelSpeech();
    } else {
      speak(text);
    }
  }, [isSpeaking, speak, cancelSpeech]);

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 min-h-screen flex flex-col">
        {/* Header */}
        <header className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl mb-4 shadow-lg shadow-purple-500/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            🧞 Genie AI
          </h1>
          <p className="text-slate-400">
            음성 또는 텍스트로 대화해 보세요
          </p>
        </header>

        {/* Main Chat Area */}
        <div className="flex-1 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
          {/* Chat Messages */}
          <div className="flex-1 min-h-[400px]">
            <GenieChat
              messages={messages}
              onSpeak={handleSpeak}
              isSpeaking={isSpeaking}
              onClear={handleClear}
            />
          </div>

          {/* Input Area */}
          <div className="border-t border-white/10 p-4 bg-black/20">
            {/* Listening Animation */}
            {isListening && (
              <div className="mb-4">
                <ListeningAnimation isListening={true} />
              </div>
            )}

            {/* Quick Suggestions (when no messages) */}
            {messages.length === 0 && !isListening && (
              <div className="flex flex-wrap gap-2 mb-4 justify-center">
                {SUGGESTIONS.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-full border border-white/10 transition-all hover:scale-105"
                  >
                    <span>{suggestion.icon}</span>
                    <span>{suggestion.text}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}

            {/* Input Row */}
            <div className="flex items-center gap-3">
              {/* Voice Button */}
              {isSpeechSupported && (
                <VoiceButton
                  isListening={isListening}
                  isSpeaking={isSpeaking}
                  onToggle={handleVoiceToggle}
                  size="md"
                />
              )}

              {/* Text Input */}
              <div className="flex-1 relative">
                <textarea
                  value={isListening ? interimTranscript || '듣고 있어요...' : inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={isListening ? '음성을 인식 중...' : '메시지를 입력하세요...'}
                  disabled={isListening}
                  rows={1}
                  className={clsx(
                    'w-full px-5 py-3.5 rounded-2xl bg-white/10 border border-white/10 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all resize-none backdrop-blur-sm',
                    isListening && 'bg-purple-500/20 border-purple-500/30'
                  )}
                  style={{ maxHeight: '120px' }}
                />
              </div>

              {/* Send Button */}
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isProcessing}
                className={clsx(
                  'p-3.5 rounded-2xl transition-all duration-300',
                  inputText.trim() && !isProcessing
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-lg hover:shadow-purple-500/30 hover:scale-105'
                    : 'bg-white/10 text-slate-500 cursor-not-allowed'
                )}
              >
                {isProcessing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Error Message */}
            {speechError && (
              <p className="text-red-400 text-sm mt-2 text-center">
                {speechError}
              </p>
            )}

            {/* Unsupported warning */}
            {!isSpeechSupported && (
              <p className="text-amber-400 text-xs mt-2 text-center">
                ⚠️ 브라우저가 음성 인식을 지원하지 않습니다.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-6 text-slate-500 text-sm">
          <p className="flex items-center justify-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            Powered by AI •常に進化
          </p>
        </footer>
      </div>
    </div>
  );
}
