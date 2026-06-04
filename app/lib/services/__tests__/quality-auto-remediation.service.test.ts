import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createWorkflow,
  getWorkflowById,
  getWorkflows,
  executeWorkflow,
  getExecutionHistory,
  getRemediationStats,
} from '../quality-auto-remediation.service';

describe('QualityAutoRemediationService', () => {
  describe('workflow management', () => {
    it('should create remediation workflow', () => {
      const workflow = createWorkflow(
        '중복 데이터 정리',
        '중복된 사업자 데이터를 자동으로 정리합니다',
        { type: 'manual' },
        [
          { id: 'step1', name: '중복 탐지', type: 'validate', config: { field: 'duplicates' }, onError: 'stop' },
          { id: 'step2', name: '데이터 정리', type: 'transform', config: { field: 'data', newValue: 'cleaned' }, onError: 'stop' },
        ]
      );

      expect(workflow).toHaveProperty('id');
      expect(workflow).toHaveProperty('name', '중복 데이터 정리');
      expect(workflow).toHaveProperty('enabled', true);
      expect(workflow).toHaveProperty('steps');
      expect(workflow.steps).toHaveLength(2);
    });

    it('should retrieve workflow by id', () => {
      const created = createWorkflow(
        '테스트 워크플로우',
        '테스트',
        { type: 'manual' },
        []
      );

      const retrieved = getWorkflowById(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return undefined for unknown workflow', () => {
      const retrieved = getWorkflowById('nonexistent-id');
      expect(retrieved).toBeUndefined();
    });

    it('should list all workflows', () => {
      const all = getWorkflows();
      expect(Array.isArray(all)).toBe(true);
    });
  });

  describe('workflow execution', () => {
    it('should execute workflow', async () => {
      const workflow = createWorkflow(
        '실행 테스트',
        '테스트',
        { type: 'manual' },
        [
          { id: 's1', name: '테스트 단계', type: 'validate', config: { field: 'test' }, onError: 'stop' },
        ]
      );

      const result = await executeWorkflow(workflow.id, 'business-123', { score: 50 });
      expect(result).toHaveProperty('workflowId', workflow.id);
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('startedAt');
      expect(['completed', 'failed']).toContain(result.status);
    });

    it('should fail for unknown workflow', async () => {
      await expect(executeWorkflow('unknown', 'biz-1', {}))
        .rejects.toThrow('를 찾을 수 없습니다');
    });
  });

  describe('history and stats', () => {
    it('should record execution history', async () => {
      const workflow = createWorkflow(
        '이력 테스트',
        '테스트',
        { type: 'manual' },
        []
      );

      await executeWorkflow(workflow.id, 'business-456', { score: 70 });

      const history = getExecutionHistory(workflow.id);
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should return remediation stats', () => {
      const stats = getRemediationStats();
      expect(stats).toHaveProperty('totalExecutions');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('statusDistribution');
      expect(stats).toHaveProperty('workflowFrequency');
      expect(typeof stats.totalExecutions).toBe('number');
      expect(typeof stats.successRate).toBe('number');
      expect(typeof stats.statusDistribution).toBe('object');
      expect(typeof stats.workflowFrequency).toBe('object');
    });
  });
});
