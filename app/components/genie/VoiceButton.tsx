'use client';

import React from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { clsx } from 'clsx';

interface VoiceButtonProps {
  isListening: boolean;
  isSpeaking?: boolean;
  onToggle: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function VoiceButton({
  isListening,
  isSpeaking = false,
  onToggle,
  disabled = false,
  size = 'md',
  variant = 'primary',
  className,
}: VoiceButtonProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={clsx(
        'relative rounded-2xl flex items-center justify-center transition-all duration-300',
        sizeClasses[size],
        isListening 
          ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30' 
          : variant === 'primary'
            ? 'bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-sm'
            : 'bg-slate-700 hover:bg-slate-600',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'hover:scale-105 active:scale-95',
        className
      )}
    >
      {isListening ? (
        <VoiceWaveAnimation size={iconSizes[size]} />
      ) : isSpeaking ? (
        <Volume2 className={clsx(iconSizes[size], 'text-white')} />
      ) : (
        <Mic className={clsx(iconSizes[size], 'text-white')} />
      )}
      
      {/* Ripple effect when listening */}
      {isListening && (
        <span className="absolute inset-0 rounded-2xl bg-red-400 animate-ping opacity-50" />
      )}
    </button>
  );
}

function VoiceWaveAnimation({ size }: { size: string }) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <span
          key={i}
          className="bg-white rounded-full animate-pulse"
          style={{
            width: size === 'w-6 h-6' ? '3px' : '4px',
            height: size === 'w-6 h-6' ? '12px' : '16px',
            animationDelay: `${i * 100}ms`,
            animationDuration: '500ms',
          }}
        />
      ))}
    </div>
  );
}

interface SpeakButtonProps {
  onClick: () => void;
  isSpeaking: boolean;
  disabled?: boolean;
  className?: string;
}

export function SpeakButton({
  onClick,
  isSpeaking,
  disabled = false,
  className,
}: SpeakButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'p-2 rounded-full transition-all duration-300',
        isSpeaking
          ? 'bg-purple-500 text-white'
          : 'bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10 backdrop-blur-sm',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'hover:scale-110',
        className
      )}
      title={isSpeaking ? '음성 읽기 중...' : '음성으로 듣기'}
    >
      {isSpeaking ? (
        <VolumeX className="w-4 h-4" />
      ) : (
        <Volume2 className="w-4 h-4" />
      )}
    </button>
  );
}

export default VoiceButton;
