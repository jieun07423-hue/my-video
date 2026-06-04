import { describe, it, expect } from '@jest/globals';
import { 
  parseXmlResponse, 
  extractRoadName, 
  extractLotNumber, 
  getBusinessNameFromCode, 
  mapToBusinessInput 
} from '../public-data-portal.util';

describe('PublicDataPortalUtils', () => {
  describe('parseXmlResponse', () => {
    it('정상적인 XML 응답을 올바르게 파싱해야 한다', () => {
      const xml = `
        <response>
          <header>
            <resultCode>00</resultCode>
            <resultMsg>OK</resultMsg>
          </header>
          <body>
            <items>
              <item>
                <entrpsNm>테스트상가</entrpsNm>
                <bsnmNo>12345</bsnmNo>
              </item>
              <item>
                <entrpsNm>테스트상가2</entrpsNm>
                <bsnmNo>67890</bsnmNo>
              </item>
            </items>
            <totalCount>2</totalCount>
            <numOfRows>2</numOfRows>
            <pageNo>1</pageNo>
          </body>
        </response>
      `;
      const result = parseXmlResponse(xml);
      expect(result.resultCode).toBe('00');
      expect(result.item).toHaveLength(2);
      expect(result.item?.[0].entrpsNm).toBe('테스트상가');
      expect(result.totalCount).toBe(2);
    });

    it('단일 아이템 응답(배열이 아닌 경우)을 처리해야 한다', () => {
      const xml = `
        <response>
          <header><resultCode>00</resultCode></header>
          <body>
            <items>
              <item>
                <entrpsNm>단일상가</entrpsNm>
                <bsnmNo>111</bsnmNo>
              </item>
            </items>
          </body>
        </response>
      `;
      const result = parseXmlResponse(xml);
      expect(Array.isArray(result.item)).toBe(true);
      expect(result.item).toHaveLength(1);
      expect(result.item?.[0].entrpsNm).toBe('단일상가');
    });

    it('잘못된 XML 형식인 경우 에러를 던져야 한다', () => {
      const xml = ` `; // 빈 문자열 혹은 공백
      expect(() => parseXmlResponse(xml)).toThrow('XML 파싱 실패');
    });

    it('응답 구조가 다른 경우(header/body 누락)에도 기본값을 반환해야 한다', () => {
      const xml = `<resultCode>00</resultCode>`;
      const result = parseXmlResponse(xml);
      expect(result.resultCode).toBe('00');
      expect(result.item).toBeUndefined();
    });
  });

  describe('Address Extraction', () => {
    const testCases = [
      { 
        address: '서울시 강남구 테헤란로 123-45', 
        road: '서울시 강남구 테헤란로', 
        lot: '123-45' 
      },
      { 
        address: '경기도 성남시 분당구 판교역로 166', 
        road: '경기도 성남시 분당구 판교역로', 
        lot: '166' 
      },
      { 
        address: '서울시 중구 세종대로 110', 
        road: '서울시 중구 세종대로', 
        lot: '110' 
      },
      { 
        address: '주소에 숫자가 없는 경우', 
        road: '주소에 숫자가 없는 경우', 
        lot: null 
      },
      { 
        address: '', 
        road: null, 
        lot: null 
      },
    ];

    it('다양한 주소 형식에서 도로명과 지번을 정확히 분리해야 한다', () => {
      testCases.forEach(({ address, road, lot }) => {
        expect(extractRoadName(address)).toBe(road);
        expect(extractLotNumber(address)).toBe(lot);
      });
    });
  });

  describe('getBusinessNameFromCode', () => {
    it('코드와 이름을 조합하여 업종명을 생성해야 한다', () => {
      expect(getBusinessNameFromCode('12345', '카페')).toBe('12345 - 카페');
    });

    it('코드가 없는 경우 소분류명만 반환해야 한다', () => {
      expect(getBusinessNameFromCode('', '카페')).toBe('카페');
    });

    it('둘 다 없는 경우 빈 문자열을 반환해야 한다', () => {
      expect(getBusinessNameFromCode('', '')).toBe('');
    });
  });

  describe('mapToBusinessInput', () => {
    it('API 아이템을 BusinessInput으로 정확히 변환해야 한다', () => {
      const item = {
        entrpsNm: '테스트상가',
        bsnmNo: 'B123',
        minduty: 'C1',
        rprsntvNm: '홍길동',
        adres: '서울시 강남구 테헤란로 123',
        validPdDe: '2025-01-01',
        earlyValidPdDe: '2024-01-01',
        indsLclsCd: 'L1',
        indsLclsNm: '대분류',
        indsMclsCd: 'M1',
        indsMclsNm: '중분류',
        indsSclsCd: 'S1',
        indsSclsNm: '소분류',
      };
      const result = mapToBusinessInput(item, 'portal');
      
      expect(result.bizesId).toBe('B123');
      expect(result.name).toBe('테스트상가');
      expect(result.roadNameAddress).toBe('서울시 강남구 테헤란로');
      expect(result.lotNumberAddress).toBe('123');
      expect(result.businessCode).toBe('C1');
      expect(result.businessName).toBe('C1 - 소분류');
      expect(result.dataSource).toBe('portal');
      expect(result.recordStatus).toBe('new');
    });
  });
});
