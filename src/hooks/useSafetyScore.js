'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

const API_BASE = 'https://kavach-ai-523i.onrender.com';
const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

const SafetyScoreContext = createContext({
  safetyScore: null,
  safetyLabel: 'Checking...',
  safetyColor: 'slate',
  loading: true,
  refreshSafetyScore: () => {},
});

/**
 * Provides safety score state to all child components.
 * Auto-detects location on mount and fetches score once.
 * Score PERSISTS across page navigations within /user/*.
 * Refreshes every 10 minutes automatically.
 */
export function SafetyScoreProvider({ children }) {
  const { data: session } = useSession();
  const [safetyScore, setSafetyScore] = useState(null);
  const [safetyLabel, setSafetyLabel] = useState('Checking...');
  const [safetyColor, setSafetyColor] = useState('slate');
  const [loading, setLoading] = useState(true);

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
      // Reverse geocode for a natural location description
      let locationDesc = '';

      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const geoData = await geoRes.json();
        if (geoData?.address) {
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

          locationDesc = parts.length > 0
            ? parts.join(', ')
            : (geoData.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
      } catch {
        locationDesc = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }

      // Call the AI API
      const params = new URLSearchParams({ user_input: locationDesc });
      const res = await fetch(`${API_BASE}/smart_risk?${params}`, {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const data = await res.json();

      const rawRisk = data?.risk_score ?? data?.safety_score ?? data?.score ?? null;
      if (rawRisk !== null) {
        const score = Math.round((1 - rawRisk) * 100);
        const info = getScoreInfo(score);
        setSafetyScore(score);
        setSafetyLabel(info.label);
        setSafetyColor(info.color);
        hasFetchedOnce.current = true;
      }
    } catch (err) {
      console.log('[SafetyScore] Fetch error:', err.message);
      if (!hasFetchedOnce.current) {
        setSafetyLabel('Unavailable');
        setSafetyColor('slate');
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [getScoreInfo]);

  // Fetch location and score — called once on mount, and can be triggered manually
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
