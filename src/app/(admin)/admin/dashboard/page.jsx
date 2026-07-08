'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Badge from '@/components/ui/Badge';
import StatCard from '@/components/ui/StatCard';
import DataTableShell from '@/components/ui/DataTableShell';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'users', label: 'Users', icon: 'group' },
  { id: 'sos', label: 'SOS Events', icon: 'sos' },
  { id: 'incidents', label: 'Incidents', icon: 'warning' },
];

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [query, setQuery] = useState('');

  // Real data state
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [sosEvents, setSosEvents] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSos, setLoadingSos] = useState(false);
  const [loadingIncidents, setLoadingIncidents] = useState(false);

  // Fetch platform stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (e) {
        console.error('Failed to fetch stats:', e);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  // Fetch users when tab is active
  useEffect(() => {
    if (activeTab !== 'users') return;
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const params = new URLSearchParams();
        if (query) params.append('search', query);
        const res = await fetch(`/api/admin/users?${params}`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch (e) {
        console.error('Failed to fetch users:', e);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [activeTab, query]);

  // Fetch SOS events when tab is active
  // Admin sees the same incidents that companies/officials receive (dashcam-triggered SOS)
  useEffect(() => {
    if (activeTab !== 'sos') return;
    const fetchSos = async () => {
      setLoadingSos(true);
      try {
        const res = await fetch('/api/incidents');
        if (res.ok) {
          const data = await res.json();
          setSosEvents(data.incidents || []);
        }
      } catch (e) {
        console.error('Failed to fetch SOS:', e);
      } finally {
        setLoadingSos(false);
      }
    };
    fetchSos();
  }, [activeTab]);

  // Fetch incidents when tab is active
  useEffect(() => {
    if (activeTab !== 'incidents') return;
    const fetchIncidents = async () => {
      setLoadingIncidents(true);
      try {
        const res = await fetch('/api/incidents');
        if (res.ok) {
          const data = await res.json();
          setIncidents(data.incidents || []);
        }
      } catch (e) {
        console.error('Failed to fetch incidents:', e);
      } finally {
        setLoadingIncidents(false);
      }
    };
    fetchIncidents();
  }, [activeTab]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f0a1a] text-slate-900 dark:text-slate-100 font-display">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#6C47FF] p-2 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white">admin_panel_settings</span>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">Kavach Admin</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Platform Control Center</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 flex-1 justify-center max-w-xl">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users by name, email, phone..."
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#6C47FF]"
              />
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 pb-3">
          <div className="flex gap-2 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                  activeTab === t.id
                    ? 'bg-[#6C47FF] text-white shadow-lg shadow-[#6C47FF]/20'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-[#6C47FF]/5'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Platform Overview</h2>
              <p className="text-sm text-slate-500 mt-1">Real-time stats from your MongoDB database.</p>
            </div>

            {loadingStats ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 animate-pulse">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-3"></div>
                    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-12"></div>
                  </div>
                ))}
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Users" value={stats.totalUsers} sub="Registered individuals" icon="group" iconBg="bg-[#6C47FF]/10 text-[#6C47FF]" />
                <StatCard label="Companies" value={stats.totalCompanies} sub="Fleet operators" icon="domain" iconBg="bg-blue-500/10 text-blue-500" />
                <StatCard label="SOS Events" value={stats.totalSOS} sub={`${stats.sosToday} today`} icon="sos" iconBg="bg-red-500/10 text-red-500" />
                <StatCard label="Incidents" value={stats.totalIncidents} sub={`${stats.activeIncidents} active`} icon="warning" iconBg="bg-amber-500/10 text-amber-500" />
              </div>
            ) : (
              <p className="text-sm text-slate-500">Failed to load stats.</p>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('users')}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#6C47FF]/30 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-[#6C47FF]/10 text-[#6C47FF] flex items-center justify-center">
                  <span className="material-symbols-outlined">group</span>
                </div>
                <p className="mt-3 font-bold">Manage Users</p>
                <p className="text-xs text-slate-500 mt-1">View all registered users and their roles.</p>
              </button>
              <button
                onClick={() => setActiveTab('sos')}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-red-300 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                  <span className="material-symbols-outlined">sos</span>
                </div>
                <p className="mt-3 font-bold">SOS Events</p>
                <p className="text-xs text-slate-500 mt-1">Monitor all SOS alerts triggered by users.</p>
              </button>
              <button
                onClick={() => setActiveTab('incidents')}
                className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-300 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <span className="material-symbols-outlined">warning</span>
                </div>
                <p className="mt-3 font-bold">Fleet Incidents</p>
                <p className="text-xs text-slate-500 mt-1">All dashcam-triggered incidents across companies.</p>
              </button>
            </div>
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <DataTableShell
            title="All Users"
            subtitle="Real user data from MongoDB."
            headerRight={<Badge tone="slate">{users.length} records</Badge>}
          >
            {loadingUsers ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#6C47FF]"></div>
                <p className="mt-2 text-sm text-slate-500">Loading users...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Phone</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-sm">{u.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{u.email}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{u.phone || '—'}</td>
                        <td className="px-6 py-4">
                          <Badge tone={u.role === 'admin' ? 'purple' : u.role === 'company' ? 'blue' : 'green'}>{u.role}</Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{formatDate(u.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataTableShell>
        )}

        {/* SOS Events Tab — shows dashcam-triggered incidents (same as what officials/companies receive) */}
        {activeTab === 'sos' && (
          <DataTableShell
            title="SOS Events"
            subtitle="Dashcam-triggered SOS alerts reported to officials."
            headerRight={<Badge tone="slate">{sosEvents.length} events</Badge>}
          >
            {loadingSos ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#6C47FF]"></div>
                <p className="mt-2 text-sm text-slate-500">Loading SOS events...</p>
              </div>
            ) : sosEvents.length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300">verified_user</span>
                <p className="mt-2 text-sm text-slate-500">No SOS events recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Time</th>
                      <th className="px-6 py-4">Passenger</th>
                      <th className="px-6 py-4">Vehicle</th>
                      <th className="px-6 py-4">Gesture</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sosEvents.map((e, i) => (
                      <tr key={e.id || e._id || i} className={`transition-colors ${e.status === 'active' ? 'bg-red-50/30 dark:bg-red-900/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(e.createdAt)}</td>
                        <td className="px-6 py-4 font-bold text-sm">{e.userName || 'Unknown'}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{e.vehicleId || '—'}</td>
                        <td className="px-6 py-4"><Badge tone="purple">{e.gestureDetected || 'SOS'}</Badge></td>
                        <td className="px-6 py-4">
                          <Badge tone={e.status === 'active' ? 'red' : e.status === 'acknowledged' ? 'amber' : 'green'}>{e.status}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          {e.status === 'active' ? (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/incidents', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ incidentId: e.id, status: 'resolved' }),
                                  });
                                  if (res.ok) {
                                    setSosEvents(prev => prev.map(ev => ev.id === e.id ? { ...ev, status: 'resolved' } : ev));
                                  }
                                } catch (err) {
                                  console.error('Failed to resolve SOS:', err);
                                }
                              }}
                              className="px-3 py-1.5 text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                            >
                              ✓ Resolve
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">{e.status === 'acknowledged' ? 'Acknowledged' : 'Resolved'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataTableShell>
        )}

        {/* Incidents Tab */}
        {activeTab === 'incidents' && (
          <DataTableShell
            title="Fleet Incidents"
            subtitle="Dashcam-triggered incidents across all companies."
            headerRight={<Badge tone="slate">{incidents.length} incidents</Badge>}
          >
            {loadingIncidents ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#6C47FF]"></div>
                <p className="mt-2 text-sm text-slate-500">Loading incidents...</p>
              </div>
            ) : incidents.length === 0 ? (
              <div className="p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300">verified_user</span>
                <p className="mt-2 text-sm text-slate-500">No incidents reported.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Time</th>
                      <th className="px-6 py-4">Vehicle</th>
                      <th className="px-6 py-4">Passenger</th>
                      <th className="px-6 py-4">Gesture</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {incidents.map((inc) => (
                      <tr key={inc.id} className={`transition-colors ${inc.status === 'active' ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(inc.createdAt)}</td>
                        <td className="px-6 py-4 font-bold text-sm">{inc.vehicleId}</td>
                        <td className="px-6 py-4 text-sm">{inc.userName}</td>
                        <td className="px-6 py-4"><Badge tone="purple">{inc.gestureDetected}</Badge></td>
                        <td className="px-6 py-4">
                          <Badge tone={inc.status === 'active' ? 'red' : inc.status === 'acknowledged' ? 'amber' : 'green'}>{inc.status}</Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {inc.location?.latitude !== 0 ? (
                            <a href={`https://maps.google.com/?q=${inc.location.latitude},${inc.location.longitude}`} target="_blank" rel="noopener noreferrer" className="text-[#6C47FF] hover:underline">
                              View Map
                            </a>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DataTableShell>
        )}
      </main>
    </div>
  );
}
