'use client';

import Image from 'next/image';

export default function UserDashboardHeader({ 
  userName = 'Aditi',
  safetyScore = null,
  safetyLabel = 'Checking...',
  safetyColor = 'slate',
  safetyLoading = false,
  onNotificationClick 
}) {
  // Color mappings for the safety status
  const colorMap = {
    green: {
      dot: 'bg-green-500',
      text: 'text-green-600 dark:text-green-400',
      pulse: false,
    },
    amber: {
      dot: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
      pulse: false,
    },
    red: {
      dot: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      pulse: true,
    },
    slate: {
      dot: 'bg-slate-400',
      text: 'text-slate-500 dark:text-slate-400',
      pulse: false,
    },
  };

  const colors = colorMap[safetyColor] || colorMap.slate;

  return (
    <header className="flex items-center justify-between px-6 py-4 sticky top-0 bg-[#f7f6f8]/80 dark:bg-[#181121]/80 backdrop-blur-md z-30">
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-full overflow-hidden border-2 border-[#8b47eb]/20">
          <Image
            alt="User Profile Avatar"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBM1X-nNCueGFCP8PGvwITGzLllmZwoFd0pXSZ2rAssWiff1hhMO0LUgYnStHk-y1eeY-a58SJZmgcGvzhzWHD-r26XPlt-yAUD6SecUdZuwTpDCpGd_Y_LAkk7AQ2mYOeSmfUdgMjKMr8wLEu2PMeye16AGc51oP62REO391n8LXxniqzuPMBt8QfPKbpFVBlwVhwbtsyV8V3HAOqbNZrCqwddbKkUyOLpfX_uHfaxwmLVVIf_M-lytRLRBhTPghx0sc_iv5hfQu0"
            width={48}
            height={48}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Hello, {userName}</h1>
          <p className={`text-xs font-medium flex items-center gap-1 ${colors.text}`}>
            {safetyLoading ? (
              <>
                <span className="size-2 bg-slate-300 rounded-full inline-block animate-pulse"></span>
                <span className="text-slate-400">Analyzing safety...</span>
              </>
            ) : safetyLabel === 'Turn on location' ? (
              <>
                <span className="material-symbols-outlined text-xs text-slate-400">location_off</span>
                <span className="text-slate-400">Enable location tracking ↓</span>
              </>
            ) : (
              <>
                <span className={`size-2 ${colors.dot} rounded-full inline-block ${colors.pulse ? 'animate-pulse' : ''}`}></span>
                Safety: {safetyLabel}
                {safetyScore !== null && (
                  <span className="text-[10px] opacity-70 ml-0.5">({safetyScore}/100)</span>
                )}
              </>
            )}
          </p>
        </div>
      </div>
      <button
        onClick={onNotificationClick}
        className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        <span className="material-symbols-outlined">notifications</span>
      </button>
    </header>
  );
}
