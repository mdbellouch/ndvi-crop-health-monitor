/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Field, LatLng, AIAnalysisResult } from './types';
import { PRELOADED_FIELDS } from './preloadedFields';
import MapWrapper from './components/MapWrapper';
import NdviChart from './components/NdviChart';
import AiAdvisor from './components/AiAdvisor';
import { 
  Sprout, 
  MapPin, 
  Layers, 
  Sliders, 
  HelpCircle, 
  X, 
  Leaf, 
  ShieldCheck, 
  Gauge, 
  Info, 
  Check, 
  FileCheck2,
  Trash2,
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react';

export default function App() {
  // Saved farm fields state
  const [fields, setFields] = useState<Field[]>(PRELOADED_FIELDS);
  const [selectedField, setSelectedField] = useState<Field | null>(PRELOADED_FIELDS[0]);
  
  // Theme state control
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ndvi-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'dark';
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('ndvi-theme', next);
      return next;
    });
  };
  
  // Custom layer selector
  const [selectedLayer, setSelectedLayer] = useState<'ndvi' | 'smap' | 'crop'>('ndvi');
  const [ndviHeatmapOpacity, setNdviHeatmapOpacity] = useState<number>(0.55);
  
  // Interactive boundary drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<LatLng[]>([]);
  
  // Save new drawn farm boundary polygon coordinates to backend simulation
  const handleSaveFieldBoundary = async (name: string, cropType: string, plantingDate: string) => {
    if (drawingPoints.length < 3) return;
    try {
      const response = await fetch("/api/fields/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          polygon: drawingPoints,
          cropType,
          name,
          plantingDate
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to process field boundary calculations");
      }
      
      const newField: Field = await response.json();
      setFields(prev => [newField, ...prev]);
      setSelectedField(newField);
    } catch (err) {
      console.error(err);
      alert("Error calculating NDVI overlay statistics");
    }
  };

  // Sync back calculated AI result returned by Express proxy handler
  const handleAnalysisSuccess = (fieldId: string, result: AIAnalysisResult) => {
    setFields(prev => prev.map(f => {
      if (f.id === fieldId) {
        return {
          ...f,
          lastAnalysis: result,
          healthStatus: result.healthRating
        };
      }
      return f;
    }));
    
    // Update active visual focus
    setSelectedField(prev => {
      if (prev && prev.id === fieldId) {
        return {
          ...prev,
          lastAnalysis: result,
          healthStatus: result.healthRating
        };
      }
      return prev;
    });
  };

  // Delete saved field
  const handleDeleteField = (fieldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to remove this field boundary?")) {
      const remaining = fields.filter(f => f.id !== fieldId);
      setFields(remaining);
      if (selectedField?.id === fieldId) {
        setSelectedField(remaining[0] || null);
      }
    }
  };

  // Aggregated totals
  const totalAcres = fields.reduce((acc, f) => acc + f.areaAcres, 0);
  const trackedCropsCount = new Set(fields.map(f => f.cropType)).size;
  const currentAvgNdvi = fields.length > 0 
    ? fields.reduce((acc, f) => {
        const latest = f.ndviStats[f.ndviStats.length - 1];
        return acc + (latest ? latest.currentNdvi : 0);
      }, 0) / fields.length
    : 0;

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col font-sans selection:bg-zinc-800 selection:text-white ${
      theme === 'dark' 
        ? 'bg-zinc-950 text-zinc-100 dark-theme' 
        : 'bg-zinc-50 text-zinc-800 light-theme'
    }`}>
      
      {/* HEADER SECTION - Premium agricultural dashboard header with beautiful auras */}
      <nav id="navbar" className={`border-b-2 ${theme === 'dark' ? 'border-zinc-930 border-zinc-900' : 'border-emerald-500/15'} bg-zinc-900/90 backdrop-blur px-6 py-5 sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl border-2 transition-all duration-300 ${
              theme === 'dark' 
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                : 'bg-emerald-50 text-emerald-650 border-emerald-300/80 shadow-[0_4px_12px_rgba(16,185,129,0.08)]'
            }`}>
              <Sprout className="w-5.5 h-5.5 animate-pulse" />
            </div>
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest font-bold text-zinc-400 block mb-0.5">EST. 2026 // Spatial Agro-Telemetry</span>
              <h1 className="text-xl font-black text-white tracking-tight font-display flex items-center gap-2">
                NDVI Crop Health Monitor
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono border-2 select-none font-bold ${
              theme === 'dark' 
                ? 'bg-zinc-950 border-zinc-800 text-zinc-300' 
                : 'bg-zinc-100 border-zinc-300 text-zinc-700'
            }`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              SAT-LINK: ACTIVE
            </span>
            <button
              id="theme_toggle_btn"
              onClick={toggleTheme}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border-2 transition duration-150 cursor-pointer text-xs font-bold uppercase tracking-wider font-mono shadow-[2px_2px_0px_0px_rgba(255,255,255,0.05)] ${
                theme === 'dark'
                  ? 'bg-zinc-950 hover:bg-zinc-800 text-white border-zinc-800 hover:border-zinc-700'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-850 hover:text-emerald-900 border-emerald-200 hover:border-emerald-300'
              }`}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-zinc-300" />
                  <span>LIGHT PRES_</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-emerald-700" />
                  <span>DARK PRES_</span>
                </>
              )}
            </button>
            <span className={`text-[10px] font-mono font-bold uppercase border px-2 py-1 rounded ${
              theme === 'dark' ? 'text-zinc-500 border-zinc-800/40' : 'text-emerald-700 border-emerald-200/50 Bg-emerald-50/50'
            }`}>V3.2</span>
          </div>

        </div>
      </nav>

      {/* DASHBOARD CONTAINER */}
      <main className="flex-grow max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* METRIC RIBBON - Premium agronomic metrics deck with vibrant dynamic borders and visual high-contrast counters */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 border-2 p-6 rounded-2xl relative overflow-hidden shadow-2xl transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)]' 
            : 'bg-gradient-to-br from-white to-emerald-50/20 border-emerald-300/30 shadow-[0_12px_24px_rgba(16,185,129,0.04)] animate-fade-in'
        }`}>
          {/* Subtle absolute tech annotations */}
          <div className="absolute top-0 right-10 font-mono text-[8px] text-zinc-500 select-none pointer-events-none tracking-widest uppercase">GRID-REF: US-MW-09</div>
          
          <div className="flex items-center gap-3.5 premium-card">
            <div className={`p-3 rounded-xl border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] transition-all duration-300 ${
              theme === 'dark' 
                ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400' 
                : 'bg-emerald-100 border-emerald-300 text-emerald-850'
            }`}>
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className={`block text-[9px] uppercase tracking-widest font-bold font-mono ${theme === 'dark' ? 'text-zinc-400' : 'text-emerald-800/80'}`}>Total Acreage</span>
              <span className={`text-xl font-bold font-mono tracking-tight ${theme === 'dark' ? 'text-white' : 'text-emerald-950'}`}>{totalAcres.toFixed(1)} <span className="text-xs font-light text-zinc-500 font-sans">Ac</span></span>
            </div>
          </div>

          <div className="flex items-center gap-3.5 premium-card">
            <div className={`p-3 rounded-xl border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] transition-all duration-300 ${
              theme === 'dark' 
                ? 'bg-amber-950/50 border-amber-500/30 text-amber-400' 
                : 'bg-amber-100 border-amber-300 text-amber-850'
            }`}>
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <span className={`block text-[9px] uppercase tracking-widest font-bold font-mono ${theme === 'dark' ? 'text-zinc-400' : 'text-amber-800'}`}>Crop Varieties</span>
              <span className={`text-xl font-bold font-mono tracking-tight ${theme === 'dark' ? 'text-white' : 'text-amber-955 text-zinc-900'}`}>{trackedCropsCount} <span className="text-xs font-light text-zinc-500 font-sans">Types</span></span>
            </div>
          </div>

          <div className="flex items-center gap-3.5 premium-card">
            <div className={`p-3 rounded-xl border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] transition-all duration-300 ${
              theme === 'dark' 
                ? 'bg-sky-950/50 border-sky-500/30 text-sky-400' 
                : 'bg-sky-100 border-sky-300 text-sky-850'
            }`}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className={`block text-[9px] uppercase tracking-widest font-bold font-mono ${theme === 'dark' ? 'text-zinc-400' : 'text-sky-800'}`}>Mapped Tracts</span>
              <span className={`text-xl font-bold font-mono tracking-tight ${theme === 'dark' ? 'text-white' : 'text-sky-950'}`}>{fields.length} <span className="text-xs font-light text-zinc-500 font-sans">Plots</span></span>
            </div>
          </div>

          <div className="flex items-center gap-3.5 premium-card">
            <div className={`p-3 rounded-xl border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] transition-all duration-300 ${
              theme === 'dark' 
                ? 'bg-teal-950/50 border-teal-500/30 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)]' 
                : 'bg-teal-100 border-teal-300 text-teal-850 shadow-[0_5px_15px_rgba(20,184,166,0.08)]'
            }`}>
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <span className={`block text-[9px] uppercase tracking-widest font-bold font-mono ${theme === 'dark' ? 'text-zinc-400' : 'text-teal-800'}`}>Seasonal Mean NDVI</span>
              <span className={`text-xl font-bold font-mono tracking-tight ${theme === 'dark' ? 'text-white' : 'text-teal-950'}`}>{currentAvgNdvi.toFixed(2)}</span>
            </div>
          </div>

        </div>

        {/* WORKSPACE LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* SIDEBAR: FIELDS SELECTOR */}
          <div className="lg:col-span-4 space-y-6 flex flex-col h-[580px] lg:h-auto">
            
            <div className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-5 flex flex-col flex-grow overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)]">
              <div className="mb-4">
                <h3 className="text-white text-sm font-bold font-display flex items-center justify-between">
                  <span className="uppercase tracking-wider">Tract Registry</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-zinc-950 text-white font-mono font-bold border border-zinc-850">{fields.length} ACTIVE</span>
                </h3>
                <p className="text-zinc-400 text-xs mt-1 leading-relaxed">Select or draw a tract boundary below to compute high-res NDVI stats.</p>
              </div>

              {/* Fields List */}
              <div id="fields_registry_list" className="space-y-3 overflow-y-auto flex-grow pr-1">
                {fields.map((field) => {
                  const isSelected = selectedField?.id === field.id;
                  const latestNdvi = field.ndviStats[field.ndviStats.length - 1]?.currentNdvi || 0.15;
                  const firstCoord = field.polygon[0] || { lat: 0, lng: 0 };
                  
                  // Get colorful health status styling
                  const statusBadgeStyle = () => {
                    switch(field.healthStatus) {
                      case 'excellent':
                        return theme === 'dark' 
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      case 'good':
                        return theme === 'dark' 
                          ? 'bg-lime-950/40 text-lime-400 border-lime-500/30' 
                          : 'bg-lime-50 text-lime-700 border-lime-200';
                      case 'fair':
                        return theme === 'dark' 
                          ? 'bg-amber-950/40 text-amber-400 border-amber-500/30' 
                          : 'bg-amber-50 text-amber-705 border-amber-500';
                      case 'poor':
                        return theme === 'dark' 
                          ? 'bg-rose-950/50 text-rose-450 border-rose-500/30' 
                          : 'bg-rose-50 text-rose-700 border-rose-200';
                      default:
                        return 'bg-zinc-950 text-zinc-400 border-zinc-800';
                    }
                  };

                  return (
                    <div
                      key={field.id}
                      onClick={() => {
                        if (!isDrawing) {
                          setSelectedField(field);
                        }
                      }}
                      className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none premium-card ${
                        isDrawing ? "opacity-30 pointer-events-none" : ""
                      } ${
                        isSelected 
                          ? (theme === 'dark' 
                              ? 'bg-zinc-950 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20' 
                              : 'bg-white border-emerald-500 shadow-[0_10px_25px_rgba(16,185,129,0.12)]')
                          : (theme === 'dark'
                              ? 'bg-zinc-900/60 border-zinc-805 border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700'
                              : 'bg-white border-zinc-205 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300')
                      }`}
                    >
                      {/* Active agricultural green edge indicator */}
                      {isSelected && (
                        <div className="absolute top-0 bottom-0 left-0 w-1.5 rounded-l-xl bg-emerald-500"></div>
                      )}

                      <div className="flex items-start justify-between gap-1 mb-2">
                        <div>
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider block font-bold">
                            TRACT {field.id.slice(0, 5).toUpperCase()}
                          </span>
                          <h4 className={`text-sm font-black font-display tracking-tight leading-snug mt-0.5 ${
                            isSelected 
                              ? (theme === 'dark' ? 'text-white' : 'text-emerald-950')
                              : (theme === 'dark' ? 'text-zinc-100' : 'text-zinc-900')
                          }`}>{field.name}</h4>
                          <span className={`text-[10px] font-mono mt-1 inline-block border px-2 py-0.5 rounded ${
                            theme === 'dark' 
                              ? 'text-zinc-400 border-zinc-800 bg-zinc-950/40' 
                              : 'text-zinc-600 border-zinc-200 bg-zinc-50'
                          }`}>
                            {field.cropType} • {field.plantingDate}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${statusBadgeStyle()}`}>
                            {field.healthStatus.toUpperCase()}
                          </span>

                          <button
                            onClick={(e) => handleDeleteField(field.id, e)}
                            className={`p-1.5 rounded border transition cursor-pointer shadow-[1px_1px_0px_0px_rgba(255,255,255,0.05)] ${
                              theme === 'dark'
                                ? 'bg-zinc-950 hover:bg-red-950/40 border-zinc-800 hover:border-red-900 text-zinc-400 hover:text-red-400'
                                : 'bg-zinc-50 hover:bg-red-50 hover:border-red-200 text-zinc-500 hover:text-red-600'
                            }`}
                            title="Remove field"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className={`flex items-center justify-between border-t border-dotted mt-3 pt-2.5 text-[10px] font-mono ${
                        theme === 'dark' ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-500'
                      }`}>
                        <span className={theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'}>
                          {firstCoord.lat.toFixed(4)}°N, {firstCoord.lng.toFixed(4)}°W
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className={theme === 'dark' ? 'text-zinc-500 text-[9px] uppercase' : 'text-zinc-450 text-[9px] uppercase'}>NDVI:</span>
                          <strong className={`font-black text-xs ${
                            latestNdvi >= 0.7 
                              ? 'text-emerald-500' 
                              : latestNdvi >= 0.5 
                                ? 'text-lime-500' 
                                : latestNdvi >= 0.3 
                                  ? 'text-amber-500' 
                                  : 'text-rose-500'
                          }`}>{latestNdvi.toFixed(2)}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}

                {fields.length === 0 && (
                  <div className="text-center py-12">
                    <Sprout className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-zinc-500 text-xs font-mono">No tracts drawn yet</p>
                  </div>
                )}
              </div>

              {/* Clear setup call out */}
              <div className="mt-4 border-t-2 border-zinc-800 pt-4">
                <p className="text-[10px] text-zinc-400 leading-relaxed flex items-center gap-2 bg-zinc-950 p-3 rounded-xl border border-zinc-850 font-mono">
                  <Info className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                  Calculations leverage real-time spectral response simulation derived from ESA Sentinel-2 channels.
                </p>
              </div>

            </div>

          </div>

          {/* MAIN VIEWPORT: LAYER SWITCHER + MAPWRAPPER */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* LAYER TAB SWITCHER */}
            <div className={`border-2 p-2 rounded-2xl flex flex-wrap items-center justify-between gap-3 transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-zinc-900 border-zinc-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)]'
                : 'bg-white border-zinc-200 shadow-[0_8px_30px_rgba(16,185,129,0.03)]'
            }`}>
                         <div className="flex items-center flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedLayer('ndvi')}
                  className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider font-mono px-4 py-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedLayer === 'ndvi' 
                      ? (theme === 'dark' 
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 shadow-[0_2px_10px_rgba(16,185,129,0.12)]' 
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-[0_4px_12px_rgba(16,185,129,0.05)]') 
                      : (theme === 'dark'
                          ? 'text-zinc-400 hover:text-white hover:bg-zinc-850 border-transparent'
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border-transparent')
                  }`}
                >
                  <Leaf className={`w-3.5 h-3.5 ${
                    selectedLayer === 'ndvi' 
                      ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600') 
                      : 'text-zinc-500'
                  }`} />
                  VEGETATION (NDVI)
                </button>

                <button
                  onClick={() => setSelectedLayer('smap')}
                  className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider font-mono px-4 py-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedLayer === 'smap' 
                      ? (theme === 'dark' 
                          ? 'bg-sky-950/40 text-sky-400 border-sky-505 border-sky-500/40 shadow-[0_2px_10px_rgba(14,165,233,0.12)]' 
                          : 'bg-sky-50 text-sky-800 border-sky-300 shadow-[0_4px_12px_rgba(14,165,233,0.05)]') 
                      : (theme === 'dark'
                          ? 'text-zinc-400 hover:text-white hover:bg-zinc-850 border-transparent'
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border-transparent')
                  }`}
                >
                  <FileCheck2 className={`w-3.5 h-3.5 ${
                    selectedLayer === 'smap' 
                      ? (theme === 'dark' ? 'text-sky-400' : 'text-sky-600') 
                      : 'text-zinc-500'
                  }`} />
                  HYDROLOGY (SMAP)
                </button>

                <button
                  onClick={() => setSelectedLayer('crop')}
                  className={`flex items-center gap-2 font-bold text-xs uppercase tracking-wider font-mono px-4 py-2.5 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedLayer === 'crop' 
                      ? (theme === 'dark' 
                          ? 'bg-amber-950/40 text-amber-450 border-amber-500/40 shadow-[0_2px_10px_rgba(245,158,11,0.12)]' 
                          : 'bg-amber-50 text-amber-800 border-amber-305 border-amber-300 shadow-[0_4px_12px_rgba(245,158,11,0.05)]') 
                      : (theme === 'dark'
                          ? 'text-zinc-400 hover:text-white hover:bg-zinc-850 border-transparent'
                          : 'text-zinc-650 hover:text-zinc-900 hover:bg-zinc-50 border-transparent')
                  }`}
                >
                  <Sliders className={`w-3.5 h-3.5 ${
                    selectedLayer === 'crop' 
                      ? (theme === 'dark' ? 'text-amber-400' : 'text-amber-600') 
                      : 'text-zinc-500'
                  }`} />
                  USDA ALMANAC
                </button>
              </div>

              {/* Sliders Opacity control */}
              {selectedLayer === 'ndvi' && (
                <div className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border transition-all duration-300 ${
                  theme === 'dark' 
                    ? 'bg-zinc-950 border-zinc-850 text-zinc-300' 
                    : 'bg-zinc-50 border-zinc-200 text-zinc-700 shadow-sm'
                }`}>
                  <span className="text-[10px] font-mono tracking-wider text-zinc-400 uppercase font-bold">OPACITY:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    className={`w-20 h-1.5 rounded cursor-pointer ${theme === 'dark' ? 'accent-emerald-400 bg-zinc-800' : 'accent-emerald-600 bg-zinc-200'}`}
                    value={ndviHeatmapOpacity}
                    onChange={(e) => setNdviHeatmapOpacity(parseFloat(e.target.value))}
                  />
                  <span className={`text-[10px] font-mono font-bold min-w-8 text-right ${theme === 'dark' ? 'text-white' : 'text-zinc-950'}`}>{Math.round(ndviHeatmapOpacity * 100)}%</span>
                </div>
              )}

            </div>

            {/* MAP BOARD WRAPPER */}
            <MapWrapper
              fields={fields}
              selectedField={selectedField}
              onSelectField={setSelectedField}
              isDrawing={isDrawing}
              setIsDrawing={setIsDrawing}
              drawingPoints={drawingPoints}
              setDrawingPoints={setDrawingPoints}
              onSaveField={handleSaveFieldBoundary}
              ndviHeatmapOpacity={ndviHeatmapOpacity}
              selectedLayer={selectedLayer}
            />

          </div>

        </div>

        {/* BOTTOM METRIC REPORTS GRID (1:1 SPLIT NDVI VS DIAGNOSTICS) */}
        {selectedField ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            
            {/* TIME-SERIES COMPARISON DETAILS */}
            <div>
              <NdviChart field={selectedField} theme={theme} />
            </div>

            {/* SPECTRALS DIAGNOSTICS DECK */}
            <div>
              <AiAdvisor 
                field={selectedField} 
                onAnalysisSuccess={handleAnalysisSuccess} 
                theme={theme}
              />
            </div>

          </div>
        ) : (
          <div className="bg-zinc-900 border border-zinc-805 border-zinc-800 rounded-xl p-10 text-center py-16">
            <MapPin className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
            <h3 className="text-zinc-200 text-sm font-bold font-display">No Plot Active</h3>
            <p className="text-zinc-400 text-xs mt-1">Select or draw a field boundary in the registry portfolio above to unlock spectral analysis decks.</p>
          </div>
        )}

      </main>

      {/* FOOTER METRICS AND METAS */}
      <footer className="border-t border-zinc-805 border-zinc-800 bg-zinc-900 py-6 mt-12 text-zinc-500 text-xs">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
          <p>© 2026 NDVI Crop Health Monitor. Spatial imagery sourced from ESA Sentinel-2.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> GEE services synced
            </span>
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span> Gemini AI engine active
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
