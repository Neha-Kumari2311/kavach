'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState('individual');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!phone || !/^\d{10}$/.test(phone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!acceptedTerms) {
      setError('You must accept the terms and conditions');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email: email || null, password, accountType, companyId: accountType === 'company' ? document.getElementById('company-id-field')?.value?.trim() || null : null }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setIsSubmitting(false);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-[480px] text-center animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-4">
            <span className="material-symbols-outlined text-emerald-600 text-3xl">check_circle</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Account Created!</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Redirecting you to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
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
            Create Account
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Join Kavach for your safety
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-[#1A1A24] rounded-2xl shadow-[var(--shadow-lg)] border border-slate-100 dark:border-slate-800/50 p-6 space-y-5">

          {/* Account Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
              Account Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <button
                type="button"
                onClick={() => setAccountType('individual')}
                disabled={isSubmitting}
                className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  accountType === 'individual'
                    ? 'bg-white dark:bg-[#6C47FF] text-[#6C47FF] dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-lg">person</span>
                <span>Individual</span>
              </button>
              <button
                type="button"
                onClick={() => setAccountType('company')}
                disabled={isSubmitting}
                className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  accountType === 'company'
                    ? 'bg-white dark:bg-[#6C47FF] text-[#6C47FF] dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-lg">corporate_fare</span>
                <span>Company</span>
              </button>
            </div>
          </div>

          {/* Company ID - only shown for company account */}
          {accountType === 'company' && (
            <div className="bg-[#6C47FF]/5 border border-[#6C47FF]/20 rounded-xl p-3 space-y-2">
              <label className="block text-xs font-bold text-[#6C47FF]">Company ID *</label>
              <input
                type="text"
                placeholder="e.g. OLA-FLEET-001"
                required={accountType === 'company'}
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF] transition-all disabled:opacity-50"
                id="company-id-field"
              />
              <p className="text-[9px] text-slate-400">This ID will be used by passengers on their dashcam to link rides to your fleet. Choose a unique identifier.</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-900/15 border border-red-100 dark:border-red-800/30">
              <span className="material-symbols-outlined text-red-500 text-lg">error</span>
              <p className="text-sm text-red-600 dark:text-red-400 flex-1">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF] transition-all disabled:opacity-50"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF] transition-all disabled:opacity-50"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email <span className="text-slate-400 text-xs font-normal">(Optional)</span>
              </label>
              <input
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF] transition-all disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 pr-11 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF] transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF] transition-all disabled:opacity-50"
              />
            </div>


            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !acceptedTerms}
              className="w-full py-3.5 bg-[#6C47FF] hover:bg-[#5234CC] disabled:bg-[#6C47FF]/50 text-white font-semibold rounded-xl shadow-md shadow-[#6C47FF]/20 hover:shadow-lg hover:shadow-[#6C47FF]/25 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Create Secure Account</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-[#6C47FF] hover:text-[#5234CC] transition-colors">
            Sign in
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
