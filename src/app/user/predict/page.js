'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const API_BASE = 'https://kavach-ai-523i.onrender.com';

const REPORT_CATEGORIES = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'assault', label: 'Assault' },
  { value: 'stalking', label: 'Stalking' },
  { value: 'unsafe_area', label: 'Unsafe Area' },
];

function getScoreColor(score) {
  if (score >= 70) return { bg: 'bg-emerald-500', text: 'text-emerald-500', ring: 'ring-emerald-500/30', bgLight: 'bg-emerald-50 dark:bg-emerald-900/20', label: 'Safe', icon: 'verified_user' };
  if (score >= 40) return { bg: 'bg-amber-500', text: 'text-amber-500', ring: 'ring-amber-500/30', bgLight: 'bg-amber-50 dark:bg-amber-900/20', label: 'Moderate', icon: 'warning' };
  return { bg: 'bg-red-500', text: 'text-red-500', ring: 'ring-red-500/30', bgLight: 'bg-red-50 dark:bg-red-900/20', label: 'Risky', icon: 'gpp_bad' };
}

export default function PredictSafetyPage() {
  const pathname = usePathname();
  const router = useRouter();

  // Prediction state
  const [userInput, setUserInput] = useState('');
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [predictionError, setPredictionError] = useState('');

  // Report state
  const [reportText, setReportText] = useState('');
  const [reportCategory, setReportCategory] = useState('harassment');
  const [reportLocation, setReportLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState('');
  const [reportError, setReportError] = useState('');

  const isActive = (path) => pathname === path;

  // ── Predict Safety ──
  const handlePredict = async () => {
    if (!userInput.trim()) return;
    setPredicting(true);
    setPrediction(null);
    setPredictionError('');

    try {
      const params = new URLSearchParams({ user_input: userInput.trim() });
      const res = await fetch(`${API_BASE}/smart_risk?${params}`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error(`Server error (${res.status})`);

      const data = await res.json();
      setPrediction(data);
    } catch (err) {
      console.error('Prediction error:', err);
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

      const res = await fetch(`${API_BASE}${endpoint}?${params}`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error(`Server error (${res.status})`);

      setReportSuccess('Report submitted successfully. Thank you for keeping the community safe!');
      setReportText('');
      setReportCategory('harassment');
      setReportLocation('');
      setTimeout(() => setReportSuccess(''), 5000);
    } catch (err) {
      console.error('Report error:', err);
      setReportError(err.message || 'Failed to submit report. Please try again.');
      setTimeout(() => setReportError(''), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  // Extract score from AI response — API returns risk_score (0–1, higher = riskier)
  // Convert to safety score (0–100, higher = safer) for display
  const rawRisk = prediction?.risk_score ?? prediction?.safety_score ?? prediction?.score ?? null;
  const safetyScore = rawRisk !== null ? Math.round((1 - rawRisk) * 100) : null;
  const riskLevel = prediction?.risk_level ?? '';
  const explanation = prediction?.summary ?? prediction?.explanation ?? prediction?.message ?? '';
  const safetyAdvice = prediction?.safety_advice ?? prediction?.tips ?? null;
  const detectedLocation = prediction?.detected_location ?? null;
  const timeContext = prediction?.time_context ?? null;
  const emergency = prediction?.emergency ?? null;

  return (
    <div className="font-display bg-[#f7f6f8] dark:bg-[#181121] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#f7f6f8]/80 dark:bg-[#181121]/80 backdrop-blur-md border-b border-[#8b47eb]/10 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-[#8b47eb]/10 rounded-full transition-colors"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined text-[#8b47eb]">arrow_back</span>
        </button>
        <h1 className="text-xl font-bold tracking-tight">Predict Safety</h1>
      </header>

      <main className="flex-1 px-4 pb-28 max-w-md mx-auto w-full space-y-6 pt-4">

        {/* ═══════ Section 1: Safety Prediction ═══════ */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-[#8b47eb]/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#8b47eb]">psychology</span>
            </div>
            <div>
              <h2 className="font-bold text-base">AI Safety Prediction</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Describe your plan to get a safety assessment</p>
            </div>
          </div>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">travel_explore</span>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePredict()}
              placeholder="Where are you going? e.g. Going to Delhi tonight"
              className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#8b47eb]/50 focus:border-[#8b47eb] outline-none transition-all placeholder:text-slate-400"
              disabled={predicting}
              id="predict-input"
            />
          </div>

          <button
            onClick={handlePredict}
            disabled={predicting || !userInput.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-[#8b47eb] to-[#6c3bd4] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[#8b47eb]/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
            id="predict-button"
          >
            {predicting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Analyzing...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">insights</span>
                Predict Safety
              </>
            )}
          </button>

          {/* Error */}
          {predictionError && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-center gap-2 animate-in">
              <span className="material-symbols-outlined text-red-500 text-lg">error</span>
              <p className="text-sm text-red-600 dark:text-red-400 flex-1">{predictionError}</p>
              <button onClick={() => setPredictionError('')} className="text-red-500 hover:text-red-700">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          )}
        </section>

        {/* ═══════ Safety Score Result ═══════ */}
        {prediction && safetyScore !== null && (
          <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4 predict-result-enter">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8b47eb]">analytics</span>
                <h3 className="font-bold">Safety Assessment</h3>
              </div>
              {riskLevel && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  riskLevel === 'High' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                  riskLevel === 'Medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {riskLevel} Risk
                </span>
              )}
            </div>

            {/* Detected Location & Time */}
            {(detectedLocation || timeContext) && (
              <div className="flex flex-wrap gap-2">
                {detectedLocation && (
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700/40 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <span className="material-symbols-outlined text-sm text-[#8b47eb]">location_on</span>
                    {detectedLocation}
                  </div>
                )}
                {timeContext && (
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-700/40 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <span className="material-symbols-outlined text-sm text-[#8b47eb]">schedule</span>
                    {timeContext}
                  </div>
                )}
              </div>
            )}

            {/* Score Circle */}
            <div className="flex flex-col items-center py-4">
              <div className={`relative w-32 h-32 rounded-full flex items-center justify-center ring-8 ${getScoreColor(safetyScore).ring} ${getScoreColor(safetyScore).bgLight} transition-all`}>
                <div className="text-center">
                  <span className={`text-4xl font-black ${getScoreColor(safetyScore).text}`}>{safetyScore}</span>
                  <span className={`text-lg font-bold ${getScoreColor(safetyScore).text}`}>/100</span>
                </div>
              </div>
              <div className={`mt-3 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 ${getScoreColor(safetyScore).bgLight} ${getScoreColor(safetyScore).text}`}>
                <span className="material-symbols-outlined text-base">{getScoreColor(safetyScore).icon}</span>
                {getScoreColor(safetyScore).label}
              </div>
            </div>

            {/* Explanation */}
            {explanation && (
              <div className="bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4 border border-slate-100 dark:border-slate-600">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-slate-400 text-lg mt-0.5">info</span>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{explanation}</p>
                </div>
              </div>
            )}

            {/* Safety Advice */}
            {safetyAdvice && Array.isArray(safetyAdvice) && safetyAdvice.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#8b47eb] text-base">lightbulb</span>
                  Safety Tips
                </h4>
                <ul className="space-y-1.5">
                  {safetyAdvice.map((tip, i) => (
                    <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                      <span className="text-[#8b47eb] mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Emergency Contacts */}
            {emergency && (
              <div className="bg-red-50 dark:bg-red-900/15 rounded-xl p-3 border border-red-100 dark:border-red-800/40">
                <h4 className="text-xs font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">emergency</span>
                  Emergency Contacts
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(emergency).map(([label, number]) => (
                    <a
                      key={label}
                      href={`tel:${number}`}
                      className="flex items-center gap-1.5 bg-white dark:bg-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">call</span>
                      <span className="capitalize">{label}</span>
                      <span className="text-slate-500 dark:text-slate-400 font-normal">{number}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ═══════ Section 2: Community Reports ═══════ */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-rose-500">flag</span>
            </div>
            <div>
              <h2 className="font-bold text-base">Community Report</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Help others stay safe by reporting incidents</p>
            </div>
          </div>

          {/* Issue Description */}
          <div>
            <label htmlFor="report-text" className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
              Describe the issue
            </label>
            <textarea
              id="report-text"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="What happened? Describe the safety concern..."
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#8b47eb]/50 focus:border-[#8b47eb] outline-none transition-all resize-none placeholder:text-slate-400"
              disabled={submitting}
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <label htmlFor="report-category" className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
              Category
            </label>
            <div className="relative">
              <select
                id="report-category"
                value={reportCategory}
                onChange={(e) => setReportCategory(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#8b47eb]/50 focus:border-[#8b47eb] outline-none transition-all appearance-none pr-10"
                disabled={submitting}
              >
                {REPORT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xl">expand_more</span>
            </div>
          </div>

          {/* Location (Optional) */}
          <div>
            <label htmlFor="report-location" className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
              Location <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">location_on</span>
              <input
                id="report-location"
                type="text"
                value={reportLocation}
                onChange={(e) => setReportLocation(e.target.value)}
                placeholder="e.g. Connaught Place, Delhi"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#8b47eb]/50 focus:border-[#8b47eb] outline-none transition-all placeholder:text-slate-400"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleReport}
            disabled={submitting || !reportText.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-red-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-rose-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
            id="report-submit-button"
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

          {/* Success Message */}
          {reportSuccess && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 flex-1">{reportSuccess}</p>
            </div>
          )}

          {/* Error Message */}
          {reportError && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500 text-lg">error</span>
              <p className="text-sm text-red-600 dark:text-red-400 flex-1">{reportError}</p>
              <button onClick={() => setReportError('')} className="text-red-500 hover:text-red-700">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          )}
        </section>

        {/* Info Banner */}
        <div className="bg-[#8b47eb]/10 rounded-xl p-4 border border-[#8b47eb]/20">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[#8b47eb] mt-0.5">privacy_tip</span>
            <div>
              <h4 className="font-bold text-sm text-[#8b47eb]">Your Safety Matters</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Predictions are powered by AI and community data. Always trust your instincts and contact authorities in case of real danger.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 px-6 py-3 z-40">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          <Link
            href="/user/dashboard"
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#8b47eb] transition-colors"
          >
            <span className="material-symbols-outlined">home</span>
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link
            href="/user/dashcam"
            className={`flex flex-col items-center gap-1 ${isActive('/user/dashcam') ? 'text-[#8b47eb]' : 'text-slate-400 hover:text-[#8b47eb]'} transition-colors`}
          >
            <span className="material-symbols-outlined">videocam</span>
            <span className={`text-[10px] ${isActive('/user/dashcam') ? 'font-bold' : 'font-medium'}`}>Dashcam</span>
          </Link>
          <Link
            href="/user/predict"
            className="flex flex-col items-center gap-1 text-[#8b47eb]"
          >
            <div className="bg-[#8b47eb]/10 px-3 py-1 rounded-full flex flex-col items-center">
              <span className="material-symbols-outlined fill-1">insights</span>
              <span className="text-[10px] font-bold">Predict</span>
            </div>
          </Link>
          <button
            onClick={() => window.open('https://ncwapps.nic.in/onlinecomplaintsv2/', '_blank')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#8b47eb] transition-colors"
          >
            <span className="material-symbols-outlined">gavel</span>
            <span className="text-[10px] font-medium">Complaint</span>
          </button>
          <Link
            href="/user/store"
            className={`flex flex-col items-center gap-1 ${isActive('/user/store') ? 'text-[#8b47eb]' : 'text-slate-400 hover:text-[#8b47eb]'} transition-colors`}
          >
            <span className="material-symbols-outlined">shopping_bag</span>
            <span className={`text-[10px] ${isActive('/user/store') ? 'font-bold' : 'font-medium'}`}>Store</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
