'use client';

export default function UserDashboardHeader({
  userName = 'User',
  safetyScore = null,
  safetyLabel = 'Checking...',
  safetyColor = 'slate',
  safetyLoading = false,
  onNotificationClick
}) {
  const colorMap = {
    green: {
      dot: 'bg-emerald-500',
      text: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800/40',
      pulse: false,
    },
    amber: {
      dot: 'bg-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800/40',
      pulse: false,
    },
    red: {
      dot: 'bg-red-500',
      text: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800/40',
      pulse: true,
    },
    slate: {
      dot: 'bg-slate-400',
      text: 'text-slate-500 dark:text-slate-400',
      bg: 'bg-slate-50 dark:bg-slate-800/50',
      border: 'border-slate-200 dark:border-slate-700',
      pulse: false,
    },
  };

  const colors = colorMap[safetyColor] || colorMap.slate;
  const firstName = userName.split(' ')[0];

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="sticky top-0 z-30 glass border-b border-slate-100 dark:border-slate-800/50">
      <div className="flex items-center justify-between px-5 py-4 max-w-md mx-auto">
        {/* Left: Greeting & Safety Status */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {getGreeting()},
          </p>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
            {firstName}
          </h1>

          {/* Safety Badge */}
          <div className="mt-1.5">
            {safetyLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse"></div>
                <span className="text-xs text-slate-400">Analyzing safety...</span>
              </div>
            ) : safetyLabel === 'Turn on location' ? (
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs text-slate-400">location_off</span>
                <span className="text-xs text-slate-400">Enable location for safety score</span>
              </div>
            ) : (
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} border ${colors.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} ${colors.pulse ? 'animate-pulse' : ''}`}></span>
                {safetyLabel}
                {safetyScore !== null && (
                  <span className="opacity-70">{safetyScore}/100</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Notification */}
        <button
          onClick={onNotificationClick}
          className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all active:scale-95"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-slate-600 dark:text-slate-300 text-xl">
            notifications
          </span>
        </button>
      </div>
    </header>
  );
}
