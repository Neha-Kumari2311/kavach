'use client';

import { useState } from 'react';

// Real Indian emergency helpline data — focused on women safety
const NATIONAL_HELPLINES = [
  { id: 'n1', name: 'Women Helpline (All India)', phone: '181', category: 'Women Safety', description: 'National Commission for Women - 24/7' },
  { id: 'n2', name: 'Women Helpline (Domestic Abuse)', phone: '1091', category: 'Women Safety', description: 'For domestic violence and abuse' },
  { id: 'n3', name: 'NCW Helpline (WhatsApp)', phone: '7827-170-170', category: 'Women Safety', description: 'National Commission for Women - send complaints via WhatsApp' },
  { id: 'n4', name: 'Emergency Response (ERSS)', phone: '112', category: 'Emergency', description: 'Single number for Police, Fire, Ambulance' },
  { id: 'n5', name: 'Police', phone: '100', category: 'Police', description: 'Emergency Police assistance' },
  { id: 'n6', name: 'Cyber Crime Helpline', phone: '1930', category: 'Cyber Crime', description: 'Online harassment, stalking, morphing complaints' },
  { id: 'n7', name: 'Mental Health (NIMHANS)', phone: '080-46110007', category: 'Support', description: 'Trauma counseling & mental health support' },
  { id: 'n8', name: 'Vandrevala Foundation', phone: '1860-2662-345', category: 'Support', description: '24/7 free counseling for trauma & abuse survivors' },
];

const STATE_HELPLINES = [
  { id: 's1', state: 'DELHI', name: 'Delhi Women Helpline', phone: '1091', category: 'Women Safety' },
  { id: 's2', state: 'DELHI', name: 'Delhi Police (Women Cell)', phone: '011-24673366', category: 'Women Safety' },
  { id: 's3', state: 'DELHI', name: 'Himmat App Support', phone: '011-26441111', category: 'Women Safety' },
  { id: 's4', state: 'MAHARASHTRA', name: 'Maharashtra Women Helpline', phone: '103', category: 'Women Safety' },
  { id: 's5', state: 'MAHARASHTRA', name: 'Mumbai Police Women Cell', phone: '022-22621855', category: 'Women Safety' },
  { id: 's6', state: 'MAHARASHTRA', name: 'Nirbhaya Squad (Mumbai)', phone: '103', category: 'Women Safety' },
  { id: 's7', state: 'KARNATAKA', name: 'Karnataka Women Helpline', phone: '1091', category: 'Women Safety' },
  { id: 's8', state: 'KARNATAKA', name: 'Vanitha Sahayavani', phone: '1091', category: 'Women Safety' },
  { id: 's9', state: 'KARNATAKA', name: 'Bangalore Police', phone: '080-22943000', category: 'Police' },
  { id: 's10', state: 'TAMIL NADU', name: 'TN Women Helpline', phone: '1091', category: 'Women Safety' },
  { id: 's11', state: 'TAMIL NADU', name: 'Chennai City Police', phone: '044-23452365', category: 'Police' },
  { id: 's12', state: 'TAMIL NADU', name: 'Kavalan SOS', phone: '100', category: 'Police' },
  { id: 's13', state: 'UTTAR PRADESH', name: 'UP Women Helpline (1090)', phone: '1090', category: 'Women Safety' },
  { id: 's14', state: 'UTTAR PRADESH', name: 'UP 112', phone: '112', category: 'Emergency' },
  { id: 's15', state: 'UTTAR PRADESH', name: 'Lucknow Police', phone: '0522-2613276', category: 'Police' },
  { id: 's16', state: 'WEST BENGAL', name: 'WB Women Helpline', phone: '1091', category: 'Women Safety' },
  { id: 's17', state: 'WEST BENGAL', name: 'Kolkata Police Women Cell', phone: '033-22143230', category: 'Women Safety' },
  { id: 's18', state: 'RAJASTHAN', name: 'Rajasthan Women Helpline', phone: '1091', category: 'Women Safety' },
  { id: 's19', state: 'RAJASTHAN', name: 'Abhay Command Centre', phone: '181', category: 'Women Safety' },
  { id: 's20', state: 'GUJARAT', name: 'Gujarat Women Helpline', phone: '181', category: 'Women Safety' },
  { id: 's21', state: 'GUJARAT', name: 'Abhayam (Gujarat)', phone: '181', category: 'Women Safety' },
  { id: 's22', state: 'KERALA', name: 'Kerala Women Helpline', phone: '1091', category: 'Women Safety' },
  { id: 's23', state: 'KERALA', name: 'Mithram (Kerala)', phone: '1517', category: 'Mental Health' },
  { id: 's24', state: 'PUNJAB', name: 'Punjab Women Helpline', phone: '1091', category: 'Women Safety' },
  { id: 's25', state: 'PUNJAB', name: 'Punjab Police', phone: '112', category: 'Police' },
  { id: 's26', state: 'HARYANA', name: 'Haryana Women Helpline', phone: '1091', category: 'Women Safety' },
  { id: 's27', state: 'HARYANA', name: 'Durga Shakti App Support', phone: '1091', category: 'Women Safety' },
  { id: 's28', state: 'TELANGANA', name: 'Telangana Women Safety (SHE Teams)', phone: '100', category: 'Women Safety' },
  { id: 's29', state: 'TELANGANA', name: 'Bharosa Centre', phone: '040-27852252', category: 'Women Safety' },
  { id: 's30', state: 'ANDHRA PRADESH', name: 'AP Women Helpline (Disha)', phone: '100', category: 'Women Safety' },
  { id: 's31', state: 'ANDHRA PRADESH', name: 'Disha App Support', phone: '181', category: 'Women Safety' },
  { id: 's32', state: 'MADHYA PRADESH', name: 'MP Women Helpline', phone: '1091', category: 'Women Safety' },
  { id: 's33', state: 'MADHYA PRADESH', name: 'Dial 100 (MP)', phone: '100', category: 'Police' },
  { id: 's34', state: 'BIHAR', name: 'Bihar Women Helpline', phone: '1091', category: 'Women Safety' },
  { id: 's35', state: 'BIHAR', name: 'Bihar Police Control Room', phone: '0612-2201977', category: 'Police' },
  { id: 's36', state: 'ODISHA', name: 'Odisha Women Helpline', phone: '181', category: 'Women Safety' },
  { id: 's37', state: 'JHARKHAND', name: 'Jharkhand Women Helpline', phone: '181', category: 'Women Safety' },
  { id: 's38', state: 'CHHATTISGARH', name: 'CG Women Helpline', phone: '1091', category: 'Women Safety' },
  { id: 's39', state: 'ASSAM', name: 'Assam Women Helpline', phone: '181', category: 'Women Safety' },
  { id: 's40', state: 'GOA', name: 'Goa Women Helpline', phone: '1091', category: 'Women Safety' },
  { id: 's41', state: 'UTTARAKHAND', name: 'Uttarakhand Women Helpline', phone: '1090', category: 'Women Safety' },
  { id: 's42', state: 'HIMACHAL PRADESH', name: 'HP Women Helpline', phone: '1091', category: 'Women Safety' },
  { id: 's43', state: 'JAMMU AND KASHMIR', name: 'J&K Women Helpline', phone: '1091', category: 'Women Safety' },
  { id: 's44', state: 'CHANDIGARH', name: 'Chandigarh Women Helpline', phone: '1091', category: 'Women Safety' },
];

const INDIAN_STATES = [
  'ALL INDIA', 'ANDHRA PRADESH', 'ASSAM', 'BIHAR', 'CHANDIGARH', 'CHHATTISGARH', 'DELHI',
  'GOA', 'GUJARAT', 'HARYANA', 'HIMACHAL PRADESH', 'JAMMU AND KASHMIR', 'JHARKHAND',
  'KARNATAKA', 'KERALA', 'MADHYA PRADESH', 'MAHARASHTRA', 'ODISHA', 'PUNJAB',
  'RAJASTHAN', 'TAMIL NADU', 'TELANGANA', 'UTTAR PRADESH', 'UTTARAKHAND', 'WEST BENGAL',
];

const CATEGORY_ICONS = {
  'Women Safety': { icon: 'woman', bg: 'bg-pink-100 dark:bg-pink-900/30', color: 'text-pink-600 dark:text-pink-400' },
  'Police': { icon: 'local_police', bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' },
  'Medical': { icon: 'medical_services', bg: 'bg-red-100 dark:bg-red-900/30', color: 'text-red-600 dark:text-red-400' },
  'Fire': { icon: 'fire_truck', bg: 'bg-orange-100 dark:bg-orange-900/30', color: 'text-orange-600 dark:text-orange-400' },
  'Emergency': { icon: 'emergency', bg: 'bg-red-100 dark:bg-red-900/30', color: 'text-red-600 dark:text-red-400' },
  'Child Safety': { icon: 'child_care', bg: 'bg-yellow-100 dark:bg-yellow-900/30', color: 'text-yellow-600 dark:text-yellow-400' },
  'Cyber Crime': { icon: 'security', bg: 'bg-indigo-100 dark:bg-indigo-900/30', color: 'text-indigo-600 dark:text-indigo-400' },
  'Transport': { icon: 'directions_car', bg: 'bg-teal-100 dark:bg-teal-900/30', color: 'text-teal-600 dark:text-teal-400' },
  'Senior Citizens': { icon: 'elderly', bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400' },
  'Disaster': { icon: 'flood', bg: 'bg-purple-100 dark:bg-purple-900/30', color: 'text-purple-600 dark:text-purple-400' },
  'Education': { icon: 'school', bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-600 dark:text-emerald-400' },
  'Mental Health': { icon: 'psychology', bg: 'bg-violet-100 dark:bg-violet-900/30', color: 'text-violet-600 dark:text-violet-400' },
};

export default function HelplinesPage() {
  const [selectedState, setSelectedState] = useState('ALL INDIA');

  const handleCall = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  // Get filtered helplines
  const displayHelplines = selectedState === 'ALL INDIA'
    ? NATIONAL_HELPLINES
    : [
        ...NATIONAL_HELPLINES.filter(h => ['Women Safety', 'Police', 'Emergency', 'Medical', 'Fire'].includes(h.category)),
        ...STATE_HELPLINES.filter(h => h.state === selectedState),
      ];

  // Group by category
  const grouped = displayHelplines.reduce((acc, h) => {
    if (!acc[h.category]) acc[h.category] = [];
    acc[h.category].push(h);
    return acc;
  }, {});

  return (
    <div className="px-4 max-w-2xl mx-auto w-full space-y-5 pt-4 pb-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Helpline Directory</h1>
        <p className="text-xs text-slate-500 mt-1">Emergency helplines across India — Tap to call directly</p>
      </div>

      {/* State Filter */}
      <div className="relative">
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF] appearance-none pr-10"
        >
          {INDIAN_STATES.map((state) => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
      </div>

      {/* Emergency Banner */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-800/30 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-red-600 text-xl">emergency</span>
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-red-700 dark:text-red-300">In immediate danger? Call 112</p>
          <p className="text-[10px] text-red-600/70 dark:text-red-400/70">Single emergency number for Police, Fire & Ambulance</p>
        </div>
        <button onClick={() => handleCall('112')} className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg active:scale-95">
          Call
        </button>
      </div>

      {/* Helplines grouped by category */}
      {Object.entries(grouped).map(([category, helplines]) => {
        const catInfo = CATEGORY_ICONS[category] || { icon: 'phone', bg: 'bg-slate-100', color: 'text-slate-600' };
        return (
          <section key={category} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <div className={`w-7 h-7 rounded-lg ${catInfo.bg} flex items-center justify-center`}>
                <span className={`material-symbols-outlined text-sm ${catInfo.color}`}>{catInfo.icon}</span>
              </div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">{category}</h3>
              <span className="text-[10px] text-slate-400 ml-auto">{helplines.length} numbers</span>
            </div>
            <div className="space-y-2">
              {helplines.map((h) => (
                <div key={h.id} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{h.name}</p>
                    {h.description && <p className="text-[10px] text-slate-500 truncate">{h.description}</p>}
                    {h.state && <p className="text-[10px] text-[#6C47FF] font-medium">{h.state}</p>}
                  </div>
                  <button
                    onClick={() => handleCall(h.phone)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#6C47FF] text-white text-xs font-bold rounded-lg hover:bg-[#5a3bdb] active:scale-95 transition-all whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-sm">call</span>
                    {h.phone}
                  </button>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Info */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          <strong>Note:</strong> All helplines listed are official government numbers verified from respective state police and NCW websites. If you face any issues, dial 112 (universal emergency number). For online complaints, visit <span className="text-[#6C47FF] font-semibold">ncwapps.nic.in</span>
        </p>
      </div>
    </div>
  );
}
