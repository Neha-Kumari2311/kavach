'use client';

import { useState, useEffect, useCallback } from 'react';

export default function LiveLocationCard({ 
  location = 'Mumbai',
  isTrackingEnabled = false,
  onToggleTracking,
  onCoordsChange,
  onViewMap,
  lastUpdate = null
}) {
  const [coords, setCoords] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [locationName, setLocationName] = useState(location);

  // Use Browser Geolocation API to get the user's real position
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser');
      return;
    }

    // Get position once on mount
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGeoError(null);
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        setGeoError('Location access denied');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Notify parent of coordinate changes so safety score can react
  useEffect(() => {
    if (coords && onCoordsChange) {
      onCoordsChange(coords);
    }
  }, [coords, onCoordsChange]);

  // Keep location updated while tracking is enabled
  useEffect(() => {
    if (!isTrackingEnabled || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGeoError(null);
      },
      (error) => {
        console.warn('Watch position error:', error.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isTrackingEnabled]);

  // Reverse geocode to get a readable location name
  useEffect(() => {
    if (!coords) return;

    const controller = new AbortController();

    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=14`,
      {
        signal: controller.signal,
        headers: { 'Accept-Language': 'en' },
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data?.address) {
          const { suburb, city, town, village, state_district, state } = data.address;
          setLocationName(suburb || city || town || village || state_district || state || location);
        }
      })
      .catch(() => {
        // Silently ignore — keep the default location name
      });

    return () => controller.abort();
  }, [coords, location]);

  const formatLastUpdate = (date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) {
      return 'Just now';
    } else if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      const hours = Math.floor(diff / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
  };

  // Build OpenStreetMap embed URL from live coordinates
  const mapSrc = coords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.015},${coords.lat - 0.01},${coords.lng + 0.015},${coords.lat + 0.01}&layer=mapnik&marker=${coords.lat},${coords.lng}`
    : null;

  const handleViewMap = useCallback(() => {
    if (onViewMap) {
      onViewMap();
    } else if (coords) {
      window.open(
        `https://www.google.com/maps?q=${coords.lat},${coords.lng}`,
        '_blank'
      );
    }
  }, [onViewMap, coords]);

  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700">
      <div
        className="h-44 bg-slate-200 dark:bg-slate-700 relative overflow-hidden cursor-pointer group"
        onClick={handleViewMap}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleViewMap(); }}
        aria-label="View location on map"
      >
        {/* Live map via OpenStreetMap embed, or fallback */}
        {mapSrc ? (
          <iframe
            title="Live Location Map"
            src={mapSrc}
            className="absolute inset-0 w-full h-full border-0 pointer-events-none"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
            <span className="material-symbols-outlined text-4xl">location_off</span>
            <span className="text-xs font-medium">
              {geoError || 'Detecting location…'}
            </span>
          </div>
        )}

        {/* Pulsing dot overlay when tracking is active */}
        {coords && isTrackingEnabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="size-3 bg-[#8b47eb] rounded-full shadow-lg animate-ping opacity-60"></div>
            <div className="absolute size-3 bg-[#8b47eb] rounded-full border-2 border-white shadow-lg"></div>
          </div>
        )}

        {/* "View on Map" hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end justify-center pb-2 pointer-events-none">
          <span className="text-white text-xs font-semibold bg-[#8b47eb]/80 px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            View on Map
          </span>
        </div>
      </div>

      <div className="p-4 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            Live Location Sharing
            {isTrackingEnabled && (
              <span className="inline-block size-2 rounded-full bg-green-500 animate-pulse"></span>
            )}
          </h3>
          <p className="text-xs text-slate-500">
            {coords && (
              <span className="block">
                <span className="material-symbols-outlined text-[11px] align-middle mr-0.5">location_on</span>
                {locationName}
              </span>
            )}
            Real-time tracking is currently {isTrackingEnabled ? 'ON' : 'OFF'}
            {lastUpdate && isTrackingEnabled && (
              <span className="block mt-0.5">Last update: {formatLastUpdate(lastUpdate)}</span>
            )}
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isTrackingEnabled}
            onChange={onToggleTracking}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8b47eb]"></div>
        </label>
      </div>
    </section>
  );
}
