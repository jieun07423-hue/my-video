import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';

// 공공데이터포털 API 설정
const API_BASE_URL = 'https://apis.data.go.kr/B553077/api/open/sdsc2';
const SERVICE_KEY = process.env.DATA_GO_KR_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.warn('DATA_GO_KR_SERVICE_KEY 환경변수가 설정되지 않았습니다');
}

// Axios 인스턴스 생성
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// 재시도 설정
axiosRetry(apiClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status ?? 0) >= 500 ||
      error.response?.status === 429
    );
  },
});

// API 응답 타입
export interface BusinessAPIResponse {
  header: {
    resultCode: string;
    resultMsg: string;
  };
  body: {
    items: any[];
    numOfRows: number;
    pageNo: number;
    totalCount: number;
  };
}

// 분석 결과 타입
export interface AnalysisResult {
  totalCount: number;
  items: Array<{
    key: string;
    name: string;
    count: number;
    percentage?: number;
  }>;
}

/**
 * 날짜 기준 소상공인 정보 조회
 * @param date YYYYMMDD 형식
 * @param pageNo 페이지 번호
 * @param numOfRows 페이지당 레코드 수
 */
export async function fetchBusinessesByDate(
  date: string,
  pageNo: number = 1,
  numOfRows: number = 1000
): Promise<BusinessAPIResponse | null> {
  if (!SERVICE_KEY) {
    console.warn('DATA_GO_KR_SERVICE_KEY가 없습니다');
    return null;
  }

  try {
    const response = await apiClient.get('/storeListInDate', {
      params: {
        serviceKey: SERVICE_KEY,
        key: date,
        type: 'json',
        pageNo,
        numOfRows,
      },
    });
    return response.data;
  } catch (error) {
    console.error('소상공인 데이터 조회 실패:', error);
    throw error;
  }
}

/**
 * 단일 상가업소 조회
 * @param bizesId 상가업소번호
 */
export async function fetchBusinessById(bizesId: string): Promise<BusinessAPIResponse | null> {
  if (!SERVICE_KEY) {
    return null;
  }

  try {
    const response = await apiClient.get('/storeOne', {
      params: {
        serviceKey: SERVICE_KEY,
        key: bizesId,
        type: 'json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('단일 상가업소 조회 실패:', error);
    throw error;
  }
}

/**
 * 업종(소분류)별 사업자 수 분석
 * @param indsSclsCd 업종소분류코드
 * @param pageNo 페이지 번호
 * @param numOfRows 페이지당 레코드 수
 */
export async function fetchByIndustry(
  indsSclsCd: string,
  pageNo: number = 1,
  numOfRows: number = 100
): Promise<BusinessAPIResponse | null> {
  if (!SERVICE_KEY) {
    return null;
  }

  try {
    const response = await apiClient.get('/storeListInUpdrgtCd', {
      params: {
        serviceKey: SERVICE_KEY,
        key: indsSclsCd,
        type: 'json',
        pageNo,
        numOfRows,
      },
    });
    return response.data;
  } catch (error) {
    console.error('업종별 조회 실패:', error);
    throw error;
  }
}

/**
 * 지역(시군구)별 사업자 수 분석
 * @param districtCode 지역코드 (시군구)
 * @param pageNo 페이지 번호
 * @param numOfRows 페이지당 레코드 수
 */
export async function fetchByDistrict(
  districtCode: string,
  pageNo: number = 1,
  numOfRows: number = 100
): Promise<BusinessAPIResponse | null> {
  if (!SERVICE_KEY) {
    return null;
  }

  try {
    const response = await apiClient.get('/storeListInDongCode', {
      params: {
        serviceKey: SERVICE_KEY,
        key: districtCode,
        type: 'json',
        pageNo,
        numOfRows,
      },
    });
    return response.data;
  } catch (error) {
    console.error('지역별 조회 실패:', error);
    throw error;
  }
}

/**
 * 기간별 사업자 수 추이
 * @param startDate 시작일 (YYYYMMDD)
 * @param endDate 종료일 (YYYYMMDD)
 */
export async function fetchTrendByPeriod(
  startDate: string,
  endDate: string
): Promise<AnalysisResult> {
  const days: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10).replace(/-/g, '');
    days.push(dateStr);
    current.setDate(current.getDate() + 1);
  }

  const items: AnalysisResult['items'] = [];

  for (const date of days.slice(0, 7)) {
    try {
      const result = await fetchBusinessesByDate(date, 1, 1);
      const count = result?.body?.totalCount || 0;
      const formattedDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
      items.push({ key: date, name: formattedDate, count });
    } catch {
      items.push({ key: date, name: date, count: 0 });
    }
  }

  const total = items.reduce((sum, item) => sum + item.count, 0);
  items.forEach(item => {
    item.percentage = total > 0 ? (item.count / total) * 100 : 0;
  });

  return { totalCount: total, items };
}

/**
 * 업종 대분류 목록 조회
 */
export async function fetchIndustryCategories(): Promise<Array<{ code: string; name: string }>> {
  return [
    { code: 'A', name: '농업, 임업 및 어업' },
    { code: 'B', name: '광업' },
    { code: 'C', name: '제조업' },
    { code: 'D', name: '전기, 가스, 증기 및 공기조절 공급업' },
    { code: 'E', name: '하수, 폐기물 처리, 원료 재생업' },
    { code: 'F', name: '建筑业' },
    { code: 'G', name: '도매 및 소매업' },
    { code: 'H', name: '운수 및 창고업' },
    { code: 'I', name: '숙박 및 음식점업' },
    { code: 'J', name: '정보통신업' },
    { code: 'K', name: '금융 및 보험업' },
    { code: 'L', name: '부동산 임대 및 관리업' },
    { code: 'M', name: '전문, 과학 및 기술 서비스업' },
    { code: 'N', name: '사업시설 관리, 사업 지원 및 임대 서비스업' },
    { code: 'O', name: '공공 행정, Defence 및 사회 보장 행정' },
    { code: 'P', name: '교육 서비스업' },
    { code: 'Q', name: '보건업 및 사회복지 서비스업' },
    { code: 'R', name: '예술, 스포츠 및 여가 관련服务业' },
    { code: 'S', name: '협회 및 기타 개인 서비스업' },
    { code: 'T', name: '가구 내 고용활동 및 달리 분류되지 않은 자가 소비 생산활동' },
  ];
}

/**
 * 지역(시도) 목록 조회
 */
export async function fetchRegions(): Promise<Array<{ code: string; name: string }>> {
  return [
    { code: '11', name: '서울특별시' },
    { code: '26', name: '부산광역시' },
    { code: '27', name: '대구광역시' },
    { code: '28', name: '인천광역시' },
    { code: '29', name: '광주광역시' },
    { code: '30', name: '대전광역시' },
    { code: '31', name: '울산광역시' },
    { code: '32', name: '세종특별자치시' },
    { code: '41', name: '경기도' },
    { code: '42', name: '강원도' },
    { code: '43', name: '충청북도' },
    { code: '44', name: '충청남도' },
    { code: '45', name: '전라북도' },
    { code: '46', name: '전라남도' },
    { code: '47', name: '경상북도' },
    { code: '48', name: '경상남도' },
    { code: '50', name: '제주특별자치도' },
  ];
}

/**
 * API 헬스체크
 */
export async function checkAPIHealth(): Promise<boolean> {
  if (!SERVICE_KEY) return false;
  
  try {
    const testDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    await fetchBusinessesByDate(testDate, 1, 10);
    return true;
  } catch {
    return false;
  }
}

export default {
  fetchBusinessesByDate,
  fetchBusinessById,
  fetchByIndustry,
  fetchByDistrict,
  fetchTrendByPeriod,
  fetchIndustryCategories,
  fetchRegions,
  checkAPIHealth,
};
