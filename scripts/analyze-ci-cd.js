#!/usr/bin/env node

/**
 * CI/CD 워크플로우 분석 및 개선 제안
 */

const fs = require('fs');
const path = require('path');

class CIAnalyzer {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.workflowsDir = path.join(this.projectRoot, '.github', 'workflows');
    this.packageJson = this.loadPackageJson();
    this.currentWorkflows = this.analyzeCurrentWorkflows();
  }

  loadPackageJson() {
    const packagePath = path.join(this.projectRoot, 'package.json');
    return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  }

  analyzeCurrentWorkflows() {
    const workflows = {};
    
    try {
      const files = fs.readdirSync(this.workflowsDir);
      
      files.forEach(file => {
        if (file.endsWith('.yml') || file.endsWith('.yaml')) {
          const filePath = path.join(this.workflowsDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          workflows[file] = this.parseWorkflow(content, file);
        }
      });
      
      return workflows;
    } catch (error) {
      console.error('워크플로우 분석 실패:', error.message);
      return {};
    }
  }

  parseWorkflow(content, filename) {
    const lines = content.split('\n');
    const workflow = {
      name: filename,
      triggers: [],
      jobs: [],
      steps: [],
      issues: []
    };

    let inJob = false;
    let currentJob = null;

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // 트리거 분석
      if (trimmedLine.startsWith('on:')) {
        const triggers = trimmedLine.replace('on:', '').trim();
        workflow.triggers = triggers.split(',').map(t => t.trim());
      }
      
      // 잡 분석
      if (trimmedLine.startsWith('  ') && !trimmedLine.startsWith('    ')) {
        if (trimmedLine.includes('name:')) {
          currentJob = {
            name: trimmedLine.match(/name:\s*(.+)/)[1],
            steps: []
          };
          workflow.jobs.push(currentJob);
          inJob = true;
        }
      }
      
      // 스텝 분석
      if (inJob && trimmedLine.startsWith('      - name:')) {
        if (currentJob) {
          currentJob.steps.push({
            type: 'action' || trimmedLine.includes('uses:') ? 'uses' : 'run',
            description: trimmedLine.match(/name:\s*(.+)/)[1],
            line: index + 1
          });
        }
      }

      // 잠재적 문제 탐지
      if (this.detectIssue(trimmedLine)) {
        workflow.issues.push({
          line: index + 1,
          issue: this.detectIssue(trimmedLine),
          description: trimmedLine
        });
      }
    });

    return workflow;
  }

  detectIssue(line) {
    const issues = [
      {
        pattern: /hardcoded.*password|secret|token/i,
        type: 'security',
        severity: 'high',
        description: '하드코딩된 민감 정보'
      },
      {
        pattern: /DATABASE_URL|NEXTAUTH_SECRET|SUPABASE.*KEY/i,
        type: 'security',
        severity: 'high',
        description: '환경변수 노출'
      },
      {
        pattern: /npm run build.*&/i,
        type: 'syntax',
        severity: 'medium',
        description: '잘못된 명령어 연결'
      },
      {
        pattern: /sudo|rm\s+-rf/i,
        type: 'dangerous',
        severity: 'high',
        description: '위험한 명령어 사용'
      },
      {
        pattern: /-\s*password\s*|\s*\|/,
        type: 'security',
        severity: 'medium',
        description: '쉘에서 비밀번호 전달'
      },
      {
        pattern: /curl.*-d.*password/i,
        type: 'security',
        severity: 'medium',
        description: 'cURL로 비밀번호 전달'
      }
    ];

    for (const issue of issues) {
      if (issue.pattern.test(line)) {
        return issue;
      }
    }
    
    return null;
  }

  analyzeDependencies() {
    const deps = this.packageJson.dependencies || {};
    const devDeps = this.packageJson.devDependencies || {};
    
    return {
      outdated: this.findOutdatedDependencies(),
      vulnerable: this.findVulnerableDependencies(),
      redundant: this.findRedundantDependencies(deps, devDeps),
      heavy: this.findHeavyDependencies(deps)
    };
  }

  findOutdatedDependencies() {
    // 주요 패키지들의 버전 체크
    const currentVersions = {
      'next': this.packageJson.dependencies?.next,
      'react': this.packageJson.dependencies?.react,
      'typescript': this.packageJson.devDependencies?.typescript,
      '@tanstack/react-query': this.packageJson.dependencies?.['@tanstack/react-query']
    };

    const latestVersions = {
      'next': '14.2.35',
      'react': '18.3.1',
      'typescript': '5.6.3',
      '@tanstack/react-query': '5.90.19'
    };

    const outdated = [];
    
    for (const [pkg, current] of Object.entries(currentVersions)) {
      const latest = latestVersions[pkg];
      if (current && latest && current !== latest) {
        outdated.push({
          package: pkg,
          current: current,
          latest: latest,
          severity: this.getSeverityForVersionDiff(current, latest)
        });
      }
    }

    return outdated;
  }

  getSeverityForVersionDiff(current, latest) {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);
    
    if (currentParts[0] < latestParts[0] - 1) {
      return 'high';
    } else if (currentParts[0] < latestParts[0]) {
      return 'medium';
    }
    
    return 'low';
  }

  findVulnerableDependencies() {
    // 실제로는 npm audit를 실행해야 하지만, 주요 패키지들의 알려진 취약점
    const vulnerablePackages = [
      {
        name: 'axios',
        version: '<1.6.0',
        issue: 'Prototype Pollution',
        severity: 'high'
      },
      {
        name: 'react-router-dom',
        version: '<6.8.0',
        issue: 'XSS vulnerabilities',
        severity: 'medium'
      }
    ];

    return vulnerablePackages.filter(pkg => {
      const currentVersion = this.packageJson.dependencies?.[pkg.name];
      return currentVersion && this.isVersionLessThan(currentVersion, pkg.version);
    });
  }

  isVersionLessThan(version1, version2) {
    const v1 = version1.split('.').map(Number);
    const v2 = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const part1 = v1[i] || 0;
      const part2 = v2[i] || 0;
      
      if (part1 < part2) return true;
      if (part1 > part2) return false;
    }
    
    return false;
  }

  findRedundantDependencies(deps, devDeps) {
    // 중복 의존성 체크
    const allDeps = { ...deps, ...devDeps };
    const redundant = [];
    
    // 날짜 관련 라이브러리
    const dateLibs = ['date-fns', 'moment', 'dayjs', 'luxon'];
    const foundDateLibs = dateLibs.filter(lib => allDeps[lib]);
    
    if (foundDateLibs.length > 1) {
      redundant.push({
        type: 'redundant',
        packages: foundDateLibs,
        suggestion: '하나의 날짜 라이브러리만 사용하세요'
      });
    }
    
    return redundant;
  }

  findHeavyDependencies(deps) {
    // 무거운 패키지 식별
    const heavyPackages = ['webpack', 'babel', '@babel', 'eslint', 'typescript'];
    
    return heavyPackages.filter(pkg => deps[pkg]).map(pkg => ({
      name: pkg,
      type: 'heavy',
      suggestion: '번들 시간 최적화 고려'
    }));
  }

  generateRecommendations() {
    const recommendations = [];
    
    // 워크플로우 개선
    recommendations.push({
      category: 'CI/CD 자동화',
      priority: 'high',
      items: [
        {
          title: 'PR 템플릿 자동화',
          description: 'PR에 자동으로 라벨 붙이기',
          implementation: 'GitHub Actions를 통한 자동 라벨링 추가',
          files: ['.github/workflows/pr-labeler.yml'],
          benefit: 'PR 관리 자동화 및 코드 품질 일관성'
        },
        {
          title: '배포 파이프라인 강화',
          description: '스테이징 환경에서 자동 테스트',
          implementation: '배포 전에 통합 테스트 실행',
          files: ['.github/workflows/deploy-with-tests.yml'],
          benefit: '배포 안정성 향상 및 회귀 방지'
        },
        {
          title: '스셌이징 환경 자동화',
          description: 'Lighthouse 자동 실행 및 리포트',
          implementation: '성능 테스트 자동화 및 추세 트래킹',
          files: ['.github/workflows/performance-tracking.yml'],
          benefit: '성능 저하 조기 발견'
        }
      ]
    });

    // 보안 강화
    recommendations.push({
      category: '보안 및 거버넌스',
      priority: 'high',
      items: [
        {
          title: '의존성 관리 강화',
          description: '주기적인 의존성 업데이트',
          implementation: 'Renovate 또는 Dep으로 자동 업데이트',
          files: ['renovate.json', '.github/renovate.yml'],
          benefit: '보안 패치 적시 적용 및 최신 버전 유지'
        },
        {
          title: 'Secrets 스캔 자동화',
          description: 'GitHub Secrets 스캐 및 관리',
          implementation: 'GitLeaks 또는 TruffleHog 도입',
          files: ['.github/workflows/secret-scanning.yml'],
          benefit: '인증 정보 노출 방지'
        }
      ]
    });

    // 모니터링 강화
    recommendations.push({
      category: '모니터링 및 알림',
      priority: 'medium',
      items: [
        {
          title: '에러 모니터링 강화',
          description: '실시간 에러 알림 시스템',
          implementation: 'Sentry, Rollbar, DataDog 도입',
          files: ['app/lib/monitoring/', '.github/workflows/error-monitoring.yml'],
          benefit: '프로덕션 에러 신속 감지 및 대응'
        },
        {
          title: '성능 모니터링',
          description: '실시간 성능 메트릭 수집',
          implementation: 'APM 도구 연동',
          files: ['app/lib/monitoring/performance.ts'],
          benefit: '성능 병목 사전 예방'
        }
      ]
    });

    return recommendations;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      project: {
        name: this.packageJson.name,
        version: this.packageJson.version
      },
      current_state: {
        workflows: this.currentWorkflows,
        dependencies: this.analyzeDependencies(),
        issues: this.extractAllIssues()
      },
      recommendations: this.generateRecommendations(),
      next_steps: this.generateNextSteps()
    };

    return report;
  }

  extractAllIssues() {
    const allIssues = [];
    
    Object.values(this.currentWorkflows).forEach(workflow => {
      if (workflow.issues && workflow.issues.length > 0) {
        allIssues.push(...workflow.issues);
      }
    });

    return allIssues;
  }

  generateNextSteps() {
    return [
      {
        phase: '즉시 (1주 이내)',
        tasks: [
          '1. npm audit --fix 실행으로 보안 취약점 해결',
          '2. package.json 최신화 및 정리',
          '3. ESLint 규칙 강화',
          '4. TypeScript strict mode 검토'
        ]
      },
      {
        phase: '단기 (1개월 이내)',
        tasks: [
          '1. Renovate 도입으로 의존성 관리 자동화',
          '2. Sentry 도입으로 에러 모니터링 강화',
          '3. Lighthouse 자동화로 성능 모니터링',
          '4. GitHub Actions 워크플로우 재구성'
        ]
      },
      {
        phase: '장기 (3개월 이내)',
        tasks: [
          '1. APM 도구 도입으로 성능 모니터링 고도화',
          '2. 컨테이너 오케스트레이션 도입',
          '3. Blue-Green 배포 자동화',
          '4. IaC (Infrastructure as Code) 적용'
        ]
      }
    ];
  }

  async saveReport() {
    const report = this.generateReport();
    const reportPath = path.join(__dirname, '..', 'ci-analysis-report.json');
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`📊 CI/CD 분석 리포트 저장: ${reportPath}`);
    
    return report;
  }
}

// 메인 실행 함수
async function analyzeCI() {
  console.log('🔍 CI/CD 워크플로우 분석 시작\n');
  
  const analyzer = new CIAnalyzer();
  const report = await analyzer.saveReport();
  
  console.log('\n📋 현재 상태 요약:');
  console.log(`   프로젝트: ${report.project.name} v${report.project.version}`);
  console.log(`   워크플로우 수: ${Object.keys(report.current_state.workflows).length}개`);
  
  console.log('\n⚠️ 발견된 이슈:');
  report.current_state.issues.forEach((issue, index) => {
    const severityIcon = issue.severity === 'high' ? '🔴' : '🟡';
    console.log(`   ${severityIcon} ${issue.issue.description} (${issue.type})`);
  });
  
  console.log('\n📈 추천 개선 사항:');
  report.recommendations.forEach((category, index) => {
    const priorityIcon = category.priority === 'high' ? '🔴' : '🟡';
    console.log(`\n${priorityIcon} ${category.category} (우선순위: ${category.priority}):`);
    category.items.forEach(item => {
      console.log(`   • ${item.title}`);
      console.log(`     ${item.description}`);
    });
  });
  
  console.log('\n📋 상세 리포트:');
  console.log(`📁 완전한 리포트: ci-analysis-report.json`);
  console.log(`🌐 GitHub Actions 관리: https://github.com/your-repo/actions`);
  
  return report;
}

// 스크립트 실행
if (require.main === module) {
  analyzeCI().catch(console.error);
}

module.exports = { CIAnalyzer, analyzeCI };