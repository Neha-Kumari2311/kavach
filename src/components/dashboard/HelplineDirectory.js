'use client';

const HELPLINES = [
  {
    name: 'Emergency Police',
    description: 'National emergency number',
    number: '112',
    icon: 'emergency',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600',
  },
  {
    name: 'Women Helpline',
    description: '24/7 dedicated support',
    number: '181',
    icon: 'support_agent',
    iconBg: 'bg-pink-100 dark:bg-pink-900/30',
    iconColor: 'text-pink-600',
  },
  {
    name: 'Women Police',
    description: 'Women police helpline',
    number: '1091',
    icon: 'local_police',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600',
  },
  {
    name: 'NCW Helpline',
    description: 'National Commission for Women',
    number: '14490',
    icon: 'woman',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600',
  },
  {
    name: 'NCW 24×7',
    description: 'NCW WhatsApp support',
    number: '7827170170',
    icon: 'chat',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600',
  },
  {
    name: 'Police',
    description: 'Immediate local assistance',
    number: '100',
    icon: 'shield',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
    iconColor: 'text-indigo-600',
  },
];

export default function HelplineDirectory() {
  const handleCall = (number) => {
    console.log('Calling:', number);
    window.location.href = `tel:${number}`;
  };

  return (
    <section className="space-y-3">
      <h3 className="font-bold text-slate-900 dark:text-slate-100 px-1">
        Helpline Directory
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {HELPLINES.map((helpline) => (
          <button
            key={helpline.number}
            onClick={() => handleCall(helpline.number)}
            className="flex items-center gap-2.5 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-[#8b47eb]/30 hover:shadow-sm transition-all active:scale-[0.98] text-left"
          >
            <div
              className={`size-9 rounded-full ${helpline.iconBg} flex-shrink-0 flex items-center justify-center ${helpline.iconColor}`}
            >
              <span className="material-symbols-outlined text-lg">{helpline.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{helpline.name}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{helpline.description}</p>
              <p className="text-xs font-bold text-[#8b47eb] mt-0.5 flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[11px]">call</span>
                {helpline.number}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
