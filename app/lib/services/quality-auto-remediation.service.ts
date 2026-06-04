import { dbLogger } from '@/lib/logger';

export interface RemediationConfig {
  enabled: boolean;
  autoFix: boolean;
  requireApproval: boolean;
  maxRetries: number;
  timeoutMs: number;
}

export interface RemediationWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: RemediationStep[];
  enabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTrigger {
  type: 'score_below' | 'anomaly_detected' | 'rule_violated' | 'threshold_breached';
  condition: Record<string, any>;
}

export interface RemediationStep {
  id: string;
  name: string;
  type: 'validate' | 'transform' | 'notify' | 'escalate' | 'custom';
  config: Record<string, any>;
  onError: 'stop' | 'continue' | 'retry';
}

export interface RemediationExecution {
  id: string;
  workflowId: string;
  businessId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  triggeredBy: string;
  steps: StepExecution[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface StepExecution {
  stepId: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input: any;
  output: any;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

const defaultConfig: RemediationConfig = {
  enabled: true,
  autoFix: false,
  requireApproval: true,
  maxRetries: 3,
  timeoutMs: 30000,
};

const workflows: RemediationWorkflow[] = [];
const executions: RemediationExecution[] = [];
const MAX_HISTORY_SIZE = 5000;

export function setRemediationConfig(config: Partial<RemediationConfig>): void {
  Object.assign(defaultConfig, config);
  dbLogger.debug({ config: defaultConfig }, '치료 설정 업데이트');
}

export function getRemediationConfig(): RemediationConfig {
  return { ...defaultConfig };
}

export function createWorkflow(
  name: string,
  description: string,
  trigger: WorkflowTrigger,
  steps: RemediationStep[],
  priority: number = 0
): RemediationWorkflow {
  const workflow: RemediationWorkflow = {
    id: `wf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    trigger,
    steps,
    enabled: true,
    priority,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  workflows.push(workflow);
  dbLogger.debug({ workflowId: workflow.id, name }, '워크플로우 생성 완료');
  return workflow;
}

export function getWorkflows(): RemediationWorkflow[] {
  return [...workflows];
}

export function getWorkflowById(workflowId: string): RemediationWorkflow | undefined {
  return workflows.find(w => w.id === workflowId);
}

export function updateWorkflow(workflowId: string, updates: Partial<RemediationWorkflow>): boolean {
  const index = workflows.findIndex(w => w.id === workflowId);
  if (index < 0) return false;

  workflows[index] = {
    ...workflows[index],
    ...updates,
    updatedAt: new Date(),
  };
  return true;
}

export function deleteWorkflow(workflowId: string): boolean {
  const index = workflows.findIndex(w => w.id === workflowId);
  if (index < 0) return false;

  workflows.splice(index, 1);
  return true;
}

export function matchTrigger(
  trigger: WorkflowTrigger,
  eventData: Record<string, any>
): boolean {
  switch (trigger.type) {
    case 'score_below':
      return typeof eventData.score === 'number' && eventData.score < (trigger.condition.threshold || 60);
    case 'anomaly_detected':
      return typeof eventData.anomalyCount === 'number' && eventData.anomalyCount > 0;
    case 'rule_violated':
      return typeof eventData.violationCount === 'number' && eventData.violationCount > 0;
    case 'threshold_breached':
      return typeof eventData.value === 'number' && eventData.value > (trigger.condition.max || Infinity);
    default:
      return false;
  }
}

export function findMatchingWorkflows(eventData: Record<string, any>): RemediationWorkflow[] {
  return workflows
    .filter(w => w.enabled && matchTrigger(w.trigger, eventData))
    .sort((a, b) => b.priority - a.priority);
}

export async function executeWorkflow(
  workflowId: string,
  businessId: string,
  eventData: Record<string, any>
): Promise<RemediationExecution> {
  const workflow = getWorkflowById(workflowId);
  if (!workflow) {
    throw new Error(`워크플로우 '${workflowId}'를 찾을 수 없습니다`);
  }

  const execution: RemediationExecution = {
    id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    workflowId,
    businessId,
    status: 'running',
    triggeredBy: JSON.stringify(eventData),
    steps: workflow.steps.map(step => ({
      stepId: step.id,
      name: step.name,
      status: 'pending',
      input: eventData,
      output: null,
      startedAt: new Date(),
    })),
    startedAt: new Date(),
  };

  executions.push(execution);
  if (executions.length > MAX_HISTORY_SIZE) {
    executions.splice(0, executions.length - MAX_HISTORY_SIZE);
  }

  try {
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      const stepExec = execution.steps[i];

      stepExec.status = 'running';
      stepExec.startedAt = new Date();

      try {
        const result = await executeStep(step, eventData, businessId);
        stepExec.output = result;
        stepExec.status = 'completed';
        stepExec.completedAt = new Date();
      } catch (error) {
        stepExec.error = error instanceof Error ? error.message : String(error);
        stepExec.status = 'failed';
        stepExec.completedAt = new Date();

        if (step.onError === 'stop') {
          execution.status = 'failed';
          execution.error = `단계 '${step.name}' 실패: ${stepExec.error}`;
          execution.completedAt = new Date();
          return execution;
        }
        if (step.onError === 'retry') {
          for (let retry = 0; retry < defaultConfig.maxRetries; retry++) {
            try {
              const retryResult = await executeStep(step, eventData, businessId);
              stepExec.output = retryResult;
              stepExec.status = 'completed';
              stepExec.error = undefined;
              break;
            } catch (retryError) {
              if (retry === defaultConfig.maxRetries - 1) {
                stepExec.error = retryError instanceof Error ? retryError.message : String(retryError);
              }
            }
          }
        }
      }
    }

    execution.status = 'completed';
    execution.completedAt = new Date();
  } catch (error) {
    execution.status = 'failed';
    execution.error = error instanceof Error ? error.message : String(error);
    execution.completedAt = new Date();
  }

  dbLogger.debug({
    executionId: execution.id,
    workflowId,
    businessId,
    status: execution.status,
  }, '워크플로우 실행 완료');

  return execution;
}

async function executeStep(
  step: RemediationStep,
  data: Record<string, any>,
  businessId: string
): Promise<any> {
  switch (step.type) {
    case 'validate':
      return { validated: true, field: step.config.field, value: data[step.config.field] };
    case 'transform':
      return { transformed: true, field: step.config.field, newValue: step.config.newValue };
    case 'notify':
      return { notified: true, channel: step.config.channel, message: step.config.message };
    case 'escalate':
      return { escalated: true, level: step.config.level, recipient: step.config.recipient };
    case 'custom':
      return { custom: true, action: step.config.action };
    default:
      return { skipped: true, reason: `알 수 없는 단계 유형: ${step.type}` };
  }
}

export function getExecutionHistory(
  workflowId?: string,
  limit: number = 100
): RemediationExecution[] {
  let history = [...executions];
  if (workflowId) {
    history = history.filter(h => h.workflowId === workflowId);
  }
  return history.slice(-limit);
}

export function getRemediationStats(): {
  totalExecutions: number;
  successRate: number;
  statusDistribution: Record<string, number>;
  workflowFrequency: Record<string, number>;
} {
  const totalExecutions = executions.length;
  const successCount = executions.filter(e => e.status === 'completed').length;
  const successRate = totalExecutions > 0 ? successCount / totalExecutions : 0;

  const statusDistribution: Record<string, number> = {};
  const workflowFrequency: Record<string, number> = {};

  for (const exec of executions) {
    statusDistribution[exec.status] = (statusDistribution[exec.status] || 0) + 1;
    workflowFrequency[exec.workflowId] = (workflowFrequency[exec.workflowId] || 0) + 1;
  }

  return {
    totalExecutions,
    successRate: Math.round(successRate * 100) / 100,
    statusDistribution,
    workflowFrequency,
  };
}

export function generateRemediationReport(execution: RemediationExecution): string {
  const lines = [
    '# 자동 치료 실행 리포트',
    '',
    `## 기본 정보`,
    `- 실행 ID: ${execution.id}`,
    `- 워크플로우 ID: ${execution.workflowId}`,
    `- 사업체 ID: ${execution.businessId}`,
    `- 상태: ${execution.status}`,
    `- 시작 시간: ${execution.startedAt.toLocaleString('ko-KR')}`,
    `- 완료 시간: ${execution.completedAt?.toLocaleString('ko-KR') || '미완료'}`,
    '',
  ];

  if (execution.error) {
    lines.push(`## 오류`);
    lines.push(`- ${execution.error}`);
    lines.push('');
  }

  lines.push('## 단계별 실행 결과');
  for (const step of execution.steps) {
    lines.push(`### ${step.name}`);
    lines.push(`- 상태: ${step.status}`);
    lines.push(`- 시작: ${step.startedAt.toLocaleString('ko-KR')}`);
    lines.push(`- 완료: ${step.completedAt?.toLocaleString('ko-KR') || '미완료'}`);
    if (step.error) lines.push(`- 오류: ${step.error}`);
    lines.push('');
  }

  return lines.join('\n');
}
