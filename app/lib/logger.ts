import pino from 'pino';

// 로거 설정
const logLevel = process.env.LOG_LEVEL || 'info';
const isDevelopment = process.env.NODE_ENV === 'development';

// 기본 로거
export const logger = pino({
  level: logLevel,
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    pid: undefined,
    hostname: undefined,
  },
  serializers: {
    error: pino.stdSerializers.err,
  },
});

// 자식 로거 생성 함수
export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

// API 로거
export const apiLogger = createChildLogger({ module: 'api' });

// 데이터베이스 로거
export const dbLogger = createChildLogger({ module: 'database' });

// 동기화 로거
export const syncLogger = createChildLogger({ module: 'sync' });

// 웹 로거
export const webLogger = createChildLogger({ module: 'web' });

// 알림 로거
export const notificationLogger = createChildLogger({ module: 'notification' });

// 인증 로거
export const authLogger = createChildLogger({ module: 'auth' });

export const noteLogger = createChildLogger({ module: 'note' });

export default logger;
