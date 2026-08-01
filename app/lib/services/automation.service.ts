import { syncLogger, dbLogger } from '@/lib/logger';
import { redis } from '@/lib/redis';
import { statisticService } from './statistic.service';
import { validationService, ValidationError } from './validation.service';
import { eventPublisher } from './event-publisher';

export interface ImprovementRule {
  id: string;
  name: string;
  description: string;
  type: 'validation' | 'deduplication' | 'sync' | 'performance';
  condition: string;
  action: RuleAction;
  enabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: 'system' | 'user' | 'ml';
  metadata?: Record<string, unknown>;
}

export interface RuleAction {
  type: 'adjust_threshold' | 'add_validation' | 'modify_weight' | 'alert' | 'auto_merge' | 'skip_processing';
  params: Record<string, unknown>;
}

export interface RuleTriggerResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  reason?: string;
  actionTaken?: string;
}

export interface PatternAnalysisResult {
  patterns: DetectedPattern[];
  recommendations: Recommendation[];
  confidence: number;
}

export interface DetectedPattern {
  id: string;
  type: 'duplicate_field' | 'validation_failure' | 'sync_error' | 'performance_bottleneck';
  description: string;
  frequency: number;
  impact: 'low' | 'medium' | 'high';
  examples: unknown[];
  suggestedAction: RuleAction;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  type: 'threshold' | 'validation' | 'workflow' | 'performance';
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: string;
  implementationEffort: 'low' | 'medium' | 'high';
  action: RuleAction;
}

export interface AutomationConfig {
  analysisIntervalHours: number;
  minPatternFrequency: number;
  confidenceThreshold: number;
  autoApplyRules: boolean;
  maxRulesPerType: number;
}

const DEFAULT_CONFIG: AutomationConfig = {
  analysisIntervalHours: 24,
  minPatternFrequency: 5,
  confidenceThreshold: 0.7,
  autoApplyRules: false,
  maxRulesPerType: 10,
};

const RULES_KEY = 'automation:rules';
const PATTERNS_KEY = 'automation:patterns';
const ANALYSIS_LOCK_KEY = 'automation:analysis_lock';

export class AutomationService {
  private config: AutomationConfig = DEFAULT_CONFIG;
  private rules: Map<string, ImprovementRule> = new Map();
  private lastAnalysisTime: Date | null = null;
  private isAnalyzing = false;

  constructor(config?: Partial<AutomationConfig>) {
    if (config) {
      this.config = { ...DEFAULT_CONFIG, ...config };
    }
  }

  async initialize(): Promise<void> {
    await this.loadRules();
    syncLogger.info({ rulesCount: this.rules.size }, '자동화 서비스 초기화 완료');
  }

  async analyzeAndGenerateRules(): Promise<PatternAnalysisResult> {
    if (this.isAnalyzing) {
      syncLogger.warn('분석이 이미 진행 중입니다');
      return { patterns: [], recommendations: [], confidence: 0 };
    }

    const lockAcquired = await this.acquireAnalysisLock();
    if (!lockAcquired) {
      syncLogger.warn('분석 락 획득 실패');
      return { patterns: [], recommendations: [], confidence: 0 };
    }

    this.isAnalyzing = true;
    const startTime = Date.now();

    try {
      syncLogger.info('패턴 분석 시작');

      const [duplicatePatterns, validationPatterns, syncPatterns, performancePatterns] = await Promise.all([
        this.analyzeDuplicatePatterns(),
        this.analyzeValidationPatterns(),
        this.analyzeSyncPatterns(),
        this.analyzePerformancePatterns(),
      ]);

      const allPatterns = [
        ...duplicatePatterns,
        ...validationPatterns,
        ...syncPatterns,
        ...performancePatterns,
      ];

      const recommendations = this.generateRecommendations(allPatterns);
      
      await this.savePatterns(allPatterns);

      const confidence = this.calculateOverallConfidence(allPatterns);

      this.lastAnalysisTime = new Date();
      const duration = Date.now() - startTime;

      syncLogger.info({ 
        patternsFound: allPatterns.length, 
        recommendations: recommendations.length,
        durationMs: duration 
      }, '패턴 분석 완료');

      await eventPublisher.publishSystemHealth('healthy', {
        automation: { status: 'pass', message: `분석 완료: ${allPatterns.length}개 패턴 발견` }
      });

      return { patterns: allPatterns, recommendations, confidence };

    } catch (error) {
      syncLogger.error({ error }, '패턴 분석 실패');
      throw error;
    } finally {
      this.isAnalyzing = false;
      await this.releaseAnalysisLock();
    }
  }

  private async analyzeDuplicatePatterns(): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    
    try {
      const dupMetrics = await statisticService.getDuplicateMetrics();
      
      if (dupMetrics.topMatchFields) {
        for (const [field, count] of Object.entries(dupMetrics.topMatchFields)) {
          if (count >= this.config.minPatternFrequency) {
            const impact = count > 50 ? 'high' : count > 20 ? 'medium' : 'low';
            
            patterns.push({
              id: `dup_field_${field}_${Date.now()}`,
              type: 'duplicate_field',
              description: `'${field}' 필드에서 ${count}건의 중복 패턴 발견`,
              frequency: count,
              impact,
              examples: [{ field, count }],
              suggestedAction: {
                type: 'adjust_threshold',
                params: { field, adjustment: impact === 'high' ? -0.05 : -0.02 },
              },
            });
          }
        }
      }

      if (dupMetrics.exactMatches > 100) {
        patterns.push({
          id: `dup_exact_${Date.now()}`,
          type: 'duplicate_field',
          description: `완전 일치 중복 ${dupMetrics.exactMatches}건 - 자동 병합 규칙 제안`,
          frequency: dupMetrics.exactMatches,
          impact: 'high',
          examples: [{ exactMatches: dupMetrics.exactMatches }],
          suggestedAction: {
            type: 'auto_merge',
            params: { matchType: 'exact', confidenceThreshold: 0.99 },
          },
        });
      }

    } catch (error) {
      syncLogger.error({ error }, '중복 패턴 분석 실패');
    }

    return patterns;
  }

  private async analyzeValidationPatterns(): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    
    try {
      const validationErrors = await this.getRecentValidationErrors();
      const errorCounts = new Map<string, number>();

      for (const error of validationErrors) {
        const key = `${error.field}:${error.code}`;
        errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
      }

      for (const [key, count] of errorCounts.entries()) {
        if (count >= this.config.minPatternFrequency) {
          const [field, code] = key.split(':');
          const impact = count > 30 ? 'high' : count > 10 ? 'medium' : 'low';
          
          patterns.push({
            id: `val_${field}_${code}_${Date.now()}`,
            type: 'validation_failure',
            description: `검증 실패 패턴: ${field} 필드에서 ${code} 오류 ${count}회 발생`,
            frequency: count,
            impact,
            examples: [{ field, code, count }],
            suggestedAction: {
              type: 'add_validation',
              params: { field, code, suggestion: this.getValidationSuggestion(code) },
            },
          });
        }
      }

    } catch (error) {
      syncLogger.error({ error }, '검증 패턴 분석 실패');
    }

    return patterns;
  }

  private async analyzeSyncPatterns(): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    
    try {
      const syncMetrics = await statisticService.getSyncMetrics();
      
      if (syncMetrics.successRate < 90) {
        patterns.push({
          id: `sync_low_success_${Date.now()}`,
          type: 'sync_error',
          description: `동기화 성공률 낮음: ${syncMetrics.successRate}%`,
          frequency: Math.round((100 - syncMetrics.successRate) * 10),
          impact: syncMetrics.successRate < 70 ? 'high' : 'medium',
          examples: [{ successRate: syncMetrics.successRate }],
          suggestedAction: {
            type: 'alert',
            params: { 
              message: `동기화 성공률 ${syncMetrics.successRate}% - 재시도 로직 검토 필요`,
              severity: syncMetrics.successRate < 70 ? 'high' : 'medium'
            },
          },
        });
      }

      if (syncMetrics.errorsByType) {
        for (const [errorType, count] of Object.entries(syncMetrics.errorsByType)) {
          if (count >= this.config.minPatternFrequency) {
            patterns.push({
              id: `sync_error_${errorType}_${Date.now()}`,
              type: 'sync_error',
              description: `동기화 오류 패턴: ${errorType} - ${count}회 발생`,
              frequency: count,
              impact: count > 20 ? 'high' : 'medium',
              examples: [{ errorType, count }],
              suggestedAction: {
                type: 'skip_processing',
                params: { errorType, retryConfig: { maxRetries: 5, baseDelayMs: 5000 } },
              },
            });
          }
        }
      }

      if (syncMetrics.averageProcessingTimeMs > 30000) {
        patterns.push({
          id: `sync_perf_${Date.now()}`,
          type: 'performance_bottleneck',
          description: `동기화 평균 처리 시간 과다: ${syncMetrics.averageProcessingTimeMs}ms`,
          frequency: 1,
          impact: 'high',
          examples: [{ avgTime: syncMetrics.averageProcessingTimeMs }],
          suggestedAction: {
            type: 'modify_weight',
            params: { batchSize: 'reduce', parallelism: 'increase' },
          },
        });
      }

    } catch (error) {
      syncLogger.error({ error }, '동기화 패턴 분석 실패');
    }

    return patterns;
  }

  private async analyzePerformancePatterns(): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    
    try {
      const systemMetrics = await statisticService.getSystemMetrics();
      
      if (systemMetrics.memoryUsage > 85) {
        patterns.push({
          id: `perf_memory_${Date.now()}`,
          type: 'performance_bottleneck',
          description: `메모리 사용률 높음: ${systemMetrics.memoryUsage}%`,
          frequency: 1,
          impact: 'high',
          examples: [{ memoryUsage: systemMetrics.memoryUsage }],
          suggestedAction: {
            type: 'modify_weight',
            params: { batchSize: 'reduce', gcInterval: 'decrease' },
          },
        });
      }

      if (systemMetrics.cpuUsage > 80) {
        patterns.push({
          id: `perf_cpu_${Date.now()}`,
          type: 'performance_bottleneck',
          description: `CPU 사용률 높음: ${systemMetrics.cpuUsage}%`,
          frequency: 1,
          impact: 'high',
          examples: [{ cpuUsage: systemMetrics.cpuUsage }],
          suggestedAction: {
            type: 'modify_weight',
            params: { parallelism: 'adjust' },
          },
        });
      }

    } catch (error) {
      syncLogger.error({ error }, '성능 패턴 분석 실패');
    }

    return patterns;
  }

  private async getRecentValidationErrors(): Promise<ValidationError[]> {
    const key = 'validation:errors:recent';
    const items = await redis.lrange(key, 0, 999);
    const errors: ValidationError[] = [];
    
    for (const itemStr of items) {
      try {
        errors.push(JSON.parse(itemStr));
      } catch {
        continue;
      }
    }
    
    return errors;
  }

  private getValidationSuggestion(code: string): string {
    const suggestions: Record<string, string> = {
      'too_small': '최소 길이/값 제한 완화 검토',
      'too_big': '최대 길이/값 제한 강화 검토',
      'invalid_string': '정규식 패턴 수정 필요',
      'invalid_type': '타입 변환 로직 추가 필요',
      'INVALID_PHONE_FORMAT': '전화번호 정규식 패턴 확장',
      'DUPLICATE_ADDRESS': '주소 중복 체크 로직 개선',
      'LATITUDE_OUT_OF_KOREA': '좌표 범위 검증 완화',
      'LONGITUDE_OUT_OF_KOREA': '좌표 범위 검증 완화',
    };
    return suggestions[code] || '검증 규칙 검토 필요';
  }

  private generateRecommendations(patterns: DetectedPattern[]): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    const highImpactPatterns = patterns.filter(p => p.impact === 'high');
    
    for (const pattern of highImpactPatterns) {
      const rec = this.createRecommendationFromPattern(pattern, 'high');
      if (rec) recommendations.push(rec);
    }

    const mediumPatterns = patterns.filter(p => p.impact === 'medium');
    for (const pattern of mediumPatterns.slice(0, 5)) {
      const rec = this.createRecommendationFromPattern(pattern, 'medium');
      if (rec) recommendations.push(rec);
    }

    const typeGroups = new Map<string, DetectedPattern[]>();
    for (const pattern of patterns) {
      const group = typeGroups.get(pattern.type) || [];
      group.push(pattern);
      typeGroups.set(pattern.type, group);
    }

    for (const [type, typePatterns] of typeGroups.entries()) {
      if (typePatterns.length >= 3) {
        recommendations.push({
          id: `rec_group_${type}_${Date.now()}`,
          title: `${type} 관련 패턴 다수 발견`,
          description: `${typePatterns.length}개의 ${type} 패턴이 발견되었습니다. 종합적인 검토가 필요합니다.`,
          type: type as Recommendation['type'],
          priority: 'medium',
          estimatedImpact: '중간',
          implementationEffort: 'medium',
          action: {
            type: 'alert',
            params: { patterns: typePatterns.map(p => p.id) },
          },
        });
      }
    }

    return recommendations.slice(0, 20);
  }

  private createRecommendationFromPattern(pattern: DetectedPattern, priority: 'high' | 'medium'): Recommendation | null {
    const typeMap: Record<DetectedPattern['type'], Recommendation['type']> = {
      'duplicate_field': 'threshold',
      'validation_failure': 'validation',
      'sync_error': 'workflow',
      'performance_bottleneck': 'performance',
    };

    const effortMap: Record<string, 'low' | 'medium' | 'high'> = {
      'adjust_threshold': 'low',
      'add_validation': 'medium',
      'modify_weight': 'medium',
      'alert': 'low',
      'auto_merge': 'high',
      'skip_processing': 'medium',
    };

    return {
      id: `rec_${pattern.id}`,
      title: pattern.description,
      description: `${pattern.frequency}회 발생 (영향도: ${pattern.impact}). ${pattern.suggestedAction.type} 조치 권장.`,
      type: typeMap[pattern.type],
      priority,
      estimatedImpact: pattern.impact === 'high' ? '높음' : '중간',
      implementationEffort: effortMap[pattern.suggestedAction.type] || 'medium',
      action: pattern.suggestedAction,
    };
  }

  private calculateOverallConfidence(patterns: DetectedPattern[]): number {
    if (patterns.length === 0) return 0;
    
    const totalFrequency = patterns.reduce((sum, p) => sum + p.frequency, 0);
    const avgFrequency = totalFrequency / patterns.length;
    const highImpactRatio = patterns.filter(p => p.impact === 'high').length / patterns.length;
    
    return Math.min(0.95, (avgFrequency / 100) * 0.5 + highImpactRatio * 0.5);
  }

  async createRule(rule: Omit<ImprovementRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ImprovementRule> {
    const newRule: ImprovementRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rules.set(newRule.id, newRule);
    await this.saveRules();
    
    syncLogger.info({ ruleId: newRule.id, name: newRule.name }, '개선 규칙 생성');
    return newRule;
  }

  async updateRule(ruleId: string, updates: Partial<ImprovementRule>): Promise<ImprovementRule | null> {
    const rule = this.rules.get(ruleId);
    if (!rule) return null;

    const updatedRule = { ...rule, ...updates, updatedAt: new Date() };
    this.rules.set(ruleId, updatedRule);
    await this.saveRules();

    syncLogger.info({ ruleId }, '개선 규칙 업데이트');
    return updatedRule;
  }

  async deleteRule(ruleId: string): Promise<boolean> {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      await this.saveRules();
      syncLogger.info({ ruleId }, '개선 규칙 삭제');
    }
    return deleted;
  }

  async getRule(ruleId: string): Promise<ImprovementRule | undefined> {
    return this.rules.get(ruleId);
  }

  async getAllRules(): Promise<ImprovementRule[]> {
    return Array.from(this.rules.values()).sort((a, b) => b.priority - a.priority);
  }

  async getEnabledRules(): Promise<ImprovementRule[]> {
    return Array.from(this.rules.values())
      .filter(r => r.enabled)
      .sort((a, b) => b.priority - a.priority);
  }

  async evaluateRules(context: Record<string, unknown>): Promise<RuleTriggerResult[]> {
    const results: RuleTriggerResult[] = [];
    const enabledRules = await this.getEnabledRules();

    for (const rule of enabledRules) {
      try {
        const triggered = this.evaluateCondition(rule.condition, context);
        
        if (triggered) {
          const actionTaken = await this.executeAction(rule.action, context);
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            triggered: true,
            actionTaken,
          });
        } else {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            triggered: false,
            reason: '조건 불일치',
          });
        }
      } catch (error) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          triggered: false,
          reason: `평가 오류: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }

    return results;
  }

  private evaluateCondition(condition: string, context: Record<string, unknown>): boolean {
    try {
      const func = new Function('context', `with(context) { return ${condition}; }`);
      return Boolean(func(context));
    } catch {
      return false;
    }
  }

  private async executeAction(action: RuleAction, context: Record<string, unknown>): Promise<string> {
    switch (action.type) {
      case 'alert':
        await eventPublisher.publishError(
          '자동화 규칙 알림',
          `규칙 실행: ${action.params.message || '자동화 액션 트리거'}`,
          (action.params.severity as 'low' | 'medium' | 'high' | 'critical') || 'medium',
          action.params
        );
        return '알림 발송됨';

      case 'adjust_threshold':
        syncLogger.info({ action: action.params }, '임계값 조정 권장 (수동 적용 필요)');
        return '임계값 조정 권장 로그 기록';

      case 'add_validation':
        validationService.addCustomRule(
          `auto_${action.params.field}_${Date.now()}`,
          (data) => {
            const input = data as Record<string, unknown>;
            const value = input[action.params.field as string];
            const errors: ValidationError[] = [];
            if (value && !this.validateByCode(value, action.params.code as string)) {
              errors.push({
                field: action.params.field as string,
                message: action.params.suggestion as string || '자동 생성된 검증 규칙',
                code: 'AUTO_VALIDATION',
                value,
              });
            }
            return errors;
          }
        );
        return '자동 검증 규칙 추가됨';

      case 'auto_merge':
        syncLogger.info({ action: action.params }, '자동 병합 규칙 적용 권장');
        return '자동 병합 규칙 권장 로그 기록';

      default:
        return '알 수 없는 액션';
    }
  }

  private validateByCode(value: unknown, code: string): boolean {
    switch (code) {
      case 'too_small':
        return typeof value === 'string' ? value.length >= 1 : typeof value === 'number' ? value >= 0 : true;
      case 'too_big':
        return typeof value === 'string' ? value.length <= 200 : typeof value === 'number' ? value <= 1000000 : true;
      case 'invalid_string':
        return typeof value === 'string';
      default:
        return true;
    }
  }

  async recordValidationError(error: ValidationError): Promise<void> {
    const key = 'validation:errors:recent';
    await redis.lpush(key, JSON.stringify(error));
    await redis.ltrim(key, 0, 999);
    await redis.expire(key, 86400 * 7);
  }

  async getPatterns(limit: number = 50): Promise<DetectedPattern[]> {
    const items = await redis.lrange(PATTERNS_KEY, 0, limit - 1);
    const patterns: DetectedPattern[] = [];
    
    for (const itemStr of items) {
      try {
        const pattern = JSON.parse(itemStr) as DetectedPattern;
        pattern.id = pattern.id;
        patterns.push(pattern);
      } catch {
        continue;
      }
    }
    
    return patterns;
  }

  private async savePatterns(patterns: DetectedPattern[]): Promise<void> {
    for (const pattern of patterns) {
      await redis.lpush(PATTERNS_KEY, JSON.stringify(pattern));
    }
    await redis.ltrim(PATTERNS_KEY, 0, 499);
    await redis.expire(PATTERNS_KEY, 86400 * 30);
  }

  private async loadRules(): Promise<void> {
    const data = await redis.get(RULES_KEY);
    if (data) {
      try {
        const rules = JSON.parse(data) as ImprovementRule[];
        for (const rule of rules) {
          rule.createdAt = new Date(rule.createdAt);
          rule.updatedAt = new Date(rule.updatedAt);
          this.rules.set(rule.id, rule);
        }
      } catch {
        syncLogger.warn('규칙 로드 실패, 기본값 사용');
      }
    }
  }

  private async saveRules(): Promise<void> {
    const rules = Array.from(this.rules.values());
    await redis.set(RULES_KEY, JSON.stringify(rules));
  }

  private async acquireAnalysisLock(): Promise<boolean> {
    const result = await redis.set(ANALYSIS_LOCK_KEY, '1', 'EX', 3600, 'NX');
    return result === 'OK';
  }

  private async releaseAnalysisLock(): Promise<void> {
    await redis.del(ANALYSIS_LOCK_KEY);
  }

  getConfig(): AutomationConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<AutomationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getLastAnalysisTime(): Date | null {
    return this.lastAnalysisTime;
  }

  isAnalysisRunning(): boolean {
    return this.isAnalyzing;
  }
}

export const automationService = new AutomationService();

automationService.updateConfig({
  analysisIntervalHours: 12,
  minPatternFrequency: 3,
  confidenceThreshold: 0.65,
  autoApplyRules: false,
  maxRulesPerType: 15,
});