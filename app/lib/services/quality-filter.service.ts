import pino from 'pino';

const logger = pino({ name: 'quality-filter-service' });

const CTA_KEYWORDS = [
  '지금', '지금 바로', '무료', '빠른', '간편',
  '예약', '상담', '신청', '확인', '고객',
  '전화', '방문', '클릭', '바로', '오늘',
];

export interface CopyAnalysis {
  content: string;
  hasCta: boolean;
  charCount: number;
  ctaWord?: string;
}

export class QualityFilterService {
  analyzeCopies(copies: string[]): CopyAnalysis[] {
    return copies.map(copy => this.analyzeCopy(copy));
  }

  analyzeCopy(content: string): CopyAnalysis {
    const lowerContent = content.toLowerCase();
    const hasCta = CTA_KEYWORDS.some(keyword => 
      lowerContent.includes(keyword.toLowerCase())
    );

    const ctaWord = CTA_KEYWORDS.find(keyword =>
      lowerContent.includes(keyword.toLowerCase())
    );

    return {
      content,
      hasCta,
      charCount: content.length,
      ctaWord,
    };
  }

  filterByCriteria(
    copies: CopyAnalysis[],
    options?: {
      minLength?: number;
      maxLength?: number;
      requireCta?: boolean;
    }
  ): CopyAnalysis[] {
    const minLength = options?.minLength || 10;
    const maxLength = options?.maxLength || 100;
    const requireCta = options?.requireCta ?? true;

    return copies.filter(copy => {
      if (copy.charCount < minLength || copy.charCount > maxLength) {
        return false;
      }
      if (requireCta && !copy.hasCta) {
        return false;
      }
      return true;
    });
  }

  rankByScore(copies: CopyAnalysis[]): CopyAnalysis[] {
    return copies
      .map(copy => ({
        copy,
        score: this.calculateScore(copy),
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.copy);
  }

  private calculateScore(copy: CopyAnalysis): number {
    let score = 50;

    if (copy.hasCta) score += 20;
    if (copy.charCount >= 20 && copy.charCount <= 50) score += 15;
    else if (copy.charCount >= 10 && copy.charCount <= 70) score += 10;

    if (copy.ctaWord === '지금' || copy.ctaWord === '오늘') score += 10;
    if (copy.ctaWord === '무료') score += 5;

    return score;
  }
}

export const qualityFilterService = new QualityFilterService();