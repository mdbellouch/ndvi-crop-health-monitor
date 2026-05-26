/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { Field } from '../types';
import { TrendingUp, Award, Droplets, Calendar, BarChart3 } from 'lucide-react';

interface NdviChartProps {
  field: Field;
  theme?: 'dark' | 'light';
}

export default function NdviChart({ field, theme = 'dark' }: NdviChartProps) {
  const data = field.ndviStats;
  
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 bg-zinc-900 border border-zinc-800 rounded-xl">
        <p className="text-zinc-500 font-sans text-xs font-mono">No NDVI telemetry points captured for this plot</p>
      </div>
    );
  }

  // Calculate stats for highlights
  const currentMonthData = data[data.length - 1];
  const peakPoint = [...data].sort((a, b) => b.currentNdvi - a.currentNdvi)[0];
  const avgCurrent = data.reduce((acc, curr) => acc + curr.currentNdvi, 0) / data.length;
  const avgHistoric = data.reduce((acc, curr) => acc + curr.historicalAvg, 0) / data.length;
  const healthDelta = currentMonthData.currentNdvi - currentMonthData.historicalAvg;

  return (
    <div id="ndvi_chart_container" className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] font-sans text-zinc-100">
      
      {/* Title & info header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-800/40">
        <div>
          <h3 className="text-white text-[13px] font-black uppercase tracking-wider font-display flex items-center gap-2">
            <BarChart3 className="text-white w-4 h-4" />
            Vegetation Performance Almanac (NDVI)
          </h3>
          <p className="text-zinc-400 text-xs mt-0.5 leading-relaxed">Dual-stream comparison: active seasonal canopy reflectance vs. historic normal indices</p>
        </div>
        
        <div className="flex items-center gap-1.5 bg-zinc-950 px-3.5 py-1.5 rounded-xl border border-zinc-850 shadow-[1px_1px_0px_0px_rgba(255,255,255,0.03)] text-right">
          <Calendar className="text-zinc-400 w-3.5 h-3.5" />
          <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-zinc-300">PLANTED: {field.plantingDate}</span>
        </div>
      </div>

      {/* Metrics bento row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        <div className={`p-4.5 rounded-xl border transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-emerald-950/15 border-emerald-500/20 shadow-[0_4px_15px_rgba(16,185,129,0.04)]' 
            : 'bg-emerald-50/40 border-emerald-200/60 shadow-[0_4px_10px_rgba(16,185,129,0.02)]'
        }`}>
          <div className={`text-[8px] font-bold uppercase tracking-wider font-mono mb-1 ${theme === 'dark' ? 'text-emerald-405 text-emerald-400' : 'text-emerald-805 text-emerald-700'}`}>Latest NDVI</div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-mono font-black ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-800'}`}>{currentMonthData.currentNdvi.toFixed(2)}</span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
              healthDelta >= 0 
                ? (theme === 'dark' ? 'bg-emerald-500/10 text-emerald-355 text-emerald-400 border-emerald-500/20' : 'bg-emerald-100 text-emerald-800 border-emerald-300') 
                : 'bg-rose-950/20 text-rose-400 border-rose-950/30'
            }`}>
              {healthDelta >= 0 ? `+${healthDelta.toFixed(2)}` : healthDelta.toFixed(2)}
            </span>
          </div>
          <p className="text-[9px] text-zinc-500 font-mono mt-1">Vs Mean: {currentMonthData.historicalAvg.toFixed(2)}</p>
        </div>

        <div className={`p-4.5 rounded-xl border transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-lime-950/15 border-lime-500/20 shadow-[0_4px_15px_rgba(132,204,22,0.04)]' 
            : 'bg-lime-50/40 border-lime-200/60 shadow-[0_4px_10px_rgba(132,204,22,0.02)]'
        }`}>
          <div className={`text-[8px] font-bold uppercase tracking-wider font-mono mb-1 ${theme === 'dark' ? 'text-lime-400' : 'text-lime-700'}`}>Peak Index</div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-mono font-black ${theme === 'dark' ? 'text-lime-400' : 'text-lime-800'}`}>{peakPoint.currentNdvi.toFixed(2)}</span>
            <span className="text-zinc-500 text-[9px] font-mono tracking-tight ml-1">{peakPoint.date}</span>
          </div>
          <p className="text-[9px] text-zinc-500 font-mono mt-1">Max biomass density</p>
        </div>

        <div className={`p-4.5 rounded-xl border transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-sky-950/15 border-sky-050 border-sky-500/20 shadow-[0_4px_15px_rgba(14,165,233,0.04)]' 
            : 'bg-sky-50/40 border-sky-200/60 shadow-[0_4px_10px_rgba(14,165,233,0.02)]'
        }`}>
          <div className={`text-[8px] font-bold uppercase tracking-wider font-mono mb-1 ${theme === 'dark' ? 'text-sky-400' : 'text-sky-700'}`}>Soil Moisture</div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-mono font-black ${theme === 'dark' ? 'text-sky-405 text-sky-400' : 'text-sky-800'}`}>{field.soilMoisture}%</span>
            <Droplets className={`w-4 h-4 ml-1 ${theme === 'dark' ? 'text-sky-400' : 'text-sky-600'}`} />
          </div>
          <p className="text-[9px] text-zinc-500 font-mono mt-1">NASA SMAP telemetry</p>
        </div>

        <div className={`p-4.5 rounded-xl border transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-teal-950/15 border-teal-500/20 shadow-[0_4px_15px_rgba(20,184,166,0.04)]' 
            : 'bg-teal-50/40 border-teal-200/60 shadow-[0_4px_10px_rgba(20,184,166,0.02)]'
        }`}>
          <div className={`text-[8px] font-bold uppercase tracking-wider font-mono mb-1 ${theme === 'dark' ? 'text-teal-400' : 'text-teal-700'}`}>Season Delta</div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-mono font-black ${theme === 'dark' ? 'text-teal-405 text-teal-400' : 'text-teal-800'}`}>
              {avgCurrent >= avgHistoric ? '+' : ''}{((avgCurrent - avgHistoric) / (avgHistoric || 1) * 100).toFixed(1)}%
            </span>
            <TrendingUp className={`w-4 h-4 ml-1 ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`} />
          </div>
          <p className="text-[9px] text-zinc-500 font-mono mt-1">Seasonal canopy shift</p>
        </div>

      </div>

      {/* Main interactive Recharts timeline */}
      <div className="h-72 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorNdvi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#27272a' : '#e4e4e7'} vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke={theme === 'dark' ? '#71717a' : '#a1a1aa'} 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              dy={10}
            />
            <YAxis 
              domain={[0, 1.0]} 
              stroke={theme === 'dark' ? '#71717a' : '#a1a1aa'} 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              dx={-5}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff',
                borderColor: theme === 'dark' ? '#27272a' : '#e4e4e7',
                borderRadius: '8px',
                color: theme === 'dark' ? '#f4f4f5' : '#18181b',
                fontSize: '11px',
                fontFamily: 'sans-serif',
                boxShadow: theme === 'dark' ? '0 10px 15px -3px rgba(0, 0, 0, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              labelClassName={`font-bold font-display mb-1 ${theme === 'dark' ? 'text-white' : 'text-zinc-900'}`}
            />
            <Legend 
              verticalAlign="top" 
              height={36} 
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', color: theme === 'dark' ? '#e4e4e7' : '#27272a' }}
            />
            
            {/* Reference benchmarks */}
            <ReferenceLine y={0.2} stroke={theme === 'dark' ? '#71717a' : '#a1a1aa'} strokeDasharray="3 3" label={{ value: 'Bare Soil (0.2)', fill: theme === 'dark' ? '#a1a1aa' : '#52525b', fontSize: 8, position: 'insideBottomRight' }} />
            <ReferenceLine y={0.7} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'High Vigour (0.7)', fill: '#10b981', fontSize: 8, position: 'insideTopRight' }} />

            {/* Current Season Area */}
            <Area 
              name="Active Season NDVI" 
              type="monotone" 
              dataKey="currentNdvi" 
              stroke="#10b981" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorNdvi)" 
            />
            
            {/* Historical Area */}
            <Area 
              name="5-Year Historical Average" 
              type="monotone" 
              dataKey="historicalAvg" 
              stroke="#0ea5e9" 
              strokeWidth={2}
              strokeDasharray="4 4"
              fillOpacity={1} 
              fill="url(#colorAvg)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-4 text-zinc-400 text-xs">
        <p className="flex items-center gap-1.5 leading-relaxed text-[11px]">
          <Award className="text-zinc-350 w-4 h-4 flex-shrink-0" />
          Healthy canopy targets align with standard NDVI metrics between <strong>0.50 – 0.85</strong>.
        </p>
        <span className="text-[9px] uppercase font-mono text-zinc-650 tracking-wider">data source: ESA Sentinel-2</span>
      </div>

    </div>
  );
}
