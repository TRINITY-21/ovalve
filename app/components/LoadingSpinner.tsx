'use client';

import { Zap } from 'lucide-react';

interface LoadingSpinnerProps {
  darkMode?: boolean;
}

export default function LoadingSpinner({ darkMode = false, compact = false }: LoadingSpinnerProps & { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className={`w-12 h-12 rounded-full border-2 animate-spin ${darkMode ? 'border-white/5 border-t-emerald-500' : 'border-slate-100 border-t-emerald-600'}`}></div>
          <div className={`absolute w-8 h-8 rounded-full border-2 border-transparent ${darkMode ? 'border-b-emerald-400/50' : 'border-b-emerald-600/30'} animate-spin-reverse`}></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap size={14} className={`${darkMode ? 'text-emerald-500' : 'text-emerald-600'} fill-current animate-pulse`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
      <div className="relative flex items-center justify-center">
        <div className={`w-16 h-16 rounded-full border-2 animate-spin ${darkMode ? 'border-white/5 border-t-emerald-500' : 'border-slate-100 border-t-emerald-600'}`}></div>
        <div className={`absolute w-10 h-10 rounded-full border-2 border-transparent ${darkMode ? 'border-b-emerald-400/50' : 'border-b-emerald-600/30'} animate-spin-reverse`}></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Zap size={18} className={`${darkMode ? 'text-emerald-500' : 'text-emerald-600'} fill-current animate-pulse`} />
        </div>
      </div>
      <p className={`mt-6 text-[10px] font-bold tracking-[0.25em] uppercase ${darkMode ? 'text-white' : 'text-slate-600'} animate-pulse`}>
        Loading...
      </p>
    </div>
  );
}

