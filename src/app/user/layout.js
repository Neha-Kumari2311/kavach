'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SafetyScoreProvider, useSafetyScore } from '@/hooks/useSafetyScore';
import ChatWidget from '@/components/ChatWidget';

function UserLayoutInner({ children }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { safetyScore, safetyLabel, safetyColor, loading: safetyLoading } = useSafetyScore();
  const userName = session?.user?.name?.split(' ')[0] || 'User';

  const isActive = (path) => pathname === path || pathname?.startsWith(path + '/');

  // Dashcam page handles its own fullscreen mode internally

  return (
    <div className="bg-white dark:bg-[#0f0a1a] font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#2d1560] via-[#4a2db3] to-[#6C47FF] backdrop-blur-md border-b border-[#6C47FF]/20">
        <div className="flex items-center justify-between px-5 py-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-white text-xs font-bold">K</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/60">
                {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'},
              </p>
              <h1 className="text-lg font-extrabold text-white tracking-tight truncate">
                {userName}
              </h1>
              {/* Safety Score Badge */}
              <div className="mt-1">
                {safetyLoading ? (
                  <span className="text-[10px] text-white/40 animate-pulse">Analyzing safety...</span>
                ) : safetyScore !== null ? (
                  <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    safetyColor === 'green' ? 'bg-emerald-400/20 text-emerald-200' :
                    safetyColor === 'amber' ? 'bg-amber-400/20 text-amber-200' :
                    safetyColor === 'red' ? 'bg-red-400/20 text-red-200' :
                    'bg-white/10 text-white/50'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      safetyColor === 'green' ? 'bg-emerald-400' :
                      safetyColor === 'amber' ? 'bg-amber-400' :
                      safetyColor === 'red' ? 'bg-red-400 animate-pulse' :
                      'bg-white/40'
                    }`}></span>
                    {safetyLabel} {safetyScore}/100
                  </div>
                ) : (
                  <span className="text-[10px] text-white/40">Enable location for safety score</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => console.log("Notifications clicked")}
              className="relative w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 hover:bg-white/20 transition-all active:scale-95"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined text-white text-xl">notifications</span>
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="relative w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 hover:bg-red-500/30 transition-all active:scale-95"
              aria-label="Logout"
            >
              <span className="material-symbols-outlined text-white text-xl">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-3 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-around">
          <Link href="/user/dashboard" className={`flex flex-col items-center gap-1 py-1 px-1 transition-colors ${isActive('/user/dashboard') ? 'text-[#6C47FF]' : 'text-slate-400 hover:text-[#6C47FF]'}`}>
            <span className={`material-symbols-outlined text-2xl ${isActive('/user/dashboard') ? 'fill-1' : ''}`}>home</span>
            <span className={`text-xs ${isActive('/user/dashboard') ? 'font-bold' : 'font-medium'}`}>Home</span>
          </Link>
          <Link href="/user/dashcam" className={`flex flex-col items-center gap-1 py-1 px-1 transition-colors ${isActive('/user/dashcam') ? 'text-[#6C47FF]' : 'text-slate-400 hover:text-[#6C47FF]'}`}>
            <span className={`material-symbols-outlined text-2xl ${isActive('/user/dashcam') ? 'fill-1' : ''}`}>videocam</span>
            <span className={`text-xs ${isActive('/user/dashcam') ? 'font-bold' : 'font-medium'}`}>Dashcam</span>
          </Link>
          <Link href="/user/predict" className={`flex flex-col items-center gap-1 py-1 px-1 transition-colors ${isActive('/user/predict') ? 'text-[#6C47FF]' : 'text-slate-400 hover:text-[#6C47FF]'}`}>
            <span className={`material-symbols-outlined text-2xl ${isActive('/user/predict') ? 'fill-1' : ''}`}>insights</span>
            <span className={`text-xs ${isActive('/user/predict') ? 'font-bold' : 'font-medium'}`}>AI Score</span>
          </Link>
          <Link href="/user/contacts" className={`flex flex-col items-center gap-1 py-1 px-1 transition-colors ${isActive('/user/contacts') ? 'text-[#6C47FF]' : 'text-slate-400 hover:text-[#6C47FF]'}`}>
            <span className={`material-symbols-outlined text-2xl ${isActive('/user/contacts') ? 'fill-1' : ''}`}>group</span>
            <span className={`text-xs ${isActive('/user/contacts') ? 'font-bold' : 'font-medium'}`}>Contacts</span>
          </Link>
          <Link href="/user/helplines" className={`flex flex-col items-center gap-1 py-1 px-1 transition-colors ${isActive('/user/helplines') ? 'text-[#6C47FF]' : 'text-slate-400 hover:text-[#6C47FF]'}`}>
            <span className={`material-symbols-outlined text-2xl ${isActive('/user/helplines') ? 'fill-1' : ''}`}>support_agent</span>
            <span className={`text-xs ${isActive('/user/helplines') ? 'font-bold' : 'font-medium'}`}>Helplines</span>
          </Link>
          <Link href="/user/store" className={`flex flex-col items-center gap-1 py-1 px-1 transition-colors ${isActive('/user/store') ? 'text-[#6C47FF]' : 'text-slate-400 hover:text-[#6C47FF]'}`}>
            <span className={`material-symbols-outlined text-2xl ${isActive('/user/store') ? 'fill-1' : ''}`}>shopping_bag</span>
            <span className={`text-xs ${isActive('/user/store') ? 'font-bold' : 'font-medium'}`}>Store</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

export default function UserLayout({ children }) {
  return (
    <SafetyScoreProvider>
      <UserLayoutInner>{children}</UserLayoutInner>
      <ChatWidget />
    </SafetyScoreProvider>
  );
}
