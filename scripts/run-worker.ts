import { syncWorker } from '@/lib/workers/sync.worker';
import redis from '@/lib/redis';

async function start() {
  console.log('🚀 Sync Worker starting...');
  
  try {
    await redis.ping();
    console.log('✅ Redis connection established');
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    process.exit(1);
  }

  console.log('🎧 Worker is listening to the sync-queue...');
  
  // 프로세스 종료 처리
  process.on('SIGINT', async () => {
    console.log('\nStopping worker...');
    await syncWorker.close();
    await redis.quit();
    process.exit(0);
  });
}

start();
