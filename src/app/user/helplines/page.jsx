'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import UserDashboardHeader from '@/components/dashboard/UserDashboardHeader';
import { useSafetyScore } from '@/hooks/useSafetyScore';
import BottomNavigation from '@/components/BottomNavigation';

const INDIAN_STATES = [
  'ANDHRA PRADESH',
  'ARUNACHAL PRADESH',
  'ASSAM',
  'BIHAR',
  'CHHATTISGARH',
  'GOA',
  'GUJARAT',
  'HARYANA',
  'HIMACHAL PRADESH',
  'JHARKHAND',
  'KARNATAKA',
  'KERALA',
  'MADHYA PRADESH',
  'MAHARASHTRA',
  'MANIPUR',
  'MEGHALAYA',
  'MIZORAM',
  'NAGALAND',
  'ODISHA',
  'PUNJAB',
  'RAJASTHAN',
  'SIKKIM',
  'TAMIL NADU',
  'TELANGANA',
  'TRIPURA',
  'UTTAR PRADESH',
  'UTTARAKHAND',
  'WEST BENGAL',
  'ANDAMAN AND NICOBAR ISLANDS',
  'CHANDIGARH',
  'DADRA AND NAGAR HAVELI AND DAMAN AND DIU',
  'DELHI',
  'JAMMU AND KASHMIR',
  'LADAKH',
  'LAKSHADWEEP',
  'PUDUCHERRY',
];

const CATEGORY_ICONS = {
  Police: { icon: 'local_police', bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' },
  'Women Helpline': { icon: 'woman', bg: 'bg-pink-100 dark:bg-pink-900/30', color: 'text-pink-600 dark:text-pink-400' },
  'Child Helpline': { icon: 'child_care', bg: 'bg-yellow-100 dark:bg-yellow-900/30', color: 'text-yellow-600 dark:text-yellow-400' },
  'Medical Emergency': { icon: 'medical_services', bg: 'bg-red-100 dark:bg-red-900/30', color: 'text-red-600 dark:text-red-400' },
  Fire: { icon: 'fire_truck', bg: 'bg-orange-100 dark:bg-orange-900/30', color: 'text-orange-600 dark:text-orange-400' },
  'Disaster Management': { icon: 'emergency', bg: 'bg-purple-100 dark:bg-purple-900/30', color: 'text-purple-600 dark:text-purple-400' },
  Other: { icon: 'phone', bg: 'bg-slate-100 dark:bg-slate-700', color: 'text-slate-600 dark:text-slate-400' },
};

export default function HelplinesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [helplines, setHelplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedState, setSelectedState] = useState('');

  // Safety score from shared context
  const { safetyScore, safetyLabel, safetyColor, loading: safetyLoading } = useSafetyScore();

  // Fetch helplines on mount and when state changes
  useEffect(() => {
    fetchHelplines();
  }, [selectedState]);

  const fetchHelplines = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedState) params.append('state', selectedState);

      const response = await fetch(`/api/helplines?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch helplines');
      }

      setHelplines(data.helplines || []);
      setError('');
    } catch (err) {
      console.error('Fetch helplines error:', err);
      setError(err.message || 'Failed to load helplines');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phoneNumber) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  // Group helplines by category
  const groupedHelplines = helplines.reduce((acc, helpline) => {
    if (!acc[helpline.category]) {
      acc[helpline.category] = [];
    }
    acc[helpline.category].push(helpline);
    return acc;
  }, {});

  return (
    <div className="bg-[#f7f6f8] dark:bg-[#181121] font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      <UserDashboardHeader
        userName={session?.user?.name?.split(' ')[0] || 'User'}
        safetyScore={safetyScore}
        safetyLabel={safetyLabel}
        safetyColor={safetyColor}
        safetyLoading={safetyLoading}
        onNotificationClick={() => router.push('/user/notifications')}
      />
      <main className="flex-1 px-4 pb-24 max-w-md mx-auto w-full space-y-6">
        {/* Header */}
        <div className="pt-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Helpline Directory
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Find emergency helplines by state
          </p>
        </div>

        {/* State Filter */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300 px-1">
            Select State
          </label>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#8b47eb]"
          >
            <option value="">All States</option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#8b47eb]"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              Loading helplines...
            </p>
          </div>
        ) : helplines.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">
              phone_disabled
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              {selectedState
                ? `No helplines found for ${selectedState}`
                : 'No helplines available'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedHelplines).map(([category, categoryHelplines]) => {
              const categoryInfo = CATEGORY_ICONS[category] || CATEGORY_ICONS.Other;
              return (
                <section key={category} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div
                      className={`size-8 rounded-full ${categoryInfo.bg} flex items-center justify-center ${categoryInfo.color}`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {categoryInfo.icon}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">
                      {category}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {categoryHelplines.map((helpline) => (
                      <div
                        key={helpline.id}
                        className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                              {helpline.state}
                            </p>
                            {helpline.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-500">
                                {helpline.description}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleCall(helpline.phoneNumber)}
                            className="px-4 py-2 bg-[#8b47eb] text-white font-semibold rounded-lg hover:bg-[#8b47eb]/90 transition-colors flex items-center gap-2 whitespace-nowrap"
                          >
                            <span className="material-symbols-outlined text-sm">
                              call
                            </span>
                            {helpline.phoneNumber}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
