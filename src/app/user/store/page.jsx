'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { STORE_PRODUCTS, STORE_CATEGORIES } from '@/lib/store-products';

export default function SafetyStorePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredProducts = STORE_PRODUCTS.filter((p) => {
    const matchesSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="font-display bg-[#f7f6f8] dark:bg-[#181121] text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#f7f6f8]/80 dark:bg-[#181121]/80 backdrop-blur-md border-b border-[#8b47eb]/10 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-[#8b47eb]/10 rounded-full transition-colors"
            aria-label="Go back"
          >
            <span className="material-symbols-outlined text-[#8b47eb]">
              arrow_back
            </span>
          </button>
          <h1 className="text-xl font-bold tracking-tight">Kavach Store</h1>
        </div>
      </header>

      <main className="flex-1 pb-24">
        {/* Search Bar */}
        <div className="px-4 py-4">
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#8b47eb] transition-colors">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search safety products..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border-none rounded-xl shadow-sm focus:ring-2 focus:ring-[#8b47eb]/50 text-sm"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 px-4 overflow-x-auto hide-scrollbar pb-2">
          {STORE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[#8b47eb] text-white shadow-lg shadow-[#8b47eb]/20'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Section Title */}
        <div className="px-4 pt-5 pb-3">
          <h2 className="text-base font-bold">Safety Essentials</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Curated tools for your everyday protection
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col"
            >
              <div className="relative aspect-[4/3] bg-[#8b47eb]/5 flex items-center justify-center p-4">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal"
                />
                <span
                  className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${product.badgeColor}`}
                >
                  {product.badge}
                </span>
              </div>
              <div className="p-2.5 flex flex-col flex-1">
                <h3 className="font-bold text-xs line-clamp-1">{product.name}</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  {product.usage || product.description}
                </p>
                <div className="mt-auto pt-2 space-y-1">
                  <a
                    href={product.blinkitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#8b47eb] text-white py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-[#8b47eb]/90 transition-all"
                  >
                    <span className="material-symbols-outlined text-xs">
                      flash_on
                    </span>
                    Buy on Blinkit
                  </a>
                  <a
                    href={product.amazonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-[9px] text-slate-500 dark:text-slate-400 hover:text-[#8b47eb] hover:underline"
                  >
                    or Buy on Amazon
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
            No products match your search.
          </div>
        )}

        {/* Educational Banner */}
        <div className="mx-4 mt-6 p-3.5 bg-[#8b47eb]/10 rounded-xl border border-[#8b47eb]/20">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[#8b47eb] mt-0.5">
              info
            </span>
            <div>
              <h4 className="font-bold text-xs text-[#8b47eb]">Safety Education</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Always check local laws before carrying pepper spray. Practice
                using your personal alarm to familiarize yourself with the
                sound.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 px-6 py-3 z-40">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          <Link
            href="/user/dashboard"
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#8b47eb] transition-colors"
          >
            <span className="material-symbols-outlined">home</span>
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link
            href="/user/dashcam"
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#8b47eb] transition-colors"
          >
            <span className="material-symbols-outlined">videocam</span>
            <span className="text-[10px] font-medium">Dashcam</span>
          </Link>
          <Link
            href="/user/predict"
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#8b47eb] transition-colors"
          >
            <span className="material-symbols-outlined">insights</span>
            <span className="text-[10px] font-medium">Predict</span>
          </Link>
          <button
            onClick={() => window.open('https://ncwapps.nic.in/onlinecomplaintsv2/', '_blank')}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-[#8b47eb] transition-colors"
          >
            <span className="material-symbols-outlined">gavel</span>
            <span className="text-[10px] font-medium">Complaint</span>
          </button>
          <Link
            href="/user/store"
            className="flex flex-col items-center gap-1 text-[#8b47eb]"
          >
            <div className="bg-[#8b47eb]/10 px-3 py-1 rounded-full flex flex-col items-center">
              <span className="material-symbols-outlined fill-1">storefront</span>
              <span className="text-[10px] font-bold">Store</span>
            </div>
          </Link>
        </div>
      </nav>
    </div>
  );
}
