'use client';

import { Home, ArrowLeft, Monitor, Flame, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check for dark mode preference
    const isDark = document.documentElement.classList.contains('dark') || 
                  localStorage.getItem('darkMode') === 'true' ||
                  window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
  }, []);

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className={`max-w-2xl w-full text-center relative z-10 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
        {/* Error Code */}
        <div className="mb-8">
          <div className={`inline-flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32 rounded-full mb-6 ${darkMode ? 'bg-emerald-500/10 border-2 border-emerald-500/30' : 'bg-emerald-50 border-2 border-emerald-200'}`}>
            <AlertCircle size={48} className={`${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
          </div>
          <h1 className={`text-6xl sm:text-7xl md:text-8xl font-black mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            404
          </h1>
          <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-3 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            Page Not Found
          </h2>
          <p className={`text-base sm:text-lg ${darkMode ? 'text-slate-400' : 'text-slate-600'} max-w-md mx-auto leading-relaxed`}>
            The page you're looking for doesn't exist or has been moved. Let's get you back on track.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12">
          <button
            onClick={() => router.back()}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95 w-full sm:w-auto ${
              darkMode
                ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20 hover:border-white/30'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
          
          <Link
            href="/"
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95 w-full sm:w-auto ${
              darkMode
                ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/60'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/50 hover:shadow-xl hover:shadow-emerald-600/60'
            }`}
          >
            <Home size={18} />
            Go Home
          </Link>
        </div>

        {/* Quick Links */}
        <div className={`rounded-2xl border p-6 sm:p-8 ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-lg'}`}>
          <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Popular Pages
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              href="/"
              className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 hover:scale-105 ${
                darkMode
                  ? 'bg-white/5 hover:bg-white/10 border border-transparent hover:border-emerald-500/30'
                  : 'bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-emerald-200'
              }`}
            >
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                <Monitor size={20} className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} />
              </div>
              <span className={`text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Live Now</span>
            </Link>
            
            <Link
              href="/popular"
              className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 hover:scale-105 ${
                darkMode
                  ? 'bg-white/5 hover:bg-white/10 border border-transparent hover:border-emerald-500/30'
                  : 'bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-emerald-200'
              }`}
            >
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                <Flame size={20} className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} />
              </div>
              <span className={`text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Popular</span>
            </Link>
            
            <Link
              href="/schedule"
              className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 hover:scale-105 ${
                darkMode
                  ? 'bg-white/5 hover:bg-white/10 border border-transparent hover:border-emerald-500/30'
                  : 'bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-emerald-200'
              }`}
            >
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                <Calendar size={20} className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} />
              </div>
              <span className={`text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Schedule</span>
            </Link>
            
            <Link
              href="/predictions"
              className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200 hover:scale-105 ${
                darkMode
                  ? 'bg-white/5 hover:bg-white/10 border border-transparent hover:border-emerald-500/30'
                  : 'bg-slate-50 hover:bg-slate-100 border border-transparent hover:border-emerald-200'
              }`}
            >
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                <TrendingUp size={20} className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} />
              </div>
              <span className={`text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Predictions</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

