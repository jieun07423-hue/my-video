import { NextRequest, NextResponse } from 'next/server';
import {
  detectAnomalies,
  detectTextAnomalies,
  detectPatternAnomalies,
  analyzeAnomalyPatterns,
  generateAnomalyReport,
} from '@/lib/services/anomaly-detection.service';
import { businessRepository } from '@/lib/repositories/business.repository';
import { apiLogger } from '@/lib/logger';
import { createApiErrorResponse } from '@/lib/api/handlers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'report') {
      const result = await businessRepository.search({ limit: 1000 });
      const businesses = result.items.map((b: any) => ({
        bizesId: b.bizesId,
        name: b.name,
        roadNameAddress: b.roadNameAddress,
        lotNumberAddress: b.lotNumberAddress,
        phone: b.phone,
        latitude: b.latitude,
        longitude: b.longitude,
        businessCode: b.businessCode,
        businessName: b.businessName,
        indsLclsNm: b.indsLclsNm,
        indsMclsNm: b.indsMclsNm,
        indsSclsNm: b.indsSclsNm,
        status: b.status,
        updatedAt: b.updatedAt,
      }));

      const anomalyResult = detectAnomalies(businesses);
      const textAnomalies = detectTextAnomalies(businesses);
      const patternAnomalies = detectPatternAnomalies(businesses);

      const allAnomalies = [...anomalyResult.anomalies, ...textAnomalies, ...patternAnomalies];
      const patterns = analyzeAnomalyPatterns(allAnomalies);
      const report = generateAnomalyReport(anomalyResult);

      const riskLevel = anomalyResult.anomalyRate > 20 ? 'critical'
        : anomalyResult.anomalyRate > 10 ? 'high'
        : anomalyResult.anomalyRate > 5 ? 'medium'
        : 'low';

      apiLogger.info({
        totalBusinesses: anomalyResult.totalBusinesses,
        anomaliesDetected: allAnomalies.length,
      }, '이상 탐지 완료');

      return NextResponse.json({
        totalBusinesses: anomalyResult.totalBusinesses,
        anomaliesDetected: allAnomalies.length,
        anomalyRate: anomalyResult.anomalyRate,
        riskLevel,
        anomalies: allAnomalies,
        patterns,
        report,
        detectedAt: anomalyResult.detectedAt,
      });
    }

    const result = await businessRepository.search({ limit: 500 });
    const businesses = result.items.map((b: any) => ({
      bizesId: b.bizesId,
      name: b.name,
      roadNameAddress: b.roadNameAddress,
      lotNumberAddress: b.lotNumberAddress,
      phone: b.phone,
      latitude: b.latitude,
      longitude: b.longitude,
      businessCode: b.businessCode,
      businessName: b.businessName,
      indsLclsNm: b.indsLclsNm,
      indsMclsNm: b.indsMclsNm,
      indsSclsNm: b.indsSclsNm,
      status: b.status,
      updatedAt: b.updatedAt,
    }));

    const detectionResult = detectAnomalies(businesses);

    apiLogger.info({
      totalBusinesses: detectionResult.totalBusinesses,
      anomaliesDetected: detectionResult.anomaliesDetected,
      anomalyRate: detectionResult.anomalyRate,
    }, '이상 탐지 완료');

    return NextResponse.json(detectionResult);
  } catch (error) {
    apiLogger.error({ error: error instanceof Error ? error.message : String(error) }, '이상 탐지 실패');
    return createApiErrorResponse(error, '이상 탐지 실패', 500);
  }
}
