'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ROLE_OPTIONS = [
  { label: 'Individual', value: 'user', icon: 'person' },
  { label: 'Company', value: 'company', icon: 'corporate_fare' },
  { label: 'Admin', value: 'admin', icon: 'admin_panel_settings' },
];

const getRedirectPath = (role) => {
  switch (role) {
    case 'user': return '/user/dashboard';
    case 'company': return '/company/dashboard';
    case 'admin': return '/admin/dashboard';
    default: return '/user/dashboard';
  }
};

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await signIn('credentials', {
        login,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error === 'CredentialsSignin'
          ? 'Invalid email/phone or password'
          : result.error);
        setIsSubmitting(false);
        return;
      }

      if (result?.ok) {
        // Always redirect based on the ACTUAL role from the database — not the form selection
        const sessionResponse = await fetch('/api/auth/session');
        const session = await sessionResponse.json();
        const actualRole = session?.user?.role;
        if (!actualRole) {
          // Fallback if session doesn't have role yet
          router.push('/user/dashboard');
        } else {
          router.push(getRedirectPath(actualRole));
        }
        router.refresh();
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f7ff] to-[#FAFBFC] dark:from-[#0F0F14] dark:to-[#1a1a24] flex flex-col items-center justify-center px-4 py-8">
      {/* Main Card */}
      <div className="w-full max-w-[480px] animate-fade-in-up">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6C47FF] to-[#FF6B9D] shadow-lg mb-4">
            <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              shield
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Sign in to your Kavach account
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-[#1A1A24] rounded-2xl shadow-[var(--shadow-lg)] border border-slate-100 dark:border-slate-800/50 p-6 space-y-5">

          {/* Role Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
              Sign in as
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { setRole(option.value); setError(''); }}
                  disabled={isSubmitting}
                  className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    role === option.value
                      ? 'bg-white dark:bg-[#6C47FF] text-[#6C47FF] dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    {option.icon}
                  </span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-900/15 border border-red-100 dark:border-red-800/30">
              <span className="material-symbols-outlined text-red-500 text-lg">error</span>
              <p className="text-sm text-red-600 dark:text-red-400 flex-1">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email or Phone */}
            <div className="space-y-1.5">
              <label htmlFor="login" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email or Phone
              </label>
              <div className="relative">
                <input
                  id="login"
                  type="text"
                  placeholder="Email or 10-digit phone number"
                  value={login}
                  onChange={(e) => { setLogin(e.target.value); setError(''); }}
                  required
                  disabled={isSubmitting}
                  autoComplete="username"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF] transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs font-semibold text-[#6C47FF] hover:text-[#5234CC] transition-colors">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  required
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-11 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF] transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-xl">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#6C47FF] hover:bg-[#5234CC] disabled:bg-[#6C47FF]/50 text-white font-semibold rounded-xl shadow-md shadow-[#6C47FF]/20 hover:shadow-lg hover:shadow-[#6C47FF]/25 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-[#6C47FF] hover:text-[#5234CC] transition-colors">
            Create account
          </Link>
        </p>

        {/* Trust Indicators */}
        <div className="flex items-center justify-center gap-4 mt-8 opacity-50">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="material-symbols-outlined text-sm">lock</span>
            <span>Encrypted</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="material-symbols-outlined text-sm">verified_user</span>
            <span>Secure</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="material-symbols-outlined text-sm">privacy_tip</span>
            <span>Private</span>
          </div>
        </div>
      </div>
    </div>
  );
}
