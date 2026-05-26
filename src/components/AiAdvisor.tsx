/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Field, AIAnalysisResult } from '../types';
import { 
  Sparkles, 
  ShieldAlert, 
  Activity, 
  Briefcase, 
  CheckSquare, 
  Download,
  Gauge
} from 'lucide-react';

interface AiAdvisorProps {
  field: Field;
  onAnalysisSuccess: (fieldId: string, result: AIAnalysisResult) => void;
  theme?: 'dark' | 'light';
}

export default function AiAdvisor({ field, onAnalysisSuccess, theme = 'dark' }: AiAdvisorProps) {
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Local state for checking off agronomic recommendations as completed
  const [completedRecs, setCompletedRecs] = useState<Record<string, boolean>>({});

  const toggleRec = (text: string) => {
    setCompletedRecs(prev => ({
      ...prev,
      [text]: !prev[text]
    }));
  };

  const handleRunAiAnalysis = async () => {
    setRunningAnalysis(true);
    setError(null);
    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field }),
      });
      
      if (!response.ok) {
        throw new Error(`Satellite Analysis Service returned: ${response.statusText}`);
      }
      
      const data: AIAnalysisResult = await response.json();
      onAnalysisSuccess(field.id, data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to complete AI spectral diagnostics. Check server logs.");
    } finally {
      setRunningAnalysis(false);
    }
  };

  const analysis = field.lastAnalysis;

  // CSV generation function for field NDVI data
  const handleDownloadCsv = () => {
    if (!field.ndviStats || field.ndviStats.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,NDVI,Historical Average,Soil Moisture (%)\n";
    
    field.ndviStats.forEach(pt => {
      csvContent += `${pt.date},${pt.currentNdvi},${pt.historicalAvg},${pt.soilMoisture}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${field.name.replace(/\s+/g, '_')}_NDVI_History.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    document.body.removeChild(link);
  };

  const getNitrogenStyles = (status: 'deficient' | 'adequate' | 'optimal') => {
    if (status === 'optimal') {
      return {
        card: theme === 'dark' ? 'bg-emerald-950/20 border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.06)]' : 'bg-emerald-50 border-emerald-200 shadow-sm',
        badge: theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-250',
        label: theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'
      };
    } else if (status === 'adequate') {
      return {
        card: theme === 'dark' ? 'bg-teal-950/20 border-teal-500/25' : 'bg-teal-50 border-teal-200 shadow-sm',
        badge: theme === 'dark' ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' : 'bg-teal-100 text-teal-800 border-teal-200',
        label: theme === 'dark' ? 'text-teal-400' : 'text-teal-700'
      };
    } else {
      return {
        card: theme === 'dark' ? 'bg-amber-950/20 border-amber-500/25 animate-pulse' : 'bg-amber-50 border-amber-200 shadow-sm',
        badge: theme === 'dark' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-200',
        label: theme === 'dark' ? 'text-amber-400' : 'text-amber-700'
      };
    }
  };

  const getWaterStressStyles = (status: 'low' | 'moderate' | 'severe') => {
    if (status === 'low') {
      return {
        card: theme === 'dark' ? 'bg-blue-950/20 border-blue-500/25 shadow-[0_0_12px_rgba(59,130,246,0.06)]' : 'bg-blue-50 border-blue-200 shadow-sm',
        badge: theme === 'dark' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-blue-105 border-blue-100 text-blue-800 border-blue-200',
        label: theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
      };
    } else if (status === 'moderate') {
      return {
        card: theme === 'dark' ? 'bg-amber-950/20 border-amber-500/25' : 'bg-amber-50 border-amber-200 shadow-sm',
        badge: theme === 'dark' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-800 border-amber-200',
        label: theme === 'dark' ? 'text-amber-400' : 'text-amber-750'
      };
    } else {
      return {
        card: theme === 'dark' ? 'bg-rose-950/20 border-rose-500/25 animate-pulse' : 'bg-rose-50 border-rose-250 border-rose-200 shadow-sm',
        badge: theme === 'dark' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-rose-100 text-rose-800 border-rose-200',
        label: theme === 'dark' ? 'text-rose-400' : 'text-rose-700'
      };
    }
  };

  const getYieldStyles = (val: string) => {
    const isPositive = !val.startsWith('-');
    if (isPositive) {
      return {
        card: theme === 'dark' ? 'bg-lime-950/15 border-lime-500/25 shadow-[0_0_12px_rgba(132,204,22,0.06)]' : 'bg-lime-50 border-lime-200 shadow-sm',
        badge: theme === 'dark' ? 'text-lime-400 font-extrabold text-[13px]' : 'text-lime-700 font-extrabold text-[13px]',
        label: theme === 'dark' ? 'text-lime-400' : 'text-lime-700'
      };
    } else {
      return {
        card: theme === 'dark' ? 'bg-rose-950/15 border-rose-500/25 shadow-sm' : 'bg-rose-50 border-rose-200 shadow-sm',
        badge: theme === 'dark' ? 'text-rose-400 font-extrabold text-[13px]' : 'text-rose-700 font-extrabold text-[13px]',
        label: theme === 'dark' ? 'text-rose-400' : 'text-rose-700'
      };
    }
  };

  return (
    <div id="ai_advisor_card" className={`border-2 p-6 rounded-2xl h-full flex flex-col font-sans transition-all duration-300 ${
      theme === 'dark'
        ? 'bg-zinc-900 border-zinc-800 text-zinc-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)]'
        : 'bg-white border-zinc-200 text-zinc-800 shadow-[0_12px_24px_rgba(16,185,129,0.03)]'
    }`}>
      
      {/* Title & Action desk */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b-2 ${
        theme === 'dark' ? 'border-zinc-800/80' : 'border-zinc-100'
      }`}>
        <div>
          <h3 className={`text-[13px] font-black uppercase tracking-wider font-display flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-emerald-950 font-black'
          }`}>
            <Sparkles className={`w-4 h-4 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-650'}`} />
            Gemini Agronomic Diagnostics Engine
          </h3>
          <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">Advanced reasoning model evaluating chlorophyll absorbances and health anomalies</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {field.ndviStats && (
            <button
              onClick={handleDownloadCsv}
              className={`flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider font-mono px-3.5 py-2 rounded-xl border transition cursor-pointer ${
                theme === 'dark'
                  ? 'bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-white border-zinc-850'
                  : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-805 border-zinc-200'
              }`}
              title="Download raw time-series CSV values"
            >
              <Download className="w-3.5 h-3.5" />
              CSV Export
            </button>
          )}

          <button
            onClick={handleRunAiAnalysis}
            disabled={runningAnalysis}
            className={`flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider font-mono px-4 py-2.5 rounded-xl shadow-md transition cursor-pointer border-2 ${
              theme === 'dark' 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 hover:scale-[1.02] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:border-zinc-800/20' 
                : 'bg-emerald-600 hover:bg-emerald-550 text-white border-emerald-600 hover:scale-[1.02] disabled:bg-zinc-105 disabled:text-zinc-400 disabled:border-zinc-200'
            }`}
          >
            {runningAnalysis ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/35 border-t-white rounded-full animate-spin"></span>
                Evaluating Telemetry...
              </>
            ) : (
              <>
                <Gauge className="w-3.5 h-3.5 text-white" />
                Query Gemini
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-950/30 border-2 border-red-900 p-4 rounded-xl text-xs text-red-300 flex items-start gap-2.5 font-mono shadow-[2px_2px_0px_0px_rgba(239,68,68,0.1)]">
          <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Main Analysis Display Panel */}
      {analysis ? (
        <div className="space-y-6 flex-grow flex flex-col">
          
          {/* Quick Stats overview */}
          <div className="grid grid-cols-3 gap-3">
            
            {/* Nitrogen panel */}
            {(() => {
              const style = getNitrogenStyles(analysis.nitrogenStatus);
              return (
                <div className={`p-3 rounded-xl border text-center transition-all ${style.card}`}>
                  <span className={`block text-[8px] uppercase tracking-widest font-mono font-bold ${
                    theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
                  }`}>Nitrogen</span>
                  <span className={`inline-block font-mono text-[9px] font-bold mt-2 px-2 py-0.5 rounded uppercase border ${style.badge}`}>
                    {analysis.nitrogenStatus}
                  </span>
                </div>
              );
            })()}

            {/* Water stress panel */}
            {(() => {
              const style = getWaterStressStyles(analysis.waterStress);
              return (
                <div className={`p-3 rounded-xl border text-center transition-all ${style.card}`}>
                  <span className={`block text-[8px] uppercase tracking-widest font-mono font-bold ${
                    theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
                  }`}>Water Stress</span>
                  <span className={`inline-block font-mono text-[9px] font-bold mt-2 px-2 py-0.5 rounded uppercase border ${style.badge}`}>
                    {analysis.waterStress}
                  </span>
                </div>
              );
            })()}

            {/* Projected Yield panel */}
            {(() => {
              const style = getYieldStyles(analysis.estimatedYieldChange);
              return (
                <div className={`p-3 rounded-xl border text-center transition-all ${style.card}`}>
                  <span className={`block text-[8px] uppercase tracking-widest font-mono font-bold ${
                    theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
                  }`}>Projected Yield</span>
                  <span className={`block mt-2.5 font-mono ${style.badge}`}>
                    {analysis.estimatedYieldChange}
                  </span>
                </div>
              );
            })()}

          </div>

          {/* AI Agronomic Summary */}
          <div className={`p-5 rounded-xl border ${
            theme === 'dark' 
              ? 'bg-zinc-950/60 border-zinc-800' 
              : 'bg-zinc-50/60 border-zinc-200'
          }`}>
            <h4 className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 flex items-center gap-2 font-display ${
              theme === 'dark' ? 'text-white' : 'text-emerald-950 font-black'
            }`}>
              <Activity className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-zinc-400' : 'text-emerald-650'}`} />
              Executive Agronomic Review
            </h4>
            <p className={`text-xs leading-relaxed font-sans ${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-700'}`}>{analysis.summary}</p>
            <div className={`mt-3 text-[9px] font-mono tracking-wider uppercase border-t pt-2 ${
              theme === 'dark' ? 'border-zinc-800/40 text-zinc-500' : 'border-zinc-200 text-zinc-400'
            }`}>
              Analyzed on: {new Date(analysis.timestamp).toLocaleDateString()} 
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 flex-grow">
            
            {/* Spectral Anomalies / Diagnostics checklist */}
            <div className="space-y-3">
              <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 font-display ${
                theme === 'dark' ? 'text-white' : 'text-zinc-800 font-extrabold'
              }`}>
                <ShieldAlert className="w-3.5 h-3.5 text-zinc-500" />
                Detected Spectral Markers
              </h4>
              <ul className={`space-y-2.5 p-4 rounded-xl border h-44 overflow-y-auto ${
                theme === 'dark' ? 'bg-zinc-950/50 border-zinc-800 text-zinc-300' : 'bg-zinc-50/50 border-zinc-200 text-zinc-700'
              }`}>
                {analysis.diagnostics.map((diag, i) => (
                  <li key={i} className={`text-xs leading-relaxed flex items-start gap-2 border-b pb-1.5 last:border-0 last:pb-0 font-sans ${
                    theme === 'dark' ? 'border-zinc-800/20 text-zinc-300' : 'border-zinc-200/50 text-zinc-650'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                      theme === 'dark' ? 'bg-emerald-400' : 'bg-emerald-600'
                    }`}></span>
                    <span>{diag}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations Manager items with checkboxes */}
            <div className="space-y-3">
              <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 font-display ${
                theme === 'dark' ? 'text-white' : 'text-zinc-800 font-extrabold'
              }`}>
                <Briefcase className="w-3.5 h-3.5 text-zinc-500" />
                Operations Checklist
              </h4>
              <div className={`space-y-2 p-4 rounded-xl border h-44 overflow-y-auto font-sans ${
                theme === 'dark' ? 'bg-zinc-950/50 border-zinc-800' : 'bg-zinc-50/50 border-zinc-200'
              }`}>
                {analysis.recommendations.map((rec, i) => {
                  const isDone = completedRecs[rec] || false;
                  return (
                    <button
                      key={i}
                      onClick={() => toggleRec(rec)}
                      className={`w-full text-left flex items-start gap-2.5 p-2 rounded-lg transition text-xs group cursor-pointer border ${
                        theme === 'dark' 
                          ? 'border-transparent hover:bg-zinc-950/60 hover:border-zinc-800' 
                          : 'border-transparent hover:bg-zinc-100/60 hover:border-zinc-200'
                      }`}
                    >
                      <CheckSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 transition-colors ${
                        isDone 
                          ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-650') 
                          : (theme === 'dark' ? 'text-zinc-650' : 'text-zinc-400')
                      }`} />
                      <span className={`transition-all leading-snug ${
                        isDone 
                          ? 'line-through text-zinc-500 font-light' 
                          : (theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')
                      }`}>
                        {rec}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* Empty advisory layout with placeholder instructions */
        <div className="text-center py-16 flex-grow flex flex-col justify-center items-center font-sans">
          <Sparkles className="w-10 h-10 text-emerald-500/40 mb-4" />
          <h4 className={`text-[11px] font-black uppercase tracking-wider mb-2 ${
            theme === 'dark' ? 'text-zinc-300' : 'text-zinc-750'
          }`}>Agronomic report pending</h4>
          <p className="text-zinc-400 text-xs max-w-sm mx-auto mb-6 leading-relaxed">
            Push "Query Gemini" above to run spatial models and evaluate chlorophyll absorption across the {field.name} variety.
          </p>
          <div className={`text-[9px] px-4 py-2.5 border rounded-xl font-mono text-center max-w-xs leading-relaxed tracking-wider uppercase ${
            theme === 'dark' 
              ? 'bg-zinc-950 border-zinc-850 text-zinc-400' 
              : 'bg-zinc-50 border-zinc-200 text-zinc-600 shadow-sm'
          }`}>
            PLOT ID: {field.id.toUpperCase()} <br />
            POLYGON BOUND: {field.polygon.length} COORD_PAIRS
          </div>
        </div>
      )}

    </div>
  );
}
