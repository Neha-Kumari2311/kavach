'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const API_BASE = 'https://kavach-ai-523i.onrender.com';

const REPORT_CATEGORIES = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'assault', label: 'Assault' },
  { value: 'stalking', label: 'Stalking' },
  { value: 'unsafe_area', label: 'Unsafe Area' },
];

function getThreatLevel(score) {
  if (score >= 70) return { level: 'LOW', color: 'text-emerald-500', bg: 'bg-emerald-500', ring: 'stroke-emerald-500', barColor: 'bg-emerald-500' };
  if (score >= 40) return { level: 'MODERATE', color: 'text-amber-500', bg: 'bg-amber-500', ring: 'stroke-amber-500', barColor: 'bg-amber-500' };
  return { level: 'HIGH', color: 'text-red-500', bg: 'bg-red-500', ring: 'stroke-red-500', barColor: 'bg-red-500' };
}

export default function PredictSafetyPage() {
  const pathname = usePathname();
  const router = useRouter();

  // Prediction state
  const [userInput, setUserInput] = useState('');
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [predictionError, setPredictionError] = useState('');

  // Prediction history state (from localStorage)
  const [predictionHistory, setPredictionHistory] = useState([]);

  // Report state
  const [reportText, setReportText] = useState('');
  const [reportCategory, setReportCategory] = useState('harassment');
  const [reportLocation, setReportLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState('');
  const [reportError, setReportError] = useState('');

  // ── Load prediction history from localStorage on mount ──
  useEffect(() => {
    try {
      const stored = localStorage.getItem('kavach_prediction_history');
      if (stored) {
        setPredictionHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load prediction history:', e);
    }
  }, []);


  // ── Predict Safety ──
  const handlePredict = async () => {
    if (!userInput.trim()) return;
    setPredicting(true);
    setPrediction(null);
    setPredictionError('');

    try {
      const params = new URLSearchParams({ user_input: userInput.trim() });
      const res = await fetch(`${API_BASE}/smart_risk?${params}`, { method: 'POST' });
      if (!res.ok) throw new Error(`Server error (${res.status})`);
      const data = await res.json();
      setPrediction(data);

      // ── Store prediction in localStorage with timestamp ──
      const riskScore = data?.risk_score ?? data?.safety_score ?? data?.score ?? null;
      if (riskScore !== null) {
        const historyEntry = {
          timestamp: Date.now(),
          riskScore: riskScore,
          safetyScore: Math.round((1 - riskScore) * 100),
          query: userInput.trim(),
          location: data?.detected_location || null,
        };

        try {
          const existing = JSON.parse(localStorage.getItem('kavach_prediction_history') || '[]');
          // Keep last 50 predictions max
          const updated = [...existing, historyEntry].slice(-50);
          localStorage.setItem('kavach_prediction_history', JSON.stringify(updated));
          setPredictionHistory(updated);
        } catch (e) {
          console.error('Failed to save prediction history:', e);
        }
      }
    } catch (err) {
      setPredictionError(err.message || 'Failed to get prediction. Please try again.');
    } finally {
      setPredicting(false);
    }
  };

  // ── Submit Report ──
  const handleReport = async () => {
    if (!reportText.trim()) return;
    setSubmitting(true);
    setReportSuccess('');
    setReportError('');

    try {
      const hasLocation = reportLocation.trim().length > 0;
      const endpoint = hasLocation ? '/report_location' : '/report';
      const params = hasLocation
        ? new URLSearchParams({ location: reportLocation.trim(), category: reportCategory })
        : new URLSearchParams({ user_input: reportText.trim(), category: reportCategory });

      const res = await fetch(`${API_BASE}${endpoint}?${params}`, { method: 'POST' });
      if (!res.ok) throw new Error(`Server error (${res.status})`);

      setReportSuccess('Report submitted successfully. Thank you for keeping the community safe!');
      setReportText('');
      setReportCategory('harassment');
      setReportLocation('');
      setTimeout(() => setReportSuccess(''), 5000);
    } catch (err) {
      setReportError(err.message || 'Failed to submit report. Please try again.');
      setTimeout(() => setReportError(''), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  // Extract score from AI response
  const rawRisk = prediction?.risk_score ?? prediction?.safety_score ?? prediction?.score ?? null;
  const safetyScore = rawRisk !== null ? Math.round((1 - rawRisk) * 100) : null;
  const riskLevel = prediction?.risk_level ?? '';
  const explanation = prediction?.summary ?? prediction?.explanation ?? prediction?.message ?? '';
  const safetyAdvice = prediction?.safety_advice ?? prediction?.tips ?? null;
  const detectedLocation = prediction?.detected_location ?? null;
  const timeContext = prediction?.time_context ?? null;
  const emergency = prediction?.emergency ?? null;
  const predBreakdown = prediction?.breakdown ?? null;
  const predEnvironment = prediction?.environment ?? null;
  const predDataFactors = prediction?.data_factors ?? null;

  const threat = safetyScore !== null ? getThreatLevel(safetyScore) : null;

  return (
    <div className="px-4 max-w-2xl mx-auto w-full space-y-5 pt-4 pb-4">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-extrabold">AI Safety Analysis</h1>
          <p className="text-xs text-slate-500 mt-1">Predictive insights powered by KAVACH-AI. Real-time monitoring of environmental risks and network safety.</p>
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-[#6C47FF] rounded-full">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            <span className="text-[10px] text-white font-bold">Live Monitoring Active</span>
          </div>
        </div>

        {/* Input Section */}
        <section className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 space-y-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">travel_explore</span>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePredict()}
              placeholder="Where are you going? e.g. Going to Delhi tonight"
              className="w-full pl-10 pr-4 py-3.5 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#6C47FF]/50 focus:border-[#6C47FF] outline-none transition-all placeholder:text-slate-400"
              disabled={predicting}
            />
          </div>

          <button
            onClick={handlePredict}
            disabled={predicting || !userInput.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-[#6C47FF] to-[#8B6AFF] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[#6C47FF]/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {predicting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Analyzing...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">insights</span>
                Analyze Safety
              </>
            )}
          </button>

          {predictionError && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-lg">error</span>
              <p className="text-sm text-red-600 dark:text-red-400 flex-1">{predictionError}</p>
              <button onClick={() => setPredictionError('')} className="text-red-500">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          )}
        </section>

        {/* ═══ Results Section ═══ */}
        {prediction && safetyScore !== null && (
          <>
            {/* Current Threat Level Card */}
            <section className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Current Threat Level</p>
              
              <div className="flex flex-col items-center">
                {/* Circular gauge */}
                <div className="relative w-36 h-36 mb-3">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeWidth="8" />
                    <circle cx="60" cy="60" r="50" fill="none" className={threat.ring} strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${(safetyScore / 100) * 314.16} 314.16`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-3xl font-black ${threat.color}`}>{threat.level}</span>
                    <span className="text-[10px] text-slate-500">Zone: {(rawRisk * 100).toFixed(1)}% Risk</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${threat.barColor}`} style={{ width: `${safetyScore}%` }}></div>
                </div>
              </div>
            </section>

            {/* Safety Confidence Score — now with REAL data factors */}
            <section className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-base mb-1">Safety Confidence Score</h3>
              <p className="text-[10px] text-slate-500 mb-4">
                Based on {predDataFactors ? predDataFactors.total_signals_used : 5} real-time data signals.
              </p>
              
              <div className="flex items-end gap-2 mb-4">
                <span className={`text-5xl font-black ${threat.color}`}>{safetyScore}</span>
                <span className="text-lg text-slate-400 font-bold mb-1">/ 100</span>
              </div>

              {/* Real environment data from API */}
              {predEnvironment && (
                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Population Density</span>
                    <span className={`font-bold ${threat.color} capitalize`}>{predEnvironment.population_density}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Infrastructure</span>
                    <span className={`font-bold ${threat.color}`}>{predEnvironment.infrastructure}</span>
                  </div>
                  {predEnvironment.elements_nearby >= 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Safety Elements Scanned</span>
                      <span className="font-bold text-slate-600 dark:text-slate-300">{predEnvironment.elements_nearby}</span>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Score Breakdown — real data */}
            {predBreakdown && (
              <section className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#6C47FF] text-lg">analytics</span>
                  Score Breakdown
                </h3>
                <div className="space-y-3">
                  {/* Historical Baseline */}
                  {predBreakdown.historical_baseline != null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Historical Baseline{predBreakdown.baseline_source ? ` (${predBreakdown.baseline_source})` : ''}</span>
                        <span className="font-bold">{Math.round(predBreakdown.historical_baseline * 100)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${predBreakdown.historical_baseline * 100}%` }}></div>
                      </div>
                    </div>
                  )}
                  {/* Realtime Signal */}
                  {predBreakdown.realtime_signal != null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Realtime Incidents (6h)</span>
                        <span className="font-bold">{Math.round(predBreakdown.realtime_signal * 100)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-red-500" style={{ width: `${predBreakdown.realtime_signal * 100}%` }}></div>
                      </div>
                    </div>
                  )}
                  {/* Infrastructure — only show if v3 backend provides it */}
                  {predBreakdown.infrastructure_score != null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Infrastructure Safety</span>
                        <span className="font-bold">{Math.round(predBreakdown.infrastructure_score * 100)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${predBreakdown.infrastructure_score * 100}%` }}></div>
                      </div>
                    </div>
                  )}
                  {/* Density — only show if v3 backend provides it */}
                  {predBreakdown.density_score != null && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Area Density</span>
                        <span className="font-bold">{Math.round(predBreakdown.density_score * 100)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${predBreakdown.density_score * 100}%` }}></div>
                      </div>
                    </div>
                  )}
                  {/* Mid-term signal */}
                  {predBreakdown.mid_term_signal != null && predBreakdown.mid_term_signal > 0 && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Mid-term Signal (6-24h)</span>
                        <span className="font-bold">{Math.round(predBreakdown.mid_term_signal * 100)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-orange-500" style={{ width: `${predBreakdown.mid_term_signal * 100}%` }}></div>
                      </div>
                    </div>
                  )}
                  {/* Time Multiplier */}
                  {predBreakdown.time_multiplier != null && (
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500">Time-of-Day Multiplier</span>
                      <span className={`font-bold ${predBreakdown.time_multiplier > 1 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        ×{predBreakdown.time_multiplier}
                      </span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Data Sources — real signals used */}
            {predDataFactors && predDataFactors.signals && (
              <section className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-xs mb-3 flex items-center gap-2 text-slate-400 uppercase tracking-wider">
                  <span className="material-symbols-outlined text-sm">database</span>
                  Data Sources Used
                </h3>
                <div className="space-y-2">
                  {predDataFactors.signals.map((signal, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6C47FF] mt-1.5 flex-shrink-0"></span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-400">{signal}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Risk Trend Analysis */}
            <section className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
              <div className="mb-3">
                <h3 className="font-bold text-base">Risk Trend Analysis</h3>
                <p className="text-[10px] text-slate-500">
                  {predictionHistory.length > 0
                    ? `Based on ${predictionHistory.length} prediction${predictionHistory.length > 1 ? 's' : ''}`
                    : 'Activity log for the last 24 hours'}
                </p>
              </div>

              <div className="flex gap-2 mb-4">
                <span className="px-3 py-1 bg-[#6C47FF] text-white text-[10px] font-bold rounded-full">History</span>
                <span className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-500 text-[10px] font-bold rounded-full">{predictionHistory.length} entries</span>
              </div>

              {/* Dynamic chart bars from prediction history */}
              <div className="flex items-end gap-1.5 h-20 mt-2">
                {(() => {
                  // Build chart data: use history if available, otherwise just current prediction
                  let chartData = predictionHistory.slice(-12);
                  
                  // If history is empty but we have a current prediction, show it as the sole entry
                  if (chartData.length === 0 && rawRisk !== null) {
                    chartData = [{ riskScore: rawRisk, timestamp: Date.now() }];
                  }

                  // If still no data, show an empty state placeholder
                  if (chartData.length === 0) {
                    return (
                      <div className="flex-1 flex items-center justify-center text-[10px] text-slate-400">
                        No prediction data yet
                      </div>
                    );
                  }

                  return chartData.map((entry, i) => {
                    const riskPct = Math.round((entry.riskScore || 0) * 100);
                    const barColor = riskPct >= 60 ? 'from-red-500 to-red-400' : riskPct >= 30 ? 'from-amber-500 to-amber-400' : 'from-emerald-500 to-emerald-400';
                    const isLatest = i === chartData.length - 1;
                    return (
                      <div
                        key={i}
                        title={`Risk: ${riskPct}% ${entry.location ? '— ' + entry.location : ''}`}
                        className={`flex-1 rounded-t-sm bg-gradient-to-t ${barColor} ${isLatest ? 'opacity-100' : 'opacity-60'} hover:opacity-100 transition-opacity relative group cursor-default`}
                        style={{ height: `${Math.max(riskPct, 8)}%` }}
                      >
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {riskPct}%
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 mt-2">
                {(() => {
                  const chartData = predictionHistory.slice(-12);
                  if (chartData.length === 0) {
                    return <span>Now</span>;
                  }
                  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const first = chartData[0];
                  const last = chartData[chartData.length - 1];

                  if (chartData.length === 1) {
                    return <span>{formatTime(first.timestamp)}</span>;
                  }

                  return (
                    <>
                      <span>{formatTime(first.timestamp)}</span>
                      {chartData.length > 2 && (
                        <span>{formatTime(chartData[Math.floor(chartData.length / 2)].timestamp)}</span>
                      )}
                      <span>{formatTime(last.timestamp)}</span>
                    </>
                  );
                })()}
              </div>
            </section>

            {/* AI Smart Tips — now context-aware */}
            {safetyAdvice && Array.isArray(safetyAdvice) && safetyAdvice.length > 0 && (
              <section className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-base mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#6C47FF]">auto_awesome</span>
                  AI Safety Recommendations
                </h3>
                <div className="space-y-4">
                  {safetyAdvice.map((tip, i) => {
                    // Assign contextual icons based on tip content
                    let icon = 'lightbulb';
                    let label = 'Recommendation';
                    if (tip.toLowerCase().includes('route') || tip.toLowerCase().includes('road')) {
                      icon = 'route'; label = 'Route Advisory';
                    } else if (tip.toLowerCase().includes('light') || tip.toLowerCase().includes('lit')) {
                      icon = 'light_mode'; label = 'Lighting Alert';
                    } else if (tip.toLowerCase().includes('populated') || tip.toLowerCase().includes('crowd') || tip.toLowerCase().includes('company')) {
                      icon = 'group'; label = 'Crowd Advisory';
                    } else if (tip.toLowerCase().includes('phone') || tip.toLowerCase().includes('charged')) {
                      icon = 'battery_charging_full'; label = 'Device Check';
                    } else if (tip.toLowerCase().includes('emergency') || tip.toLowerCase().includes('112') || tip.toLowerCase().includes('1091')) {
                      icon = 'emergency'; label = 'Emergency Info';
                    } else if (tip.toLowerCase().includes('location') || tip.toLowerCase().includes('share')) {
                      icon = 'share_location'; label = 'Location Sharing';
                    } else if (tip.toLowerCase().includes('night') || tip.toLowerCase().includes('evening')) {
                      icon = 'dark_mode'; label = 'Time Advisory';
                    } else if (tip.toLowerCase().includes('safe') || tip.toLowerCase().includes('instinct')) {
                      icon = 'verified_user'; label = 'General Safety';
                    } else if (tip.toLowerCase().includes('avoid')) {
                      icon = 'warning'; label = 'Caution';
                    }

                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#6C47FF]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-[#6C47FF] text-sm">{icon}</span>
                        </div>
                        <div>
                          <p className="font-bold text-xs">{label}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{tip}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Explanation */}
            {explanation && (
              <section className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-400 text-lg">info</span>
                  Analysis Summary
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{explanation}</p>
                
                {(detectedLocation || timeContext) && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {detectedLocation && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 rounded-lg text-[10px] text-slate-500 border border-slate-200 dark:border-slate-600">
                        <span className="material-symbols-outlined text-[10px] text-[#6C47FF]">location_on</span>
                        {detectedLocation}
                      </span>
                    )}
                    {timeContext && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 rounded-lg text-[10px] text-slate-500 border border-slate-200 dark:border-slate-600">
                        <span className="material-symbols-outlined text-[10px] text-[#6C47FF]">schedule</span>
                        {timeContext}
                      </span>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Emergency Contacts */}
            {emergency && (
              <section className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-5 border border-red-100 dark:border-red-800/30">
                <h4 className="text-xs font-bold text-red-600 dark:text-red-400 mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">emergency</span>
                  Emergency Contacts
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(emergency).map(([label, number]) => (
                    <a
                      key={label}
                      href={`tel:${number}`}
                      className="flex items-center gap-1.5 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">call</span>
                      <span className="capitalize">{label.replace('_', ' ')}</span>
                      <span className="text-slate-400 font-normal">{number}</span>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* ═══ Community Report Section ═══ */}
        <section className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-rose-500">flag</span>
            </div>
            <div>
              <h2 className="font-bold text-base">Community Report</h2>
              <p className="text-[10px] text-slate-500">Help others stay safe by reporting incidents</p>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Describe the issue</label>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="What happened? Describe the safety concern..."
              rows={3}
              className="w-full px-4 py-3 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#6C47FF]/50 focus:border-[#6C47FF] outline-none transition-all resize-none placeholder:text-slate-400"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Category</label>
            <div className="relative">
              <select
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#6C47FF]/50 focus:border-[#6C47FF] outline-none transition-all appearance-none pr-10"
                disabled={submitting}
              >
                {REPORT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xl">expand_more</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Location <span className="text-slate-300 font-normal normal-case">(optional)</span></label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">location_on</span>
              <input
                type="text"
                value={reportLocation}
                onChange={(e) => setReportLocation(e.target.value)}
                placeholder="e.g. Connaught Place, Delhi"
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#6C47FF]/50 focus:border-[#6C47FF] outline-none transition-all placeholder:text-slate-400"
                disabled={submitting}
              />
            </div>
          </div>

          <button
            onClick={handleReport}
            disabled={submitting || !reportText.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-red-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-rose-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Submitting...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">send</span>
                Submit Report
              </>
            )}
          </button>

          {reportSuccess && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 flex-1">{reportSuccess}</p>
            </div>
          )}

          {reportError && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-lg">error</span>
              <p className="text-sm text-red-600 dark:text-red-400 flex-1">{reportError}</p>
              <button onClick={() => setReportError('')} className="text-red-500">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          )}
        </section>

    </div>
  );
}
