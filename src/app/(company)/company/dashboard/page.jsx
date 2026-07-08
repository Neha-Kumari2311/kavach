'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';

export default function CompanyDashboard() {
  const { data: session } = useSession();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const prevActiveCountRef = useRef(0);
  const audioRef = useRef(null);
  const hasPermissionRef = useRef(false);

  const companyName = session?.user?.name || 'Company';
  const myCompanyId = session?.user?.companyId || '';

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch incidents
  const fetchIncidents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (myCompanyId) params.append('companyId', myCompanyId);

      const res = await fetch(`/api/incidents?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        const newIncidents = data.incidents || [];
        
        // Check for new active incidents (SOS alert sound)
        const newActiveCount = newIncidents.filter(i => i.status === 'active').length;
        if (newActiveCount > prevActiveCountRef.current && prevActiveCountRef.current !== 0) {
          // New SOS alert came in!
          playAlertSound();
          showNotification(newIncidents.find(i => i.status === 'active'));
        }
        prevActiveCountRef.current = newActiveCount;
        
        setIncidents(newIncidents);
      }
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, myCompanyId]);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 8000); // Poll every 8s
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  // Play alert sound
  const playAlertSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/sounds/siren.wav');
        audioRef.current.volume = 0.7;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {}); // Ignore autoplay errors
    } catch (e) {
      console.log('Audio play failed:', e);
    }
  };

  // Show browser notification
  const showNotification = (incident) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 KAVACH SOS Alert!', {
        body: `Vehicle ${incident?.vehicleId || 'Unknown'} — ${incident?.gestureDetected || 'SOS'} detected. Passenger: ${incident?.userName || 'Unknown'}`,
        icon: '/favicon.ico',
        tag: 'kavach-sos',
        requireInteraction: true,
      });
    }
  };

  // Update incident status
  const updateStatus = async (incidentId, newStatus) => {
    setUpdatingId(incidentId);
    try {
      const res = await fetch('/api/incidents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId, status: newStatus }),
      });
      if (res.ok) {
        setIncidents(prev => prev.map(inc =>
          inc.id === incidentId
            ? { ...inc, status: newStatus, resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : inc.resolvedAt }
            : inc
        ));
      }
    } catch (err) {
      console.error('Failed to update:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const activeCount = incidents.filter(i => i.status === 'active').length;
  const acknowledgedCount = incidents.filter(i => i.status === 'acknowledged').length;
  const resolvedCount = incidents.filter(i => i.status === 'resolved').length;

  // Fleet overview: unique vehicles
  const uniqueVehicles = [...new Map(incidents.map(i => [i.vehicleId, i])).values()];

  // Response time analytics
  const getAvgResponseTime = () => {
    const resolved = incidents.filter(i => i.resolvedAt && i.createdAt);
    if (resolved.length === 0) return null;
    const total = resolved.reduce((acc, i) => {
      return acc + (new Date(i.resolvedAt) - new Date(i.createdAt));
    }, 0);
    const avgMs = total / resolved.length;
    const mins = Math.round(avgMs / 60000);
    return mins < 60 ? `${mins}m` : `${Math.round(mins / 60)}h ${mins % 60}m`;
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f0a1a] font-display">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6C47FF] to-[#8B6AFF] flex items-center justify-center">
              <span className="text-white text-sm font-bold">K</span>
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">KAVACH Fleet Control</h1>
              <p className="text-[10px] text-slate-500">{companyName} • Live Monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-[10px] font-bold text-red-700 dark:text-red-400">{activeCount} Active SOS</span>
              </div>
            )}
            {activeCount === 0 && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">All Clear</span>
              </div>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] text-slate-500 font-medium uppercase">Total</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{incidents.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-red-200 dark:border-red-800/50">
            <p className="text-[10px] text-red-500 font-medium uppercase">Active SOS</p>
            <p className="text-2xl font-black text-red-600 mt-1">{activeCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-amber-200 dark:border-amber-800/50">
            <p className="text-[10px] text-amber-500 font-medium uppercase">Acknowledged</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{acknowledgedCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800/50">
            <p className="text-[10px] text-emerald-500 font-medium uppercase">Resolved</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{resolvedCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-[#6C47FF]/20">
            <p className="text-[10px] text-[#6C47FF] font-medium uppercase">Avg Response</p>
            <p className="text-2xl font-black text-[#6C47FF] mt-1">{getAvgResponseTime() || '—'}</p>
          </div>
        </div>

        {/* Fleet Overview */}
        <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#6C47FF] text-lg">directions_car</span>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">Fleet Overview</h2>
            </div>
            <span className="text-[10px] text-slate-400">{uniqueVehicles.length} vehicle(s) tracked</span>
          </div>
          {uniqueVehicles.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">No vehicles with incidents yet</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-48 overflow-y-auto">
              {uniqueVehicles.slice(0, 8).map((v) => (
                <div key={v.vehicleId} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${v.status === 'active' ? 'bg-red-500 animate-pulse' : v.status === 'acknowledged' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                    <div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{v.vehicleId}</span>
                      <span className="text-[10px] text-slate-400 ml-2">{v.userName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      v.status === 'active' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                      v.status === 'acknowledged' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                      'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    }`}>{v.status}</span>
                    <span className="text-[10px] text-slate-400">{timeAgo(v.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Company ID */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 font-medium">Your Company ID (share with passengers)</p>
            <p className="text-sm font-mono font-bold text-[#6C47FF] mt-1">{myCompanyId || 'Loading...'}</p>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(myCompanyId); }}
            className="px-3 py-1.5 bg-[#6C47FF]/10 text-[#6C47FF] text-xs font-bold rounded-lg hover:bg-[#6C47FF]/20 transition-colors"
          >
            Copy
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['all', 'active', 'acknowledged', 'resolved'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-all ${
                filter === f
                  ? 'bg-[#6C47FF] text-white shadow-lg shadow-[#6C47FF]/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-[#6C47FF]/30'
              }`}
            >
              {f === 'all' ? `All (${incidents.length})` : `${f} (${incidents.filter(i => i.status === f).length})`}
            </button>
          ))}
        </div>

        {/* Incidents List */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-bold text-slate-900 dark:text-white">Incident Reports</h2>
            <span className="text-[10px] text-slate-400">Auto-refreshes every 8s</span>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#6C47FF]"></div>
              <p className="mt-3 text-sm text-slate-500">Loading incidents...</p>
            </div>
          ) : incidents.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">verified_user</span>
              <p className="mt-3 text-sm text-slate-500">No incidents reported. All vehicles safe.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {incidents.map((incident) => (
                <div key={incident.id} className={`px-5 py-4 transition-colors ${incident.status === 'active' ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'}`}>
                  <div className="flex items-start gap-3">
                    {/* Status dot */}
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1.5 ${
                      incident.status === 'active' ? 'bg-red-500 animate-pulse' :
                      incident.status === 'acknowledged' ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`}></div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">Vehicle: {incident.vehicleId}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          incident.status === 'active' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                          incident.status === 'acknowledged' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                          'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        }`}>{incident.status}</span>
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-[9px] font-bold">
                          {incident.gestureDetected}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Passenger: {incident.userName} • {formatTime(incident.createdAt)}
                      </p>
                      {incident.location?.latitude !== 0 && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          📍 {incident.locationName || `${incident.location.latitude.toFixed(4)}, ${incident.location.longitude.toFixed(4)}`}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {incident.location?.latitude !== 0 && (
                        <a
                          href={`https://maps.google.com/?q=${incident.location.latitude},${incident.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-[#6C47FF]/10 transition-colors"
                          title="View on Map"
                        >
                          <span className="material-symbols-outlined text-sm text-[#6C47FF]">location_on</span>
                        </a>
                      )}
                      
                      {incident.status === 'active' && (
                        <button
                          onClick={() => updateStatus(incident.id, 'acknowledged')}
                          disabled={updatingId === incident.id}
                          className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
                        >
                          {updatingId === incident.id ? '...' : 'Acknowledge'}
                        </button>
                      )}
                      
                      {(incident.status === 'active' || incident.status === 'acknowledged') && (
                        <button
                          onClick={() => updateStatus(incident.id, 'resolved')}
                          disabled={updatingId === incident.id}
                          className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
                        >
                          {updatingId === incident.id ? '...' : 'Resolve'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div className="bg-[#6C47FF]/5 dark:bg-[#6C47FF]/10 border border-[#6C47FF]/20 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-[#6C47FF] mt-0.5">info</span>
          <div>
            <p className="text-xs font-bold text-[#6C47FF]">How it works</p>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              When a passenger shows the SOS hand gesture to the KAVACH dashcam, an alert appears here with their vehicle, location, and timestamp. 
              You will hear an alert sound and receive a browser notification for new incidents. 
              Use Acknowledge to confirm you have seen it, and Resolve once the situation is handled.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
