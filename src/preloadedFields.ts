/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Field } from './types';

export const PRELOADED_FIELDS: Field[] = [
  {
    id: "field_iowa_maize",
    name: "Iowa Broad-Maize Plot 4B",
    cropType: "DeKalb Dent Corn",
    polygon: [
      { lat: 41.6852, lng: -93.6150 },
      { lat: 41.6852, lng: -93.6100 },
      { lat: 41.6810, lng: -93.6100 },
      { lat: 41.6810, lng: -93.6150 }
    ],
    areaAcres: 120.4,
    plantingDate: "2026-04-10",
    soilMoisture: 42,
    cropStatus: "Vegetative",
    healthStatus: "good",
    ndviStats: [
      { date: "May 2026", currentNdvi: 0.22, historicalAvg: 0.20, soilMoisture: 48 },
      { date: "Jun 2026", currentNdvi: 0.45, historicalAvg: 0.41, soilMoisture: 44 },
      { date: "Jul 2026", currentNdvi: 0.72, historicalAvg: 0.68, soilMoisture: 42 },
      { date: "Aug 2026", currentNdvi: 0.81, historicalAvg: 0.79, soilMoisture: 38 },
      { date: "Sep 2026", currentNdvi: 0.58, historicalAvg: 0.62, soilMoisture: 32 }
    ],
    lastAnalysis: {
      ndviTrendText: "NDVI is currently robust (0.81) showing +0.02 increase above 5-year averages",
      healthRating: "excellent",
      diagnostics: [
        "Canopy architecture displays optimal solar radiation absorption.",
        "NDVI values peaking exactly in synchronization with reproductive tassels stage.",
        "Zero nitrogen deficiency spectral patterns detected."
      ],
      recommendations: [
        "Schedule standard potassium foliar feed.",
        "Formulate harvest machinery scheduling for late September.",
        "Perform random ground-truthing for stalk rot susceptibility index."
      ],
      summary: "The DeKalb Dent Corn field is enjoying a stellar growing season. High-resolution imagery confirms exceptional vegetative vigour. Soil matrix moisture remains within stable stomatal ranges, assuring continuous starch conversion.",
      nitrogenStatus: "optimal",
      waterStress: "low",
      estimatedYieldChange: "+5.8%",
      timestamp: "2026-05-25T12:00:00Z"
    }
  },
  {
    id: "field_kansas_wheat",
    name: "Kansas Wheat Ridge Block A",
    cropType: "Hard Red Winter Wheat",
    polygon: [
      { lat: 38.4980, lng: -98.3120 },
      { lat: 38.4980, lng: -98.3070 },
      { lat: 38.4930, lng: -98.3070 },
      { lat: 38.4930, lng: -98.3120 }
    ],
    areaAcres: 165.2,
    plantingDate: "2025-10-05",
    soilMoisture: 24,
    cropStatus: "Harvest Ready",
    healthStatus: "poor",
    ndviStats: [
      { date: "Oct 2025", currentNdvi: 0.15, historicalAvg: 0.16, soilMoisture: 52 },
      { date: "Dec 2025", currentNdvi: 0.31, historicalAvg: 0.33, soilMoisture: 45 },
      { date: "Mar 2026", currentNdvi: 0.58, historicalAvg: 0.60, soilMoisture: 38 },
      { date: "Apr 2026", currentNdvi: 0.48, historicalAvg: 0.62, soilMoisture: 28 },
      { date: "May 2026", currentNdvi: 0.32, historicalAvg: 0.48, soilMoisture: 21 }
    ],
    lastAnalysis: {
      ndviTrendText: "Severe NDVI compression (-0.16) compared to 5-year historical average series",
      healthRating: "poor",
      diagnostics: [
        "Moderate chlorosis observed across primary sub-plots.",
        "NASA SMAP highlights extreme superficial soil moisture contraction.",
        "Early senescence triggered by unseasonal moisture deficit."
      ],
      recommendations: [
        "Advance wheat harvesting schedule to arrest further grain shrivel.",
        "Incorporate organic crop residue into tillage lines post-harvest to enhance water holding capacity.",
        "Refrain from additional fertilizer applications which could exacerbate ionic root burn."
      ],
      summary: "This winter wheat field is experiencing severe drough-induced stress. NDVI dropped precipitously during the key grain maturation window. Dry soil and high cell respiration have limited biomass density.",
      nitrogenStatus: "deficient",
      waterStress: "severe",
      estimatedYieldChange: "-18.5%",
      timestamp: "2026-05-25T14:30:00Z"
    }
  }
];
