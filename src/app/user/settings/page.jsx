'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/user/profile');
        const data = await res.json();
        if (res.ok && data.user) {
          setName(data.user.name || '');
          setPhone(data.user.phone || '');
          setEmail(data.user.email || '');
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (!name.trim() || name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (!phone || !/^\d{10}$/.test(phone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update profile');
        setSaving(false);
        return;
      }

      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error('Save profile error:', err);
      setError('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const isActive = (path) => path === '/user/settings';

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
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
      </header>

      <main className="flex-1 px-4 pb-28 max-w-md mx-auto w-full space-y-6 pt-4">
        {/* Profile Card */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-14 h-14 rounded-full bg-[#8b47eb]/10 border-2 border-[#8b47eb]/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#8b47eb] text-3xl">person</span>
            </div>
            <div>
              <h2 className="font-bold text-lg">{session?.user?.name || 'User'}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Manage your profile</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-lg">error</span>
                  <p className="text-sm text-red-600 dark:text-red-400 flex-1">{error}</p>
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-lg">check_circle</span>
                  <p className="text-sm text-green-600 dark:text-green-400 flex-1">{success}</p>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">badge</span>
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  required
                  disabled={saving}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#8b47eb]/50 focus:border-[#8b47eb] outline-none transition-all disabled:opacity-50"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">call</span>
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">+91</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(val);
                      setError('');
                    }}
                    required
                    disabled={saving}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#8b47eb]/50 focus:border-[#8b47eb] outline-none transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">alternate_email</span>
                  Email <span className="text-slate-400 font-normal text-xs">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  disabled={saving}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#8b47eb]/50 focus:border-[#8b47eb] outline-none transition-all disabled:opacity-50"
                />
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 bg-gradient-to-r from-[#8b47eb] to-[#6c3bd4] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-[#8b47eb]/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">save</span>
                    Save Changes
                  </>
                )}
              </button>
            </form>
          )}
        </section>

        {/* Logout */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Sign Out
          </button>
        </section>

        {/* App Info */}
        <div className="text-center py-4">
          <p className="text-xs text-slate-400">Kavach Safety App v0.1.0</p>
          <p className="text-[10px] text-slate-400 mt-1">Your Safety, Our Priority</p>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 px-6 py-3 z-40">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          <Link href="/user/dashboard" className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#8b47eb] transition-colors">
            <span className="material-symbols-outlined">home</span>
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link href="/user/dashcam" className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#8b47eb] transition-colors">
            <span className="material-symbols-outlined">videocam</span>
            <span className="text-[10px] font-medium">Dashcam</span>
          </Link>
          <Link href="/user/predict" className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#8b47eb] transition-colors">
            <span className="material-symbols-outlined">insights</span>
            <span className="text-[10px] font-medium">Predict</span>
          </Link>
          <button
            onClick={() => window.open('https://ncwapps.nic.in/onlinecomplaintsv2/', '_blank')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#8b47eb] transition-colors"
          >
            <span className="material-symbols-outlined">gavel</span>
            <span className="text-[10px] font-medium">Complaint</span>
          </button>
          <Link href="/user/settings" className="flex flex-col items-center gap-1 text-[#8b47eb]">
            <div className="bg-[#8b47eb]/10 px-3 py-1 rounded-full flex flex-col items-center">
              <span className="material-symbols-outlined fill-1">settings</span>
              <span className="text-[10px] font-bold">Settings</span>
            </div>
          </Link>
        </div>
      </nav>
    </div>
  );
}
