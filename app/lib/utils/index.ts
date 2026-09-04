import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';

/**
 * Tailwind CSS 클래스명을 조건부로 결합하는 유틸리티.
 * shadcn/ui 및 컴포넌트에서 공통으로 사용한다.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
