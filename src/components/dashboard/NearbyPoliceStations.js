'use client';

import { useState, useEffect, useRef } from 'react';

// Cache police station results in memory (persists across re-renders within session)
let cachedStations = null;
let cachedCoords = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * NearbyPoliceStations — Shows nearby police stations from OSM.
 * Features:
 * - 3km search radius
 * - In-memory caching (10 min) to avoid Overpass API rate limits
 * - Graceful fallback — never shows "no stations" if we had data before
 * - Clickable links to Google Maps directions
 */
export default function NearbyPoliceStations() {
  const [stations, setStations] = useState(cachedStations || []);
  const [loading, setLoading] = useState(!cachedStations);
  const [locationName, setLocationName] = useState('Detecting...');
  const [coords, setCoords] = useState(cachedCoords);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    if (!navigator.geolocation) {
      setLocationName('Location unavailable');
      setLoading(false);
      return;
    }

    // Check if cache is still valid
    const now = Date.now();
    if (cachedStations && cachedCoords && (now - cacheTimestamp) < CACHE_DURATION) {
      setStations(cachedStations);
      setCoords(cachedCoords);
      setLoading(false);
      // Still reverse-geocode for display name
      reverseGeocode(cachedCoords.latitude, cachedCoords.longitude);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ latitude, longitude });
        cachedCoords = { latitude, longitude };

        reverseGeocode(latitude, longitude);
        await fetchPoliceStations(latitude, longitude);
      },
      () => {
        setLocationName('Location access denied');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const addr = data.address;
      setLocationName(
        addr?.suburb || addr?.neighbourhood || addr?.city_district || addr?.town || addr?.city || addr?.state || 'Your Location'
      );
    } catch {
      setLocationName(`${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`);
    }
  };

  const fetchPoliceStations = async (lat, lon) => {
    setLoading(true);
    try {
      const query = `[out:json][timeout:15];(node["amenity"="police"](around:3000,${lat},${lon});way["amenity"="police"](around:3000,${lat},${lon}););out center 5;`;
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      if (!res.ok) throw new Error('Overpass API error');
      const data = await res.json();

      const R = 6371;
      const haversine = (lat1, lon1, lat2, lon2) => {
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };

      const result = (data.elements || [])
        .map((el) => {
          const sLat = el.lat || el.center?.lat;
          const sLon = el.lon || el.center?.lon;
          if (!sLat || !sLon) return null;
          return {
            name: el.tags?.name || 'Police Station',
            lat: sLat,
            lon: sLon,
            distance: haversine(lat, lon, sLat, sLon),
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 3);

      // Update state and cache
      setStations(result);
      cachedStations = result;
      cacheTimestamp = Date.now();
    } catch (e) {
      console.error('Failed to fetch police stations:', e);
      // Keep existing cached/stale data — don't clear
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative bg-gradient-to-br from-[#1a0a3e] to-[#2d1560] rounded-2xl p-5 overflow-hidden">
      <div className="relative z-10">
        <span className="inline-block px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 rounded text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-3">Active Monitoring</span>
        <h3 className="font-bold text-white text-lg mb-1">{locationName}</h3>
        <p className="text-white/60 text-xs mb-4">
          {coords
            ? `GPS: ${coords.latitude.toFixed(4)}°N, ${coords.longitude.toFixed(4)}°E`
            : 'Acquiring GPS signal...'}
        </p>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-2 mb-4">
            <svg className="animate-spin h-3 w-3 text-white/60" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            <span className="text-white/60 text-[10px]">Finding nearby police stations...</span>
          </div>
        )}

        {/* Police Stations List */}
        {stations.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Nearby Police Stations</p>
            {stations.map((station, i) => (
              <a
                key={i}
                href={`https://maps.google.com/maps?daddr=${station.lat},${station.lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-blue-400 text-sm">local_police</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{station.name}</p>
                  <p className="text-white/50 text-[10px]">
                    {station.distance < 1
                      ? `${Math.round(station.distance * 1000)}m away`
                      : `${station.distance.toFixed(1)} km away`}
                  </p>
                </div>
                <span className="material-symbols-outlined text-white/30 text-sm group-hover:text-white/60 transition-colors">directions</span>
              </a>
            ))}
          </div>
        )}

        {/* No stations found */}
        {!loading && stations.length === 0 && coords && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
            <span className="material-symbols-outlined text-white/40 text-sm">info</span>
            <span className="text-white/50 text-[10px]">No police stations found within 3km</span>
          </div>
        )}

        {/* View Map Button */}
        <button
          onClick={() => {
            if (coords) {
              window.open(`https://maps.google.com/?q=${coords.latitude},${coords.longitude}`, '_blank');
            } else {
              window.open('https://maps.google.com/', '_blank');
            }
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white text-xs font-bold hover:bg-white/20 transition-colors"
        >
          <span className="material-symbols-outlined text-sm text-red-400">location_on</span>
          View on Map
        </button>
      </div>
    </section>
  );
}
