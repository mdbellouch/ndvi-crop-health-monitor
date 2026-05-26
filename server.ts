/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Improve Security by disabling X-Powered-By header
app.disable("x-powered-by");

// Apply baseline HTTP security headers (iframe-friendly)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Limit JSON payload size to prevent Denial of Service (DoS) attacks
app.use(express.json({ limit: "1mb" }));

// Lazy initialisation of Gemini to prevent crashes on startup
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

// Coordinate utilities
interface LatLng {
  lat: number;
  lng: number;
}

function getCentroid(coords: LatLng[]): LatLng {
  if (coords.length === 0) return { lat: 37.42, lng: -122.08 };
  let lats = 0, lngs = 0;
  for (const c of coords) {
    lats += c.lat;
    lngs += c.lng;
  }
  return { lat: lats / coords.length, lng: lngs / coords.length };
}

// Custom NDVI Simulation engine based on real geographical coordinates and season logic
function generateNdviTimeSeries(centroid: LatLng, cropType: string, plantingDateStr: string): any[] {
  const points = [];
  const plantingDate = new Date(plantingDateStr);
  const startYear = plantingDate.getFullYear();
  const startMonth = plantingDate.getMonth(); // 0-11
  
  // Crop specific growth factors
  // Growth curve peak offsets (months after planting) and heights
  let peakOffsetMonths = 3;
  let baseNdvi = 0.15;
  let peakNdvi = 0.85;
  let senescenceDuration = 2; // months to decay
  
  const cLower = cropType.toLowerCase();
  if (cLower.includes("corn") || cLower.includes("maize")) {
    peakOffsetMonths = 3;
    baseNdvi = 0.18;
    peakNdvi = 0.82;
  } else if (cLower.includes("wheat")) {
    peakOffsetMonths = 4;
    baseNdvi = 0.15;
    peakNdvi = 0.78;
  } else if (cLower.includes("soy")) {
    peakOffsetMonths = 2.5;
    baseNdvi = 0.16;
    peakNdvi = 0.84;
  } else if (cLower.includes("cotton")) {
    peakOffsetMonths = 4;
    baseNdvi = 0.14;
    peakNdvi = 0.75;
  } else if (cLower.includes("alkali") || cLower.includes("rice")) {
    peakOffsetMonths = 3;
    baseNdvi = 0.22;
    peakNdvi = 0.80;
  }

  // Generate 8 data points, monthly or twice a month, to construct a realistic timeline
  for (let i = 0; i < 9; i++) {
    const pointDate = new Date(startYear, startMonth + i, 15);
    const monthsSincePlanting = i;
    
    // Simulate growth curve: standard Gaussian or Beta distribution shaped peak
    let growthFactor = 0;
    if (monthsSincePlanting <= peakOffsetMonths) {
      // Veg phase: rising
      growthFactor = Math.sin((monthsSincePlanting / peakOffsetMonths) * (Math.PI / 2));
    } else if (monthsSincePlanting <= peakOffsetMonths + senescenceDuration) {
      // Maturation/Senescence: falling
      const decTime = monthsSincePlanting - peakOffsetMonths;
      growthFactor = 1.0 - (decTime / senescenceDuration) * (1.0 - 0.2);
    } else {
      // Harvested / Soil fallback
      growthFactor = 0.15;
    }

    // Latitude and coordinate-based variations (spatial noise)
    const geoVariation = Math.sin(centroid.lat * 10) * Math.cos(centroid.lng * 10) * 0.04;
    
    // Compute current and historical
    const currentNdvi = Math.max(0.1, Math.min(0.95, baseNdvi + (peakNdvi - baseNdvi) * growthFactor + geoVariation));
    
    // Historical is similar but slightly shifted or higher/lower to represent weather change
    // Year-on-year variations
    const historicalVariation = Math.sin(pointDate.getFullYear() * 0.2) * 0.05;
    const historicalAvg = Math.max(0.12, Math.min(0.92, currentNdvi * 0.95 + historicalVariation));
    
    // SMAP contextual Soil Moisture calculation
    // Soil moisture correlates with rainfall/vegetation but drops as plant dries
    let soilMoisture = Math.max(12, Math.min(78, 45 + Math.cos(monthsSincePlanting) * 20 + geoVariation * 100));
    
    points.push({
      date: pointDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      currentNdvi: parseFloat(currentNdvi.toFixed(2)),
      historicalAvg: parseFloat(historicalAvg.toFixed(2)),
      soilMoisture: Math.round(soilMoisture)
    });
  }
  
  return points;
}

// Generate spatial NDVI heatmap grid coordinates within bounding box of drawn polygon
function generateSpatialGrid(polygon: LatLng[], cropType: string): any[] {
  if (polygon.length < 3) return [];
  
  // Calculate bounding box
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  for (const p of polygon) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  
  // Create a 5x5 spatial grid inside or near the bounding box
  const gridCells = [];
  const latSteps = 6;
  const lngSteps = 6;
  const latDelta = (maxLat - minLat) / latSteps;
  const lngDelta = (maxLng - minLng) / lngSteps;
  
  // Generate a procedural seed using bounding box coordinates
  const spatialSeed = (minLat * 11 + maxLng * 19) % 1;

  for (let i = 0; i < latSteps; i++) {
    for (let j = 0; j < lngSteps; j++) {
      const cellLatMin = minLat + i * latDelta;
      const cellLatMax = cellLatMin + latDelta;
      const cellLngMin = minLng + j * lngDelta;
      const cellLngMax = cellLngMin + lngDelta;
      
      const gridCentroid = {
        lat: cellLatMin + latDelta / 2,
        lng: cellLngMin + lngDelta / 2
      };
      
      // Calculate individual vegetation index centered around spatial variations (soil quality, water flow, etc.)
      // Produce high resolution vegetation index
      const localSoilPatch = Math.sin(gridCentroid.lat * 500) * Math.cos(gridCentroid.lng * 500);
      const elevationDrainage = Math.sin((gridCentroid.lat + gridCentroid.lng) * 300);
      
      let baseGridVal = 0.55 + localSoilPatch * 0.25 + elevationDrainage * 0.15 + spatialSeed * 0.05;
      baseGridVal = Math.max(0.12, Math.min(0.94, baseGridVal));
      
      // Categorize cell
      let status: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
      if (baseGridVal >= 0.7) status = 'excellent';
      else if (baseGridVal >= 0.5) status = 'good';
      else if (baseGridVal >= 0.3) status = 'fair';
      else status = 'poor';
      
      gridCells.push({
        bounds: {
          north: cellLatMax,
          south: cellLatMin,
          east: cellLngMax,
          west: cellLngMin
        },
        ndvi: parseFloat(baseGridVal.toFixed(2)),
        status
      });
    }
  }
  
  return gridCells;
}

// 1. API: Process coordinates and generate NDVI stats + grids
app.post("/api/fields/calculate", (req, res) => {
  const { polygon, cropType, name, plantingDate } = req.body;
  
  if (!polygon || !Array.isArray(polygon) || polygon.length === 0) {
    return res.status(400).json({ error: "Missing valid polygon coordinates" });
  }
  
  // Validate coordinate formats to prevent math exceptions or injections
  const isValidPolygon = polygon.every(pt => pt && typeof pt.lat === "number" && typeof pt.lng === "number" && !isNaN(pt.lat) && !isNaN(pt.lng));
  if (!isValidPolygon) {
    return res.status(400).json({ error: "Invalid geo-coordinate formats within boundary polygon" });
  }
  
  const centroid = getCentroid(polygon);
  const pDate = plantingDate || "2026-03-01";
  const crop = cropType || "Corn";
  
  // Calculate area in acres using spatial bounding box approx (rough client-friendly estimate)
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  for (const p of polygon) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  const kmLat = (maxLat - minLat) * 111;
  const kmLng = (maxLng - minLng) * 111 * Math.cos(centroid.lat * Math.PI / 180);
  const areaSqKm = Math.abs(kmLat * kmLng);
  const areaAcres = Math.max(1.5, parseFloat((areaSqKm * 247.105).toFixed(1)));
  
  const ndviStats = generateNdviTimeSeries(centroid, crop, pDate);
  const gridCells = generateSpatialGrid(polygon, crop);
  
  // Overall Health rating based on latest current NDVI index
  const latestNdvi = ndviStats[ndviStats.length - 1].currentNdvi;
  let overallHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
  if (latestNdvi >= 0.70) overallHealth = 'excellent';
  else if (latestNdvi >= 0.50) overallHealth = 'good';
  else if (latestNdvi >= 0.30) overallHealth = 'fair';
  else overallHealth = 'poor';

  res.json({
    id: `field_${Date.now()}`,
    name: name || `Field ${Math.floor(Math.random() * 1000 + 1)}`,
    cropType: crop,
    polygon,
    areaAcres,
    plantingDate: pDate,
    soilMoisture: ndviStats[ndviStats.length - 1].soilMoisture,
    cropStatus: latestNdvi > 0.75 ? "Flowering" : latestNdvi > 0.45 ? "Vegetative" : latestNdvi > 0.20 ? "Emerging" : "Harvested",
    healthStatus: overallHealth,
    ndviStats,
    gridCells
  });
});

// 2. API: Server-side Gemini AI analysis of the crop health parameters
app.post("/api/gemini/analyze", async (req, res) => {
  const { field } = req.body;
  
  if (!field) {
    return res.status(400).json({ error: "Missing field data for evaluation" });
  }

  // Safeguard: Verify field schema to block bad API payloads
  if (!field.ndviStats || !Array.isArray(field.ndviStats) || field.ndviStats.length === 0) {
    return res.status(400).json({ error: "Invalid agricultural telemetry: 'ndviStats' must be a non-empty array" });
  }

  // Clean and sanitize text inputs before utilizing in prompt context
  const cropType = typeof field.cropType === 'string' ? field.cropType.substring(0, 50).replace(/[^\w\s-]/gi, '') : "Unknown Crop";
  const plantingDate = typeof field.plantingDate === 'string' ? field.plantingDate.substring(0, 10) : "";
  const cropStatus = typeof field.cropStatus === 'string' ? field.cropStatus.substring(0, 30).replace(/[^\w\s-]/gi, '') : "Vegetative";
  const areaAcres = typeof field.areaAcres === 'number' && !isNaN(field.areaAcres) ? field.areaAcres : 1.0;

  const ai = getAi();
  
  // Format the diagnostic prompt
  const latestData = field.ndviStats[field.ndviStats.length - 1];
  const previousData = field.ndviStats[Math.max(0, field.ndviStats.length - 2)];
  
  // Re-verify numeric boundaries inside latest data
  if (latestData.currentNdvi === undefined || latestData.soilMoisture === undefined) {
    return res.status(400).json({ error: "Incomplete agricultural telemetry metrics" });
  }

  const trend = (latestData.currentNdvi || 0) - (previousData.currentNdvi || 0);
  const trendText = trend > 0.05 ? "rising significantly" : trend < -0.05 ? "declining" : "stable";

  const prompt = `
    Analyze the following satellite agricultural health telemetry dataset and provide a crop diagnostic prescription:
    
    Crop Type: ${cropType}
    Planting Date: ${plantingDate}
    Drawn Surface Area: ${areaAcres} Acres
    Current Month vegetation index (NDVI): ${latestData.currentNdvi}
    Current Month Soil Moisture Index (SMAP): ${latestData.soilMoisture}%
    Historical Month average NDVI: ${latestData.historicalAvg || 0.5}
    Current Trend: ${trendText} (from prior reading ${previousData.currentNdvi || 0.5} to current ${latestData.currentNdvi})
    Crop Status: ${cropStatus}
    
    Based on this data, provide agronomic guidance including a professional summary, crop diagnostics (nitrogen and water stress), and critical recommendations.
  `;

  if (!ai) {
    // Elegant fallback simulation is required if no key is present in early stage
    console.log("No Gemini API key detected. Initiating deterministic fallback agronomic diagnostics model.");
    
    let nitrogen: 'deficient' | 'adequate' | 'optimal' = 'adequate';
    let water: 'low' | 'moderate' | 'severe' = 'low';
    const diagnostics = ["Vegetative biomass conforms to seasonal patterns."];
    const recs = ["Continue scheduled soil monitoring.", "Maintain benchmark crop inspections."];
    let yieldChange = "+1.5%";
    let status = field.healthStatus;

    if (latestData.currentNdvi < 0.4) {
      nitrogen = 'deficient';
      status = 'poor';
      diagnostics.push("Chlorophyll depletion detected in Sentinel-2 spectrum.");
      diagnostics.push("Significant canopy density retardation.");
      recs.unshift("Apply 15-15-15 Nitrogen-Phosphorus-Potassium top-dress solution.");
      recs.push("Remediate weed cluster outbreaks spotted in low NDVI grids.");
      yieldChange = "-12.5%";
    } else if (latestData.currentNdvi < 0.6) {
      nitrogen = 'adequate';
      status = 'fair';
      diagnostics.push("Moderate chlorophyll absorbance.");
      recs.unshift("Execute targeted tissue nutrient tests to optimize yields.");
      yieldChange = "-2.3%";
    } else {
      nitrogen = 'optimal';
      status = 'excellent';
      diagnostics.push("Vigorous canopy architecture reflecting high light interception.");
      recs.unshift("Monitor final pod/ear filling stage as maturity approaches.");
      yieldChange = "+8.4%";
    }

    if (latestData.soilMoisture < 25) {
      water = 'severe';
      diagnostics.push("Severe agricultural drought conditions detected under NASA SMAP.");
      recs.unshift("Initiate high-frequency drip or overhead pivot irrigation cycles immediately.");
      yieldChange = (parseFloat(yieldChange) - 5).toFixed(1) + "%";
    } else if (latestData.soilMoisture < 40) {
      water = 'moderate';
      diagnostics.push("Subsoil moisture deficit approaching critical transpiration threshold.");
      recs.unshift("Trigger supplemental irrigation block to prevent stomatal closure.");
    } else {
      water = 'low';
      diagnostics.push("Soil matrix tension holds adequate plant-available water.");
    }

    const summary = `The ${field.cropType} field (${field.areaAcres} Acres), planted on ${field.plantingDate}, shows an NDVI of ${latestData.currentNdvi} which is ${trendText} compared to last period. Soil moisture holds at ${latestData.soilMoisture}%. Canopy moisture holds a ${water} stress level, and nitrogen levels are assessed as ${nitrogen}.`;

    return res.json({
      ndviTrendText: `NDVI is ${trendText} (${latestData.currentNdvi} vs historic avg of ${latestData.historicalAvg})`,
      healthRating: status,
      diagnostics,
      recommendations: recs,
      summary,
      nitrogenStatus: nitrogen,
      waterStress: water,
      estimatedYieldChange: yieldChange,
      timestamp: new Date().toISOString()
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an advanced digital agronomist and satellite imagery consultant specializing in remote sensing (Sentinel-2 NDVI, Landsat) and hydrology telemetry. Always respond in structured JSON format according to the requested schema. Provide crisp, realistic, highly expert farm diagnostics that look like they were generated by a professional precision agriculture engine.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ndviTrendText: { 
              type: Type.STRING, 
              description: "Comparison of current NDVI to previous values and historical normals" 
            },
            healthRating: { 
              type: Type.STRING, 
              description: "Must be exactly: 'excellent', 'good', 'fair', or 'poor'" 
            },
            diagnostics: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Detailed spectral abnormalities or vegetative health markers observed"
            },
            recommendations: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Concrete agronomic directives for fertilizers, pest management, and watering"
            },
            summary: { 
              type: Type.STRING, 
              description: "A summary assessing this crop's progress and risks" 
            },
            nitrogenStatus: { 
              type: Type.STRING, 
              description: "Must be exactly: 'deficient', 'adequate', or 'optimal'" 
            },
            waterStress: { 
              type: Type.STRING, 
              description: "Must be exactly: 'low', 'moderate', or 'severe'" 
            },
            estimatedYieldChange: { 
              type: Type.STRING, 
              description: "Projected percentage change in ultimate harvest yields, e.g. '+4.5%' or '-15.8%'" 
            }
          },
          required: [
            "ndviTrendText", 
            "healthRating", 
            "diagnostics", 
            "recommendations", 
            "summary", 
            "nitrogenStatus", 
            "waterStress", 
            "estimatedYieldChange"
          ]
        }
      }
    });

    const parsed = JSON.parse(response.text.trim());
    parsed.timestamp = new Date().toISOString();
    return res.json(parsed);

  } catch (error: any) {
    console.error("Gemini AI telemetry processing error:", error);
    res.status(500).json({ error: "Failed to process agronomic telemetry on Gemini AI. Fault: " + error.message });
  }
});


// Express and Vite connection
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NDVI Full-Stack Server booted successfully on http://0.0.0.0:${PORT}`);
  });
}

startServer();
