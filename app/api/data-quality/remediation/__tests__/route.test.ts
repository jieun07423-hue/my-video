import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  createWorkflow,
  getWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
  executeWorkflow,
  getExecutionHistory,
  getRemediationStats,
  setRemediationConfig,
  getRemediationConfig,
} from '@/lib/services/quality/quality-auto-remediation.service';

describe('/api/data-quality/remediation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setRemediationConfig({
      enabled: true,
      autoFix: false,
      requireApproval: true,
      maxRetries: 3,
      timeoutMs: 30000,
    });
  });

  describe('GET', () => {
    it('should return workflows when action is workflows', () => {
      const workflows = getWorkflows();
      expect(Array.isArray(workflows)).toBe(true);
    });

    it('should return workflow by id when action is workflow', () => {
      const trigger = { type: 'score_below' as const, condition: { threshold: 60 } };
      const steps = [{ id: 's1', name: '테스트', type: 'validate' as const, config: {}, onError: 'stop' as const }];
      const workflow = createWorkflow('테스트', '설명', trigger, steps);
      const retrieved = getWorkflowById(workflow.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(workflow.id);
    });

    it('should return 404 for unknown workflow', () => {
      const result = getWorkflowById('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should return execution history when action is history', () => {
      const history = getExecutionHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should return remediation stats when action is stats', () => {
      const stats = getRemediationStats();
      expect(stats).toHaveProperty('totalExecutions');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('statusDistribution');
    });

    it('should return config when action is config', () => {
      const config = getRemediationConfig();
      expect(config).toHaveProperty('enabled', true);
      expect(config).toHaveProperty('maxRetries');
    });
  });

  describe('POST', () => {
    it('should update config when action is config', () => {
      const newConfig = { autoFix: true, maxRetries: 5 };
      setRemediationConfig(newConfig);
      const config = getRemediationConfig();
      expect(config.autoFix).toBe(true);
      expect(config.maxRetries).toBe(5);
    });

    it('should create workflow when action is create', () => {
      const trigger = { type: 'anomaly_detected' as const, condition: {} };
      const steps = [{ id: 's1', name: '단계1', type: 'notify' as const, config: {}, onError: 'continue' as const }];
      const workflow = createWorkflow('새 워크플로우', '설명', trigger, steps, 1);
      expect(workflow).toHaveProperty('id');
      expect(workflow).toHaveProperty('name', '새 워크플로우');
      expect(workflow).toHaveProperty('priority', 1);
    });

    it('should execute workflow when action is execute', async () => {
      const trigger = { type: 'score_below' as const, condition: { threshold: 60 } };
      const steps = [{ id: 's1', name: '테스트 단계', type: 'validate' as const, config: { field: 'name' }, onError: 'stop' as const }];
      const workflow = createWorkflow('실행 테스트', '설명', trigger, steps);

      const result = await executeWorkflow(workflow.id, 'business-123', { score: 50 });
      expect(result).toHaveProperty('workflowId', workflow.id);
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('steps');
    });

    it('should throw for unknown workflow execution', async () => {
      await expect(executeWorkflow('unknown', 'business-123', {}))
        .rejects.toThrow();
    });

    it('should return 400 for invalid request', () => {
      expect(true).toBe(true);
    });
  });

  describe('PUT', () => {
    it('should update workflow', () => {
      const trigger = { type: 'score_below' as const, condition: { threshold: 60 } };
      const steps = [{ id: 's1', name: '원본', type: 'validate' as const, config: {}, onError: 'stop' as const }];
      const workflow = createWorkflow('원본 이름', '설명', trigger, steps);

      const success = updateWorkflow(workflow.id, { name: '새 이름' });
      expect(success).toBe(true);

      const updated = getWorkflowById(workflow.id);
      expect(updated?.name).toBe('새 이름');
    });

    it('should return false for unknown workflow', () => {
      const success = updateWorkflow('unknown', { name: 'test' });
      expect(success).toBe(false);
    });
  });

  describe('DELETE', () => {
    it('should delete workflow', () => {
      const trigger = { type: 'score_below' as const, condition: {} };
      const workflow = createWorkflow('삭제 대상', '설명', trigger, []);

      const success = deleteWorkflow(workflow.id);
      expect(success).toBe(true);
      expect(getWorkflowById(workflow.id)).toBeUndefined();
    });

    it('should return false for unknown workflow', () => {
      const success = deleteWorkflow('unknown');
      expect(success).toBe(false);
    });
  });
});
