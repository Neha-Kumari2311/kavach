'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const ROLE_OPTIONS = [
  { label: 'User', value: 'user' },
  { label: 'Company Admin', value: 'company' },
  { label: 'Super Admin', value: 'admin' },
];

// Map roles to redirect paths
const getRedirectPath = (role) => {
  switch (role) {
    case 'user':
      return 'user/dashboard';
    case 'company':
      return '/company/dashboard';
    case 'admin':
      return '/admin/dashboard';
    default:
      return '/dashboard';
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
        // Get the session to check user role
        const sessionResponse = await fetch('/api/auth/session');
        const session = await sessionResponse.json();
        
        // Redirect based on authenticated user's role
        const redirectPath = getRedirectPath(session?.user?.role || role);
        router.push(redirectPath);
        router.refresh();
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="font-display bg-[#f7f6f8] dark:bg-[#181121] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col items-center justify-center p-4">
      {/* Login Container */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 shadow-xl rounded-xl overflow-hidden border border-[#8b47eb]/10">
        {/* Top Branding Section */}
        <div className="pt-8 pb-6 px-8 flex flex-col items-center">
          <div className="bg-[#8b47eb]/10 text-[#8b47eb] p-3 rounded-full mb-4">
            <span className="material-symbols-outlined text-4xl block">
              shield_lock
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-1">
            Welcome to Kavach
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Secure access to your platform
          </p>
        </div>

        {/* Main Form */}
        <div className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-5" method="POST">
            {/* Role Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 text-center">
                Login as
              </label>
              <div className="flex h-11 items-center justify-center rounded-lg bg-[#8b47eb]/5 dark:bg-[#8b47eb]/10 p-1 border border-[#8b47eb]/10">
                {ROLE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-md px-2 transition-all text-xs font-semibold ${
                      role === option.value
                        ? 'bg-white dark:bg-[#8b47eb] shadow-sm text-[#8b47eb] dark:text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={role === option.value}
                      onChange={(e) => {
                        setRole(e.target.value);
                        setError('');
                      }}
                      disabled={isSubmitting}
                      className="hidden"
                    />
                  </label>
                ))}
              </div>
            </div>

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

            {/* Credentials */}
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  htmlFor="login"
                >
                  Email or Phone Number
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                    person
                  </span>
                  <input
                    id="login"
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

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-[#8b47eb] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                    lock
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    required
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-10 py-2.5 bg-[#f7f6f8] dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#8b47eb] focus:border-transparent transition-all outline-none text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    disabled={isSubmitting}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#8b47eb] hover:bg-[#8b47eb]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg shadow-lg shadow-[#8b47eb]/20 transition-all flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">
                    sync
                  </span>
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <span>Login </span>
                  <span className="material-symbols-outlined text-lg">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-[#8b47eb]/5 dark:bg-[#8b47eb]/10 px-8 py-5 border-t border-[#8b47eb]/10 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Don't have an account?{' '}
            <Link
              href="/register"
              className="text-[#8b47eb] font-bold hover:underline"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      {/* Security Badge Section */}
      <div className="mt-8 flex flex-col items-center opacity-60">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-[#8b47eb] text-sm">
            verified_user
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            End-to-End Encrypted
          </span>
        </div>
        <div className="flex gap-4">
          <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded flex items-center justify-center overflow-hidden">
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtVliApYLXwPsIV9Cl_AHB8F3ZmyVQa1KN3FeAGaALbWH7rGwfPsqc2MZDJ8jiJDNXNMAhZFzI_3r3VhLNV8hl-N2BEUHWCM26_-NckuzHBdxzRgGmLX7s2JWHh0j9hnZH3hRl1QMl-7DYd7XgwIXO-k6od9ctNiSQInXtkAOBxAPq9sACES2NZg605i7xn3DApdOgum8kaXb9Q8v1908wJSDwk8b5eXvG3SYXuyyijC5TplE1VcQLNw743N7yCKXug93m_HMjn4c"
              alt="ISO Certification Security Badge"
              width={64}
              height={32}
              className="grayscale brightness-125 opacity-50"
            />
          </div>
          <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded flex items-center justify-center overflow-hidden">
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3pUw_Akf4IzDmSKhyKMitJO9bV5ruUz0j-CkbTTOheUG_TnBnOwBNKkeWudyqGQJp42K5V1qOJjda_K-73R6eaO1WDzSy1fFNInO3YmHEsWFQm6K8-Jl7QDxpF6uY2BAQne_XE17hQnCiYrnfOOhUj_K0B7AwFkLPXVCmIW7Fe5tQmMopBmkKv3aebSDgWSmXe-k0FssEQCVSlo9wHLzSbr7V7yC6mQbFWFnGHL5Gkp2ohMPpKqwoD2OkFCC5CNjI2QaZHMTiWoY"
              alt="SOC2 Compliance Security Badge"
              width={64}
              height={32}
              className="grayscale brightness-125 opacity-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
