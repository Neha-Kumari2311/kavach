'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function LandingPage() {
  const { status } = useSession();
  const isLoggedIn = status === 'authenticated';

  return (
    <div className="min-h-screen bg-white font-display text-slate-900 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6C47FF] to-[#8B6AFF] flex items-center justify-center">
              <span className="text-white text-xs font-bold">K</span>
            </div>
            <span className="font-bold text-lg tracking-tight">KAVACH</span>
          </div>
          <Link
            href={isLoggedIn ? "/user/dashboard" : "/login"}
            className="px-5 py-2 bg-gradient-to-r from-[#6C47FF] to-[#8B6AFF] text-white text-sm font-bold rounded-full shadow-lg shadow-[#6C47FF]/20 hover:shadow-xl hover:shadow-[#6C47FF]/30 transition-all active:scale-95"
          >
            {isLoggedIn ? 'Dashboard' : 'Get Started'}
          </Link>
        </div>
      </header>

      {/* Hero Section with gradient background */}
      <section className="bg-gradient-to-br from-[#2d1560] via-[#4a2db3] to-[#6C47FF] relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(139,106,255,0.2) 0%, transparent 40%)'}}></div>
        <div className="max-w-2xl mx-auto px-5 pt-16 pb-12 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full mb-6">
            <span className="material-symbols-outlined text-white text-sm">verified_user</span>
            <span className="text-xs font-semibold text-white">Trusted by 1M+ Users</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4 text-white">
            Your Safety,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-amber-200">Our Priority</span>
          </h1>
          
          <p className="text-sm md:text-base text-white/70 leading-relaxed max-w-lg mx-auto mb-8">
            Experience peace of mind with AI-driven threat detection, instant emergency response, and real-time live tracking. Kavach is your smart guardian in an unpredictable world.
          </p>

          <div className="flex items-center justify-center gap-3 mb-10">
            <Link
              href="/register"
              className="px-7 py-3.5 bg-white text-[#6C47FF] font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">shield</span>
              Get Started
            </Link>
            <Link
              href="/login"
              className="px-7 py-3.5 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-bold rounded-xl hover:bg-white/20 transition-all active:scale-95 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">login</span>
              Sign In
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-white">1M+</p>
              <p className="text-[10px] text-white/60 font-medium">Daily Users</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-white">24/7</p>
              <p className="text-[10px] text-white/60 font-medium">Response Center</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-white">150+</p>
              <p className="text-[10px] text-white/60 font-medium">Cities Covered</p>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-2xl mx-auto px-5">

        {/* Elite Protection Features */}
        <section className="py-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold mb-2">Elite Protection Features</h2>
            <p className="text-xs text-slate-500">Sophisticated tools designed for the modern commuter, traveler, and citizen</p>
          </div>

          <div className="space-y-4">
            {[
              { icon: 'my_location', title: 'Live Tracking', desc: 'Share your precise journey with trusted contacts in real time with encrypted precision.' },
              { icon: 'psychology', title: 'AI Risk Prediction', desc: 'Predictive AI analyzes safety patterns to alert you of potential threats before they happen.' },
              { icon: 'videocam', title: 'Cloud Dashcam', desc: 'Instant hands-free recording with automatic cloud backup, ensuring evidence is never lost.' },
              { icon: 'storefront', title: 'Safety Store', desc: 'Curated safety gear and accessories designed for your everyday protection.' },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-11 h-11 rounded-xl bg-[#6C47FF]/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#6C47FF]">{feature.icon}</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-0.5">{feature.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Your Journey to Safety */}
        <section className="py-10">
          <h2 className="text-2xl font-extrabold text-center mb-2">Your Journey to Absolute Security</h2>
          <p className="text-xs text-slate-500 text-center mb-8">Get started in 3 simple steps</p>

          <div className="space-y-5">
            {[
              { step: '1', title: 'Download & Calibrate', desc: 'Set up your profile, emergency contacts, daily routes and safety preferences.' },
              { step: '2', title: 'Activate Smart Guardian', desc: 'Begin any trip with a single tap. Kavach monitors your path, speed, and surroundings.' },
              { step: '3', title: 'Instant Peace of Mind', desc: 'In case of any anomaly, help is dispatched instantly or your safety network is alerted with live data.' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6C47FF] to-[#8B6AFF] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#6C47FF]/20">
                  <span className="text-white font-bold text-sm">{item.step}</span>
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="font-bold text-sm mb-0.5">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>


        {/* FAQ */}
        <section className="py-10">
          <h2 className="text-2xl font-extrabold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {[
              { q: 'How fast is the SOS response?', a: 'Within seconds, your emergency contacts receive your live location via WhatsApp.' },
              { q: 'Is my location data private?', a: 'Your data is encrypted end-to-end and only shared with contacts you explicitly trust.' },
              { q: 'Does the app drain my battery?', a: 'Kavach uses optimized background processing that minimizes battery consumption.' },
            ].map((faq, i) => (
              <details key={i} className="bg-slate-50 rounded-xl border border-slate-100 group">
                <summary className="p-4 font-bold text-sm cursor-pointer flex items-center justify-between list-none">
                  {faq.q}
                  <span className="material-symbols-outlined text-slate-400 text-lg group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <p className="px-4 pb-4 text-xs text-slate-500 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-[#2d1560] via-[#4a2db3] to-[#6C47FF] py-10 px-5">
        <div className="max-w-md mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">K</span>
            </div>
            <span className="font-bold text-sm text-white">KAVACH</span>
          </div>
          <p className="text-[10px] text-white/50 mb-3">© 2024 KAVACH Security. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 text-[10px] text-white/50">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-white cursor-pointer transition-colors">Help Center</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
