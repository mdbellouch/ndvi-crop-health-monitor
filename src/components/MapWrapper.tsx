/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Field, LatLng } from '../types';
import { Layers, MapPin, Grid, Plus, Trash2, CheckCircle2, Navigation } from 'lucide-react';

interface MapWrapperProps {
  fields: Field[];
  selectedField: Field | null;
  onSelectField: (field: Field) => void;
  isDrawing: boolean;
  setIsDrawing: (val: boolean) => void;
  drawingPoints: LatLng[];
  setDrawingPoints: React.Dispatch<React.SetStateAction<LatLng[]>>;
  onSaveField: (name: string, cropType: string, plantingDate: string) => Promise<void>;
  ndviHeatmapOpacity: number; // 0 to 1
  selectedLayer: 'ndvi' | 'smap' | 'crop';
}

// Client-side grid cell generator for preloaded fields that don't have them in static datasets
function calculateClientGridCells(polygon: LatLng[]) {
  if (polygon.length < 3) return [];
  
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  for (const p of polygon) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  
  const gridCells = [];
  const latSteps = 6;
  const lngSteps = 6;
  const latDelta = (maxLat - minLat) / latSteps;
  const lngDelta = (maxLng - minLng) / lngSteps;
  
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
      
      const localSoilPatch = Math.sin(gridCentroid.lat * 500) * Math.cos(gridCentroid.lng * 500);
      const elevationDrainage = Math.sin((gridCentroid.lat + gridCentroid.lng) * 300);
      
      let baseGridVal = 0.55 + localSoilPatch * 0.25 + elevationDrainage * 0.15 + spatialSeed * 0.05;
      baseGridVal = Math.max(0.12, Math.min(0.94, baseGridVal));
      
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

export default function MapWrapper({
  fields,
  selectedField,
  onSelectField,
  isDrawing,
  setIsDrawing,
  drawingPoints,
  setDrawingPoints,
  onSaveField,
  ndviHeatmapOpacity,
  selectedLayer
}: MapWrapperProps) {
  const [fieldName, setFieldName] = useState('');
  const [cropType, setCropType] = useState('Corn');
  const [plantingDate, setPlantingDate] = useState('2026-03-15');
  const [saveLoading, setSaveLoading] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const overlaysGroupRef = useRef<any>(null);

  // Load Leaflet dynamically to secure reliable server compilation and runtime load
  const [LInstance, setLInstance] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((m) => {
        setLInstance(m.default || m);
      });
    }
  }, []);

  // Center coordinate locator helper (E.g. Center over selected or first field)
  const initialCenter = selectedField 
    ? selectedField.polygon[0] 
    : (fields[0]?.polygon[0] || { lat: 39.8283, lng: -98.5795 });

  // Initiative Leaflet map instance
  useEffect(() => {
    if (!LInstance || !mapContainerRef.current || mapRef.current) return;

    // Build the leaflet map
    const map = LInstance.map(mapContainerRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: fields.length > 0 ? 14 : 4,
      zoomControl: true,
      attributionControl: false
    });

    // Add high resolution satellite imagery (Esri World Imagery)
    LInstance.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri'
      }
    ).addTo(map);

    // LayerGroup wrapper to allow seamless dynamic clearing and redraw cycles
    const overlaysGroup = LInstance.layerGroup().addTo(map);
    overlaysGroupRef.current = overlaysGroup;

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        overlaysGroupRef.current = null;
      }
    };
  }, [LInstance]);

  // Bind/unbind map click handlers for coordinate capture
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    const handleMapClick = (e: any) => {
      if (!isDrawing) return;
      const clickedLat = e.latlng.lat;
      const clickedLng = e.latlng.lng;
      setDrawingPoints(prev => [...prev, { lat: clickedLat, lng: clickedLng }]);
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [isDrawing, setDrawingPoints]);

  // Handle active drawing styling & cursor
  useEffect(() => {
    if (!mapRef.current) return;
    const container = mapRef.current.getContainer();
    if (isDrawing) {
      container.style.cursor = 'crosshair';
    } else {
      container.style.cursor = '';
    }
  }, [isDrawing]);

  // Zoom center focus synchronizer when selected field evolves
  useEffect(() => {
    if (!mapRef.current || !selectedField || selectedField.polygon.length === 0) return;
    const latlngs = selectedField.polygon.map(pt => [pt.lat, pt.lng]);
    mapRef.current.fitBounds(latlngs, { padding: [45, 45], maxZoom: 16 });
  }, [selectedField]);

  // Render overlay polygon shapes
  useEffect(() => {
    if (!LInstance || !mapRef.current || !overlaysGroupRef.current) return;
    const group = overlaysGroupRef.current;

    // Reset overlay layers completely to prevent coordinate memory leaks
    group.clearLayers();

    // 1. Draw registered farm fields
    fields.forEach((field) => {
      const isSelected = selectedField?.id === field.id;
      const latlngs = field.polygon.map(pt => [pt.lat, pt.lng]);

      const poly = LInstance.polygon(latlngs, {
        color: isSelected ? "#059669" : "#18181b",
        weight: isSelected ? 3.5 : 1.5,
        fillColor: isSelected ? "#10b981" : "#71717a",
        fillOpacity: isSelected ? 0.16 : 0.05,
      });

      // Bind custom selection callback on polygon click
      poly.on('click', (e: any) => {
        LInstance.DomEvent.stopPropagation(e);
        onSelectField(field);
      });

      poly.addTo(group);

      // Render health grid overlay blocks if this field is selected and NDVI active
      if (isSelected && selectedLayer === 'ndvi') {
        let cells = (field as any).gridCells;
        if (!cells) {
          cells = calculateClientGridCells(field.polygon);
        }

        cells.forEach((cell: any) => {
          let fill = "#ef4444"; // poor red
          if (cell.status === 'excellent') fill = "#047857"; // rich green
          else if (cell.status === 'good') fill = "#10b981"; // light green
          else if (cell.status === 'fair') fill = "#f59e0b"; // amber

          const rect = LInstance.rectangle(
            [
              [cell.bounds.south, cell.bounds.west],
              [cell.bounds.north, cell.bounds.east]
            ],
            {
              color: fill,
              weight: 0.8,
              opacity: 0.3,
              fillColor: fill,
              fillOpacity: ndviHeatmapOpacity * 0.72,
              interactive: false
            }
          );
          rect.addTo(group);
        });
      }
    });

    // 2. Render active real-time drawing line and coordinates
    if (isDrawing && drawingPoints.length > 0) {
      const latlngs = drawingPoints.map(pt => [pt.lat, pt.lng]);

      // Connect coordinates path
      LInstance.polyline(latlngs, {
        color: '#10b981',
        weight: 2.5,
        dashArray: '5, 5'
      }).addTo(group);

      // Render high contrast coordinate handles
      drawingPoints.forEach((pt) => {
        LInstance.circleMarker([pt.lat, pt.lng], {
          radius: 4.5,
          color: '#ffffff',
          fillColor: '#18181b',
          fillOpacity: 1,
          weight: 1.5
        }).addTo(group);
      });
    }

  }, [LInstance, fields, selectedField, isDrawing, drawingPoints, ndviHeatmapOpacity, selectedLayer]);

  const handleSaveDrawing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (drawingPoints.length < 3) return;
    setSaveLoading(true);
    try {
      await onSaveField(
        fieldName || `Field Block ${fields.length + 1}`,
        cropType,
        plantingDate
      );
      setFieldName('');
      setIsDrawing(false);
      setDrawingPoints([]);
    } catch (err) {
      console.error(err);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div id="ndvi_map_container" className="relative w-full h-[580px] bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 shadow-lg z-0">
      
      {/* Top action header controls */}
      <div className="absolute top-4 left-4 z-[1001] flex flex-wrap gap-2 items-center">
        {!isDrawing ? (
          <button
            id="start_draw_btn"
            onClick={() => {
              setIsDrawing(true);
              setDrawingPoints([]);
              onSelectField(null as any);
            }}
            className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-805 hover:border-zinc-700 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow-md transition duration-150 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-zinc-100" />
            Draw Farm Boundary
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              id="cancel_draw_btn"
              onClick={() => {
                setIsDrawing(false);
                setDrawingPoints([]);
              }}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium text-xs px-4 py-2.5 rounded-lg border border-zinc-800 shadow-md transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
              Cancel
            </button>
            <div className="bg-zinc-950 border border-zinc-850 text-white font-mono text-[11px] px-4 py-2.5 rounded-lg shadow-md flex items-center gap-2">
              <span className="w-2 h-2 bg-zinc-350 rounded-full animate-pulse"></span>
              Grid Points: {drawingPoints.length} {drawingPoints.length < 3 ? "(Mark min 3)" : ""}
            </div>
          </div>
        )}
      </div>

      {/* Layer metadata context widget in bottom-right margin */}
      <div className="absolute bottom-4 right-4 z-[1001] bg-zinc-950/95 backdrop-blur-md border border-zinc-800 p-4 rounded-xl shadow-2xl w-64 font-sans text-xs text-zinc-300">
        <h4 className="text-white text-xs font-bold mb-2 flex items-center gap-1.5 font-display uppercase tracking-wider">
          <Layers className="text-zinc-300 w-4 h-4" />
          Active Layer Meta
        </h4>
        {selectedLayer === 'ndvi' && (
          <div>
            <p className="mb-2.5 text-[11px] text-zinc-400 leading-relaxed"><strong>Level-1C NDVI</strong>: Displays chlorophyll canopy performance. Green blocks evaluate vigorous reflectance profiles.</p>
            <div className="flex items-center justify-between gap-1 mt-1 font-mono text-[9px] text-zinc-400 pt-1 border-t border-zinc-800">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-600 rounded-sm"></span> High (0.8+)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></span> Med (0.5)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500 rounded-sm"></span> Low (&lt;0.3)</span>
            </div>
          </div>
        )}
        {selectedLayer === 'smap' && (
          <div>
            <p className="text-[11px] text-zinc-400 leading-relaxed"><strong>NASA SMAP Soil Hydrology</strong>: Active microwave polarimetry values measuring 10cm volumetric water fractions.</p>
            <div className="flex items-center justify-between pt-2 text-[9px] font-mono text-zinc-400">
              <span>Arid</span>
              <div className="w-24 h-1.5 bg-gradient-to-r from-amber-200 via-zinc-800 to-emerald-600 rounded"></div>
              <span>Saturated</span>
            </div>
          </div>
        )}
        {selectedLayer === 'crop' && (
          <div>
            <p className="text-[11px] text-zinc-400 leading-relaxed"><strong>USDA Yield almanac overlays</strong>: Historic municipal statistics overlays maps regional bushel potential values.</p>
            <p className="mt-1 text-zinc-300 font-mono text-[9px]">Status: Active free satellite mode</p>
          </div>
        )}
      </div>

      {/* RENDER THE LEAFLET MAP ELEMENT */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Drawing assistant helper */}
      {isDrawing && drawingPoints.length === 0 && (
        <div id="draw_assist_banner" className="absolute top-16 left-1/2 -translate-x-1/2 bg-zinc-950 text-white border border-zinc-800 font-sans text-[11px] px-4 py-2 rounded-lg shadow-md font-semibold flex items-center gap-1.5 pointer-events-none z-[1001]">
          <MapPin className="w-3.5 h-3.5 text-zinc-350 animate-pulse" />
          Click on the interactive Satellite map to plot farm boundary bounds.
        </div>
      )}

      {/* DRAWING SUBMISSION FORM BLOCK overlay */}
      {isDrawing && drawingPoints.length >= 3 && (
        <div id="draw_save_widget" className="absolute bottom-4 left-4 z-[1002] bg-zinc-950/95 backdrop-blur-md border border-zinc-800 p-5 rounded-xl shadow-2xl w-80 font-sans animate-fade-in text-zinc-100">
          <h3 className="text-xs font-bold text-white mb-3 font-display flex items-center gap-1.5 uppercase tracking-wider">
            <CheckCircle2 className="text-zinc-300 w-4 h-4" />
            Plot boundary closed
          </h3>
          <form onSubmit={handleSaveDrawing} className="space-y-3.5">
            <div>
              <label className="block text-[9px] uppercase tracking-wider font-bold text-zinc-400 mb-1">Field/Plot Name</label>
              <input
                type="text"
                required
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="e.g. West Acres Corn field"
                className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-550 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] uppercase tracking-wider font-bold text-zinc-400 mb-1">Crop Type</label>
                <select
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-zinc-500"
                >
                  <option className="bg-zinc-900" value="Corn">Corn</option>
                  <option className="bg-zinc-900" value="Wheat">Wheat</option>
                  <option className="bg-zinc-900" value="Soybeans">Soybeans</option>
                  <option className="bg-zinc-900" value="Cotton">Cotton</option>
                  <option className="bg-zinc-900" value="Rice">Rice</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider font-bold text-zinc-400 mb-1">Plant Date</label>
                <input
                  type="date"
                  value={plantingDate}
                  onChange={(e) => setPlantingDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>
            <button
              id="compute_ndvi_btn"
              type="submit"
              disabled={saveLoading}
              className="w-full bg-white hover:bg-zinc-200 text-zinc-950 disabled:bg-zinc-900 disabled:text-zinc-650 font-bold text-xs py-2.5 rounded-lg shadow-md transition duration-150 mt-2 flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-200"
            >
              {saveLoading ? (
                <>
                  <span className="w-3 h-3 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin"></span>
                  Calculating Spatials...
                </>
              ) : (
                <>
                  <Grid className="w-3.5 h-3.5 text-zinc-950" />
                  Save and Compile NDVI
                </>
              )}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
