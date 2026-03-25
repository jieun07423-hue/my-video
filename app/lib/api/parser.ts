import { BusinessItem } from '@/types/api';

enum BusinessStatus {
  pending = 'pending',
  active = 'active', 
  inactive = 'inactive',
  dissolved = 'dissolved',
  pending_renewal = 'pending_renewal'
}

enum RecordStatus {
  new = 'new',
  synced = 'synced', 
  verified = 'verified'
}
import { apiLogger } from '@/lib/logger';

/**
 * API 응답을 데이터베이스 엔티티로 변환
 */
export function parseBusinessItem(item: BusinessItem): Partial<{
  bizesId: string;
  name: string;
  roadNameAddress: string | null;
  lotNumberAddress: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  businessCode: string | null;
  businessName: string | null;
  indsLclsCd: string | null;
  indsLclsNm: string | null;
  indsMclsCd: string | null;
  indsMclsNm: string | null;
  indsSclsCd: string | null;
  indsSclsNm: string | null;
  status: BusinessStatus;
  recordStatus: RecordStatus;
  dataSource: string;
  externalId: string | null;
}> {
  try {
    return {
      bizesId: item.bizesId || item.mgtNo || '',
      name: item.bizesNm || 'Unknown',
      roadNameAddress: item.rdnmAdr || null,
      lotNumberAddress: item.lnoAdr || null,
      phone: item.mtel1no || null,
      latitude: item.lat ? parseFloat(item.lat) : null,
      longitude: item.lon ? parseFloat(item.lon) : null,
      businessCode: item.indsLclsCd || null,
      businessName: item.indsLclsNm || null,
      indsLclsCd: item.indsLclsCd || null,
      indsLclsNm: item.indsLclsNm || null,
      indsMclsCd: item.indsMclsCd || null,
      indsMclsNm: item.indsMclsNm || null,
      indsSclsCd: item.indsSclsCd || null,
      indsSclsNm: item.indsSclsNm || null,
      status: item.trdStateNm === '영업중' ? BusinessStatus.active : BusinessStatus.pending,
      recordStatus: RecordStatus.new, // 기본값: 신규로 표시
      dataSource: 'public-data-portal',
      externalId: item.mgtNo || null,
    };
  } catch (error) {
    apiLogger.error(
      { item, error: error instanceof Error ? error.message : String(error) },
      '비즈니스 아이템 파싱 실패'
    );
    throw error;
  }
}

/**
 * 여러 비즈니스 아이템 파싱
 */
export function parseBusinessItems(items: BusinessItem[]) {
  const parsed = items.map(parseBusinessItem);
  const errors = parsed.filter(p => p === null);

  if (errors.length > 0) {
    apiLogger.warn(
      { total: items.length, errors: errors.length },
      '일부 아이템 파싱 실패'
    );
  }

  return parsed;
}

/**
 * 영업상태명에서 상태 매핑
 */
export function mapBusinessStatus(statusName: string): BusinessStatus {
  const statusMap: Record<string, BusinessStatus> = {
    '영업중': BusinessStatus.active,
    '휴업': BusinessStatus.inactive,
    '폐업': BusinessStatus.dissolved,
    '삭제': BusinessStatus.dissolved,
  };

  return statusMap[statusName] || BusinessStatus.pending;
}

export default {
  parseBusinessItem,
  parseBusinessItems,
  mapBusinessStatus,
};
