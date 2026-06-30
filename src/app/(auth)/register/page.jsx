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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Client-side validation
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          phone,
          email: email || null,
          password,
          accountType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Success
      setSuccess(true);
      setIsSubmitting(false);

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      console.error('Registration error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="bg-[#f7f6f8] dark:bg-[#181121] min-h-screen flex flex-col items-center justify-center p-4 font-display">
      {/* Main Container */}
      <div className="w-full max-w-[480px] bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header Section */}
        <div className="relative">
          <div className="h-32 bg-[#8b47eb]/10 flex items-center justify-center relative overflow-hidden">
            {/* Abstract Security Pattern Background */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#8b47eb] via-transparent to-transparent"></div>
            <div className="z-10 bg-[#8b47eb] text-white p-3 rounded-xl shadow-lg">
              <span className="material-symbols-outlined text-4xl block">shield</span>
            </div>
          </div>
          <div className="px-8 pt-6 pb-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Join Kavach
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Your Safety ! Our Priority !
            </p>
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          {/* Success Message */}
          {success && (
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-lg">
                check_circle
              </span>
              <p className="text-sm text-green-600 dark:text-green-400 flex-1">
                Account created successfully! Redirecting to login...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-lg">
                error
              </span>
              <p className="text-sm text-red-600 dark:text-red-400 flex-1">
                {error}
              </p>
            </div>
          )}

          {/* Account Type Selection */}
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Account Type
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  accountType === 'individual'
                    ? 'border-[#8b47eb] bg-[#8b47eb]/5 hover:bg-[#8b47eb]/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-[#8b47eb]/50'
                }`}
              >
                <input
                  type="radio"
                  name="account_type"
                  value="individual"
                  checked={accountType === 'individual'}
                  onChange={(e) => {
                    setAccountType(e.target.value);
                    setError('');
                  }}
                  disabled={isSubmitting}
                  className="sr-only"
                />
                <span
                  className={`material-symbols-outlined mb-1 ${
                    accountType === 'individual'
                      ? 'text-[#8b47eb]'
                      : 'text-slate-400'
                  }`}
                >
                  person
                </span>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Individual
                </span>
              </label>
              <label
                className={`relative flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  accountType === 'company'
                    ? 'border-[#8b47eb] bg-[#8b47eb]/5 hover:bg-[#8b47eb]/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-[#8b47eb]/50'
                } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="account_type"
                  value="company"
                  checked={accountType === 'company'}
                  onChange={(e) => {
                    setAccountType(e.target.value);
                    setError('');
                  }}
                  disabled={isSubmitting}
                  className="sr-only"
                />
                <span
                  className={`material-symbols-outlined mb-1 ${
                    accountType === 'company'
                      ? 'text-[#8b47eb]'
                      : 'text-slate-400'
                  }`}
                >
                  corporate_fare
                </span>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Company
                </span>
              </label>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-xs">badge</span>
              Full Name
            </label>
            <input
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              required
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#8b47eb]/20 focus:border-[#8b47eb] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Phone Number (Mandatory) */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-xs">call</span>
              Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">+91</span>
              <input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(val);
                  setError('');
                }}
                required
                disabled={isSubmitting}
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#8b47eb]/20 focus:border-[#8b47eb] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <p className="text-[10px] text-slate-400">10-digit mobile number</p>
          </div>

          {/* Email Address (Optional) */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-xs">alternate_email</span>
              Email Address <span className="text-slate-400 font-normal text-xs">(Optional)</span>
            </label>
            <input
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#8b47eb]/20 focus:border-[#8b47eb] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-xs">lock</span>
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#8b47eb]/20 focus:border-[#8b47eb] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                disabled={isSubmitting}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-[#8b47eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {/* Password Strength Hint */}
            <div className="flex gap-1 mt-1.5">
              <div className={`h-1 flex-1 rounded-full ${password.length >= 2 ? 'bg-[#8b47eb]' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
              <div className={`h-1 flex-1 rounded-full ${password.length >= 4 ? 'bg-[#8b47eb]' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
              <div className={`h-1 flex-1 rounded-full ${password.length >= 6 ? 'bg-[#8b47eb]' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
              <div className={`h-1 flex-1 rounded-full ${password.length >= 8 ? 'bg-[#8b47eb]' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
              Use at least 6 characters
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-xs">verified_user</span>
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError('');
                }}
                required
                disabled={isSubmitting}
                className="w-full px-4 py-3 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#8b47eb]/20 focus:border-[#8b47eb] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                disabled={isSubmitting}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-[#8b47eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined">
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start gap-3 py-2">
            <input
              type="checkbox"
              id="terms"
              checked={acceptedTerms}
              onChange={(e) => {
                setAcceptedTerms(e.target.checked);
                setError('');
              }}
              required
              disabled={isSubmitting}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-[#8b47eb] focus:ring-[#8b47eb] disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label
              htmlFor="terms"
              className="text-xs text-slate-500 dark:text-slate-400 leading-normal"
            >
              By creating an account, you agree to our{' '}
              <Link
                href="/terms"
                className="text-[#8b47eb] hover:underline font-semibold"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy"
                className="text-[#8b47eb] hover:underline font-semibold"
              >
                Privacy Policy
              </Link>
              .
            </label>
          </div>

          {/* Primary Action */}
          <button
            type="submit"
            disabled={isSubmitting || !acceptedTerms}
            className="w-full bg-[#8b47eb] hover:bg-[#8b47eb]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg shadow-lg shadow-[#8b47eb]/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-lg">
                  sync
                </span>
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Create Secure Account</span>
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {/* Footer / Back to Login */}
        <div className="px-8 pb-8 text-center">
          <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-xs text-slate-400 uppercase tracking-widest font-bold">
              Already a member?
            </span>
            <div className="flex-grow border-t border-slate-100 dark:border-slate-800"></div>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full py-3 text-slate-600 dark:text-slate-300 font-semibold hover:text-[#8b47eb] transition-colors border border-transparent hover:border-[#8b47eb]/20 rounded-lg"
          >
            <span className="material-symbols-outlined text-lg">login</span>
            Back to Login
          </Link>
        </div>
      </div>

      {/* Extra space for mobile keyboard comfort */}
      <div className="h-8"></div>
    </div>
  );
}
