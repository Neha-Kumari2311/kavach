'use client';

import { useState } from 'react';
import { STORE_PRODUCTS, STORE_CATEGORIES } from '@/lib/store-products';

export default function SafetyStorePage() {
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
    <div className="px-4 max-w-2xl mx-auto w-full space-y-4 pt-4 pb-4">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-extrabold">Safety Store</h1>
          <p className="text-xs text-slate-500 mt-1">Curated safety essentials. Tap to buy directly from Blinkit or Amazon.</p>
        </div>

        {/* Search Bar */}
        <div className="py-2">
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#6C47FF] transition-colors text-xl">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search safety essentials..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#6C47FF]/50 focus:border-[#6C47FF] outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {STORE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[#6C47FF] text-white shadow-lg shadow-[#6C47FF]/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {filteredProducts.map((product) => (
            <a
              key={product.id}
              href={product.buyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col group hover:border-[#6C47FF]/40 hover:shadow-md transition-all"
            >
              {/* Image */}
              <div className="aspect-square bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center overflow-hidden">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              </div>
              
              {/* Info */}
              <div className="p-3 flex flex-col flex-1">
                <h3 className="font-bold text-xs line-clamp-2 leading-tight">{product.name}</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {product.description}
                </p>
                
                {/* Buy Now */}
                <div className="mt-auto pt-2">
                  <span className="w-full bg-[#6C47FF] text-white py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 group-hover:bg-[#5a3bdb] transition-all">
                    <span className="material-symbols-outlined text-sm">shopping_bag</span>
                    Buy Now
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-12 text-center">
            <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">search_off</span>
            <p className="text-sm text-slate-500">No products match your search.</p>
          </div>
        )}

        {/* Info Banner */}
        <section className="mt-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6C47FF]/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[#6C47FF]">verified</span>
            </div>
            <div>
              <h3 className="font-bold text-sm">Verified Safety Products</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                All products are hand-picked for quality. Tapping &quot;Buy Now&quot; takes you directly to Blinkit or Amazon to complete your purchase.
              </p>
            </div>
          </div>
        </section>
    </div>
  );
}
