'use client';

import React from 'react';
import { clsx } from 'clsx';

interface VoiceWaveProps {
  isActive: boolean;
  className?: string;
  barCount?: number;
}

export function VoiceWave({
  isActive,
  className,
  barCount = 20,
}: VoiceWaveProps) {
  return (
    <div className={clsx('flex items-center justify-center gap-1 h-16', className)}>
      {Array.from({ length: barCount }).map((_, i) => (
        <span
          key={i}
          className={clsx(
            'w-1 bg-gradient-to-t from-purple-500 to-blue-500 rounded-full transition-all duration-300',
            isActive ? 'animate-pulse' : 'h-2 opacity-30'
          )}
          style={{
            height: isActive ? `${Math.random() * 100}%` : '8px',
            animationDelay: isActive ? `${i * 50}ms` : '0ms',
            animationDuration: isActive ? '600ms' : '1s',
          }}
        />
      ))}
    </div>
  );
}

interface CircularWaveProps {
  isActive: boolean;
  className?: string;
  size?: number;
}

export function CircularWave({
  isActive,
  className,
  size = 120,
}: CircularWaveProps) {
  return (
    <div 
      className={clsx('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center z-10">
        <div className="w-3/4 h-3/4 bg-white/20 rounded-full backdrop-blur-sm" />
      </div>

      {isActive && (
        <>
          <span className="absolute inset-0 rounded-full bg-purple-500/30 animate-ping" />
          <span 
            className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"
            style={{ animationDelay: '200ms' }}
          />
          <span 
            className="absolute inset-0 rounded-full bg-purple-500/10 animate-ping"
            style={{ animationDelay: '400ms' }}
          />
        </>
      )}
    </div>
  );
}

interface ListeningAnimationProps {
  isListening: boolean;
  className?: string;
}

export function ListeningAnimation({
  isListening,
  className,
}: ListeningAnimationProps) {
  return (
    <div className={clsx('flex flex-col items-center gap-4', className)}>
      <CircularWave isActive={isListening} size={100} />
      <p className={clsx(
        'text-sm font-medium transition-all duration-300',
        isListening ? 'text-purple-400' : 'text-slate-400'
      )}>
        {isListening ? '듣고 있어요...' : '마이크를 누르고 말씀해 주세요'}
      </p>
    </div>
  );
}

export default VoiceWave;
