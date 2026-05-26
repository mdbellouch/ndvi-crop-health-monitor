/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export type HealthStatus = 'excellent' | 'good' | 'fair' | 'poor';

export interface NdviDataPoint {
  date: string;       // e.g., "Jan 2026" or "2026-01-15"
  currentNdvi: number; // 0.0 to 1.0
  historicalAvg: number; // 0.0 to 1.0
  soilMoisture: number; // SMAP contextual soil moisture % (0 to 100)
}

export interface Field {
  id: string;
  name: string;
  cropType: string;
  polygon: LatLng[];
  areaAcres: number;
  plantingDate: string;
  soilMoisture: number; // Current value in %
  cropStatus: string;   // e.g., "Vegetative", "Flowering", "Harvest Ready", "Emerging"
  healthStatus: HealthStatus;
  ndviStats: NdviDataPoint[];
  lastAnalysis?: AIAnalysisResult;
}

export interface AIAnalysisResult {
  ndviTrendText: string;
  healthRating: HealthStatus;
  diagnostics: string[];
  recommendations: string[];
  summary: string;
  nitrogenStatus: 'deficient' | 'adequate' | 'optimal';
  waterStress: 'low' | 'moderate' | 'severe';
  estimatedYieldChange: string; // e.g., "+4.2%", "-2.0%"
  timestamp: string;
}
