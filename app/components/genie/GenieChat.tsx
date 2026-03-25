'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User, Bot, Copy, Trash2, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { SpeakButton } from './VoiceButton';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface GenieChatProps {
  messages: ChatMessage[];
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
  onClear?: () => void;
  onRegenerate?: () => void;
  className?: string;
}

export function GenieChat({
  messages,
  onSpeak,
  isSpeaking = false,
  onClear,
  onRegenerate,
  className,
}: GenieChatProps) {
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={clsx('flex flex-col h-full', className)}>
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {mounted && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30">
              <Bot className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              안녕하세요! 🧞
            </h3>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              무엇을 도와드릴까요?<br/>
              음성으로 말씀하시거나<br/>
              아래 입력창에 질문을 입력해 주세요.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              onSpeak={onSpeak}
              isSpeaking={isSpeaking}
              onCopy={copyToClipboard}
              formatTime={formatTime}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {mounted && messages.length > 0 && (
        <div className="flex justify-center gap-2 p-3 border-t border-white/10">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              다시생성
            </button>
          )}
          {onClear && (
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              초기화
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface ChatBubbleProps {
  message: ChatMessage;
  onSpeak?: (text: string) => void;
  isSpeaking: boolean;
  onCopy: (text: string) => void;
  formatTime: (date: Date) => string;
}

function ChatBubble({
  message,
  onSpeak,
  isSpeaking,
  onCopy,
  formatTime,
}: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={clsx('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={clsx(
          'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0',
          isUser
            ? 'bg-gradient-to-br from-amber-400 to-orange-500'
            : 'bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg shadow-purple-500/20'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      <div
        className={clsx(
          'max-w-[75%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
            : 'bg-white/10 border border-white/10 text-slate-100 backdrop-blur-sm'
        )}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {message.content}
        </p>

        <div
          className={clsx(
            'flex items-center justify-end gap-2 mt-2 pt-2 border-t',
            isUser ? 'border-white/20' : 'border-white/10'
          )}
        >
          <span className={clsx('text-xs', isUser ? 'text-white/60' : 'text-slate-500')}>
            {formatTime(message.timestamp)}
          </span>

          {!isUser && (
            <div className="flex items-center gap-1">
              {onSpeak && (
                <SpeakButton
                  onClick={() => onSpeak(message.content)}
                  isSpeaking={isSpeaking}
                />
              )}
              <button
                onClick={() => onCopy(message.content)}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                title="복사"
              >
                <Copy className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GenieChat;
