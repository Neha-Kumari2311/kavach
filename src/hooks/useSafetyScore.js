'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

const API_BASE = 'https://kavach-ai-523i.onrender.com';
const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
const API_TIMEOUT = 60000; // 60s - Render free tier cold start can take 30-50s
const FAST_TIMEOUT = 15000; // 15s - quick check for new endpoint before fallback
const MAX_RETRIES = 2;

const SafetyScoreContext = createContext({
  safetyScore: null,
  safetyLabel: 'Checking...',
  safetyColor: 'slate',
  loading: true,
  environment: null,
  breakdown: null,
  dataFactors: null,
  refreshSafetyScore: () => {},
});

/**
 * Provides safety score state to all child components.
 * Auto-detects location on mount and fetches score once.
 * Score PERSISTS across page navigations within /user/*.
 * Refreshes every 10 minutes automatically.
 * 
 * v3: Now passes GPS coordinates DIRECTLY to /risk_by_coords
 * instead of going through text parsing → eliminates precision loss.
 */
export function SafetyScoreProvider({ children }) {
  const { data: session } = useSession();
  const [safetyScore, setSafetyScore] = useState(null);
  const [safetyLabel, setSafetyLabel] = useState('Checking...');
  const [safetyColor, setSafetyColor] = useState('slate');
  const [loading, setLoading] = useState(true);
  const [environment, setEnvironment] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [dataFactors, setDataFactors] = useState(null);

  const isFetchingRef = useRef(false);
  const intervalRef = useRef(null);
  const hasFetchedOnce = useRef(false);

  const getScoreInfo = useCallback((score) => {
    if (score >= 70) return { label: 'SAFE', color: 'green' };
    if (score >= 40) return { label: 'MODERATE', color: 'amber' };
    return { label: 'RISKY', color: 'red' };
  }, []);

  const fetchSafetyScore = useCallback(async (lat, lng) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);

    try {
      let data = null;

      // Strategy: Try /risk_by_coords once quickly. If it 404s (not deployed yet),
      // immediately fall back to /smart_risk with full retry logic.
      const coordsParams = new URLSearchParams({
        lat: lat.toString(),
        lon: lng.toString(),
        include_infra: 'true'
      });

      // Quick single attempt at the v3 endpoint
      try {
        const res = await fetch(API_BASE + '/risk_by_coords?' + coordsParams.toString(), {
          method: 'POST',
          signal: AbortSignal.timeout(FAST_TIMEOUT),
        });
        if (!res.ok) throw new Error('API error ' + res.status);
        data = await res.json();
        // Check if we got an error response (e.g. endpoint exists but returned error)
        if (data && data.error) {
          data = null;
          throw new Error('API returned error: ' + data.error);
        }
      } catch (v3Err) {
        console.log('[SafetyScore] /risk_by_coords failed:', v3Err.message, '→ using /smart_risk fallback');
      }

      // Fallback: use /smart_risk with a location description (original approach)
      if (!data) {
        // Reverse geocode for a location description
        let locationDesc = lat.toFixed(4) + ', ' + lng.toFixed(4);
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const geoData = await geoRes.json();
          if (geoData && geoData.address) {
            const addr = geoData.address;
            const parts = [];
            if (addr.amenity) parts.push(addr.amenity);
            else if (addr.building) parts.push(addr.building);
            else if (addr.neighbourhood) parts.push(addr.neighbourhood);
            else if (addr.suburb) parts.push(addr.suburb);
            const city = addr.city || addr.town || addr.village || addr.state_district;
            if (city && !parts.includes(city)) parts.push(city);
            if (addr.state && !parts.includes(addr.state)) parts.push(addr.state);
            if (addr.country && !parts.includes(addr.country)) parts.push(addr.country);
            locationDesc = parts.length > 0 ? parts.join(', ') : (geoData.display_name || locationDesc);
          }
        } catch (geoErr) {
          // keep default locationDesc
        }

        // Retry logic for /smart_risk (handles cold starts)
        const smartParams = new URLSearchParams({ user_input: locationDesc });
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            const res = await fetch(API_BASE + '/smart_risk?' + smartParams.toString(), {
              method: 'POST',
              signal: AbortSignal.timeout(API_TIMEOUT),
            });
            if (!res.ok) throw new Error('API error ' + res.status);
            data = await res.json();
            break;
          } catch (fetchErr) {
            console.log('[SafetyScore] /smart_risk attempt ' + (attempt + 1) + ' failed:', fetchErr.message);
            if (attempt === MAX_RETRIES) throw fetchErr;
            await new Promise(function (r) { setTimeout(r, 2000); });
          }
        }
      }

      const rawRisk = (data && data.risk_score != null) ? data.risk_score : null;
      if (rawRisk !== null) {
        const score = Math.round((1 - rawRisk) * 100);
        const info = getScoreInfo(score);
        setSafetyScore(score);
        setSafetyLabel(info.label);
        setSafetyColor(info.color);
        hasFetchedOnce.current = true;
        
        // Store environment data for display in dashboard
        if (data.environment) {
          setEnvironment(data.environment);
        }
        if (data.breakdown) {
          setBreakdown(data.breakdown);
        }
        if (data.data_factors) {
          setDataFactors(data.data_factors);
        }
      }
    } catch (err) {
      console.log('[SafetyScore] All attempts failed:', err.message);
      if (!hasFetchedOnce.current) {
        setSafetyLabel('Unavailable');
        setSafetyColor('slate');
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [getScoreInfo]);

  // Fetch location and score - called once on mount, and can be triggered manually
  const fetchWithCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setSafetyLabel('Unavailable');
      setSafetyColor('slate');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchSafetyScore(position.coords.latitude, position.coords.longitude);
      },
      () => {
        if (!hasFetchedOnce.current) {
          setSafetyLabel('Turn on location');
          setSafetyColor('slate');
          setLoading(false);
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 120000 }
    );
  }, [fetchSafetyScore]);

  // Auto-fetch on mount (one time) when user is logged in
  useEffect(() => {
    if (!session) return;
    if (hasFetchedOnce.current) return;

    fetchWithCurrentLocation();
  }, [session, fetchWithCurrentLocation]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    if (!session) return;

    intervalRef.current = setInterval(() => {
      fetchWithCurrentLocation();
    }, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [session, fetchWithCurrentLocation]);

  // Manual refresh function (called when location tracking is toggled ON)
  const refreshSafetyScore = useCallback((coords) => {
    if (coords) {
      fetchSafetyScore(coords.lat, coords.lng);
    } else {
      fetchWithCurrentLocation();
    }
  }, [fetchSafetyScore, fetchWithCurrentLocation]);

  return (
    <SafetyScoreContext.Provider value={{
      safetyScore,
      safetyLabel,
      safetyColor,
      loading,
      environment,
      breakdown,
      dataFactors,
      refreshSafetyScore,
    }}>
      {children}
    </SafetyScoreContext.Provider>
  );
}

/**
 * Hook to access safety score from any user page.
 * Must be used within a SafetyScoreProvider.
 */
export function useSafetyScore() {
  return useContext(SafetyScoreContext);
}
