import { businessRepository } from './business.repository';
import { dbLogger } from '../logger';
import { CachedRepository, globalCacheManager } from '../cache';

// 캐싱된 Repository 래퍼 인스턴스
const cachedBusinessRepository = globalCacheManager.createRepositoryWrapper(businessRepository);

export { businessRepository, cachedBusinessRepository };