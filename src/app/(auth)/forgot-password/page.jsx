'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1); // 1 = enter login, 2 = set new password
  const [login, setLogin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (step === 1) {
      // Validate login input
      const trimmed = login.trim();
      const isEmail = /^\S+@\S+\.\S+$/.test(trimmed);
      const isPhone = /^\d{10}$/.test(trimmed);

      if (!isEmail && !isPhone) {
        setError('Please enter a valid email or 10-digit phone number');
        return;
      }

      setStep(2);
      return;
    }

    // Step 2: Submit new password
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: login.trim(),
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Password reset failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setIsSubmitting(false);
    } catch (err) {
      console.error('Reset password error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="font-display bg-[#f7f6f8] dark:bg-[#181121] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 shadow-xl rounded-xl overflow-hidden border border-[#8b47eb]/10 p-8 text-center">
          <div className="bg-green-100 dark:bg-green-900/30 text-green-600 p-3 rounded-full inline-flex mb-4">
            <span className="material-symbols-outlined text-3xl block">check_circle</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Password Reset!</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            Your password has been updated successfully. You can now log in with your new password.
          </p>
          <Link
            href="/login"
            className="mt-6 w-full inline-block bg-[#8b47eb] hover:bg-[#8b47eb]/90 text-white font-bold py-3 rounded-lg shadow-lg shadow-[#8b47eb]/20 transition-all transform active:scale-[0.98]"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="font-display bg-[#f7f6f8] dark:bg-[#181121] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 shadow-xl rounded-xl overflow-hidden border border-[#8b47eb]/10">
        {/* Header */}
        <div className="pt-8 pb-4 px-8 flex flex-col items-center">
          <div className="bg-[#8b47eb]/10 text-[#8b47eb] p-3 rounded-full mb-4">
            <span className="material-symbols-outlined text-3xl block">lock_reset</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Reset Password</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 text-center">
            {step === 1
              ? 'Enter the email or phone number associated with your account'
              : 'Set your new password'}
          </p>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className={`h-1.5 w-12 rounded-full ${step >= 1 ? 'bg-[#8b47eb]' : 'bg-slate-200 dark:bg-slate-700'}`} />
            <div className={`h-1.5 w-12 rounded-full ${step >= 2 ? 'bg-[#8b47eb]' : 'bg-slate-200 dark:bg-slate-700'}`} />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleResetPassword} className="px-8 pb-8 space-y-5">
          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-lg">error</span>
              <p className="text-sm text-red-600 dark:text-red-400 flex-1">{error}</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-1.5">
              <label
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                htmlFor="login-input"
              >
                Email or Phone Number
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                  person
                </span>
                <input
                  id="login-input"
                  type="text"
                  placeholder="name@example.com or 9876543210"
                  value={login}
                  onChange={(e) => {
                    setLogin(e.target.value);
                    setError('');
                  }}
                  required
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#f7f6f8] dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#8b47eb] focus:border-transparent transition-all outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              {/* Show which account */}
              <div className="bg-[#8b47eb]/5 rounded-lg p-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8b47eb] text-lg">account_circle</span>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">{login}</span>
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); }}
                  className="ml-auto text-xs text-[#8b47eb] font-semibold hover:underline"
                >
                  Change
                </button>
              </div>

              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  htmlFor="new-password"
                >
                  New Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">lock</span>
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError('');
                    }}
                    required
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-10 py-2.5 bg-[#f7f6f8] dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#8b47eb] focus:border-transparent transition-all outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label="Toggle password visibility"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  htmlFor="confirm-password"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">verified_user</span>
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    required
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#f7f6f8] dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#8b47eb] focus:border-transparent transition-all outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#8b47eb] hover:bg-[#8b47eb]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg shadow-lg shadow-[#8b47eb]/20 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                <span>Resetting...</span>
              </>
            ) : step === 1 ? (
              <>
                <span>Continue</span>
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </>
            ) : (
              <>
                <span>Reset Password</span>
                <span className="material-symbols-outlined text-lg">lock_reset</span>
              </>
            )}
          </button>

          {/* Back to login */}
          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-sm text-slate-500 hover:text-[#8b47eb] font-semibold transition-colors"
            >
              ← Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
