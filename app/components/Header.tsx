'use client';

import { Search, Menu, MessageCircle } from 'lucide-react';
import { useDarkMode } from '../contexts/DarkModeContext';

interface HeaderProps {
  darkMode: boolean;
  searchQuery: string;
  onMobileMenuToggle: () => void;
  onSearchClick: () => void;
  onFeedbackClick: () => void;
}

export default function Header({ 
  darkMode, 
  searchQuery, 
  onMobileMenuToggle,
  onSearchClick,
  onFeedbackClick
}: HeaderProps) {
  useDarkMode();

  return (
    <header className={`flex items-center justify-between p-4 md:px-8 border-b backdrop-blur-xl z-30 shadow-sm ${darkMode ? 'bg-slate-900/90 border-white/10 shadow-black/20' : 'bg-white/95 border-slate-200 shadow-slate-200/50'}`}>
      <div className="flex items-center gap-3 flex-1 max-w-full min-w-0">
        <button 
          onClick={onMobileMenuToggle} 
          className={`md:hidden p-2 rounded-lg transition-colors ${
            darkMode
              ? 'text-slate-300 hover:bg-white/10 hover:text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Menu size={24} />
        </button>

        <button
          type="button"
          onClick={onFeedbackClick}
          className={`md:hidden p-2 rounded-2xl border flex items-center justify-center ${
            darkMode
              ? 'border-white/10 text-white/80 hover:bg-white/10'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
          aria-label="Send feedback"
        >
          <MessageCircle size={18} />
        </button>

        <button
          type="button"
          onClick={onSearchClick}
          className={`md:hidden flex-1 flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all text-left shadow-sm ${
            darkMode
              ? 'bg-slate-900/90 border-white/10 text-slate-200 hover:border-emerald-500/60 hover:bg-emerald-500/5 hover:shadow-emerald-500/10'
              : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-slate-50 hover:shadow-md'
          }`}
        >
          <Search size={16} className={darkMode ? 'text-slate-300' : 'text-slate-600'} />
          <span className={`text-sm truncate ${darkMode ? 'text-slate-200 placeholder:text-slate-400' : 'text-slate-700 placeholder:text-slate-400'}`}>
            {searchQuery ? searchQuery : 'Search matches'}
          </span>
        </button>
        
        <button
          type="button"
          onClick={onSearchClick}
          className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all flex-1 max-w-md text-left shadow-sm ${
            darkMode
              ? 'bg-slate-950/90 border-white/10 text-slate-200 hover:border-emerald-500/60 hover:bg-emerald-500/5 hover:shadow-emerald-500/10'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-white hover:shadow-md'
          }`}
        >
          <Search size={16} className={darkMode ? 'text-slate-300' : 'text-slate-600'} />
          <span className={`text-sm truncate ${darkMode ? 'text-slate-200 placeholder:text-slate-400' : 'text-slate-700 placeholder:text-slate-400'}`}>
            {searchQuery ? `Search: ${searchQuery}` : 'Search teams, leagues, or matches'}
          </span>
        </button>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <button
          type="button"
          onClick={onFeedbackClick}
          className={`hidden sm:flex items-center justify-center gap-2 px-2 sm:px-3 py-2 rounded-2xl border text-xs sm:text-sm font-semibold transition-all shadow-sm ${
            darkMode
              ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white hover:shadow-md'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:shadow-md'
          }`}
        >
          <MessageCircle size={14} className="sm:w-4 sm:h-4" />
          <span className="hidden lg:inline">Feedback</span>
        </button>
        
      </div>
    </header>
  );
}

