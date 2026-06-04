import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createPolicy,
  updatePolicy,
  deletePolicy,
  getPolicies,
  getPolicy,
  checkCompliance,
  generateComplianceReport,
  logAudit,
  getAuditLogs,
  getDefaultPolicies,
  initializeDefaultPolicies,
  generateGovernanceReport,
} from '../quality-governance.service';

describe('QualityGovernanceService', () => {
  beforeEach(() => {
    const policies = getPolicies();
    for (const p of policies) {
      deletePolicy(p.id);
    }
  });

  describe('createPolicy', () => {
    it('should create a policy', () => {
      const rules = [
        { name: '필수 필드', field: 'name', condition: 'required' as const, parameters: {}, message: '이름은 필수입니다', severity: 'high' as const },
      ];
      const policy = createPolicy('테스트 정책', '테스트용 정책입니다', rules, 'high');

      expect(policy).toHaveProperty('id');
      expect(policy.name).toBe('테스트 정책');
      expect(policy.description).toBe('테스트용 정책입니다');
      expect(policy.severity).toBe('high');
      expect(policy.enabled).toBe(true);
      expect(policy.rules.length).toBe(1);
      expect(policy.rules[0].name).toBe('필수 필드');
      expect(policy.rules[0].enabled).toBe(true);
    });
  });

  describe('updatePolicy', () => {
    it('should update a policy', () => {
      const rules = [
        { name: '규칙', field: 'phone', condition: 'format' as const, parameters: {}, message: '전화번호 형식 오류', severity: 'medium' as const },
      ];
      const policy = createPolicy('업데이트 테스트', '설명', rules);

      const updated = updatePolicy(policy.id, { name: '변경된 정책' });
      expect(updated).toBe(true);

      const found = getPolicy(policy.id);
      expect(found?.name).toBe('변경된 정책');
    });

    it('should return false for non-existent policy', () => {
      const updated = updatePolicy('non-existent', { name: 'test' });
      expect(updated).toBe(false);
    });
  });

  describe('deletePolicy', () => {
    it('should delete a policy', () => {
      const rules = [
        { name: '규칙', field: 'name', condition: 'required' as const, parameters: {}, message: '필수 필드', severity: 'medium' as const },
      ];
      const policy = createPolicy('삭제 테스트', '설명', rules);

      const deleted = deletePolicy(policy.id);
      expect(deleted).toBe(true);
      expect(getPolicy(policy.id)).toBeUndefined();
    });
  });

  describe('checkCompliance', () => {
    it('should check compliance and return result', () => {
      const rules = [
        { name: '이름 필수', field: 'name', condition: 'required' as const, parameters: {}, message: '이름은 필수입니다', severity: 'high' as const },
      ];
      const policy = createPolicy('컴플라이언스 테스트', '설명', rules);

      const business = { name: '테스트 사업자', phone: '02-1234-5678' };
      const result = checkCompliance(business, policy.id);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('policyId');
      expect(result).toHaveProperty('businessId');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('checkedAt');
      expect(result.status).toBe('passed');
      expect(result.violations.length).toBe(0);
    });

    it('should detect violations', () => {
      const rules = [
        { name: '이름 필수', field: 'name', condition: 'required' as const, parameters: {}, message: '이름은 필수입니다', severity: 'critical' as const },
      ];
      const policy = createPolicy('위반 테스트', '설명', rules);

      const business = { phone: '02-1234-5678' };
      const result = checkCompliance(business, policy.id);

      expect(result.status).toBe('failed');
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].ruleName).toBe('이름 필수');
    });

    it('should throw for non-existent policy', () => {
      const business = { name: 'test' };
      expect(() => checkCompliance(business, 'non-existent')).toThrow();
    });
  });

  describe('initializeDefaultPolicies', () => {
    it('should initialize default policies', () => {
      const policies = initializeDefaultPolicies();
      expect(Array.isArray(policies)).toBe(true);
      expect(policies.length).toBeGreaterThan(0);
      policies.forEach(p => {
        expect(p).toHaveProperty('id');
        expect(p).toHaveProperty('name');
        expect(p).toHaveProperty('rules');
        expect(p.rules.length).toBeGreaterThan(0);
      });
    });
  });

  describe('generateGovernanceReport', () => {
    it('should generate governance report as string', () => {
      const report = generateGovernanceReport();
      expect(typeof report).toBe('string');
      expect(report).toContain('데이터 품질 거버넌스 리포트');
    });
  });

  describe('logAudit', () => {
    it('should log audit entries', () => {
      logAudit('test_action', 'test_target', { detail: 'test' });
      const logs = getAuditLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[logs.length - 1].action).toBe('test_action');
      expect(logs[logs.length - 1].target).toBe('test_target');
    });
  });
});
