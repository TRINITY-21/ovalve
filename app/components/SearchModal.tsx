'use client';

import { Clock, Radio, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';

import type { Match } from '@/app/utils/matchTransform';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  matches: Match[];
}

const statusStyles: Record<
  Match['status'],
  { bg: string; text: string; label: string }
> = {
  live: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    label: 'Live'
  },
  upcoming: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    label: 'Upcoming'
  },
  ended: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-400',
    label: 'Final'
  }
};

export default function SearchModal({
  isOpen,
  onClose,
  darkMode,
  query,
  onQueryChange,
  matches
}: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;

    const timeout = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [isOpen, onClose]);

  const filteredMatches = useMemo(() => {
    if (!query.trim()) {
      return matches; // Show all matches when no query
    }

    const lowerQuery = query.toLowerCase();

    return matches.filter((match) => {
      const searchable = [
        match.home,
        match.away,
        match.league,
        match.sport
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(lowerQuery);
    });
  }, [matches, query]);

  const handleMatchClick = (matchId: string) => {
    router.push(`/watch/${matchId}`);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end md:items-start justify-center px-0 md:px-6 pb-0 md:pb-10 pt-0 md:pt-10">
      <div
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
        onClick={onClose}
      />

      <div
        className={`relative w-full max-w-none md:max-w-3xl overflow-hidden rounded-t-[32px] md:rounded-[32px] md:rounded-b-[32px] border shadow-[0_-10px_60px_rgba(15,23,42,0.5)] md:shadow-2xl bottom-sheet flex flex-col h-[75vh] md:h-auto md:max-h-[85vh] ${
          darkMode
            ? 'bg-slate-950 border-white/15 shadow-black/40'
            : 'bg-white border-slate-200 shadow-slate-300/50'
        }`}
      >
        <div className="flex justify-center pt-4 pb-2 md:hidden">
          <span className={`h-1.5 w-12 rounded-full ${darkMode ? 'bg-slate-500/50' : 'bg-slate-300/60'}`} />
        </div>

        <div
          className={`flex items-center justify-between border-b px-4 py-3 md:px-6 md:py-5 shrink-0 ${
            darkMode ? 'border-white/5' : 'border-slate-100'
          }`}
        >
          <div className="flex-1 min-w-0">
            <p
              className={`text-xs md:text-sm font-semibold tracking-wide uppercase ${
                darkMode ? 'text-emerald-400' : 'text-emerald-600'
              }`}
            >
              Search
            </p>
            <p
              className={`text-sm md:text-xl font-bold truncate ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              Find a match by team, league, or sport
            </p>
          </div>

          <button
            type="button"
            aria-label="Close search"
            onClick={onClose}
            className={`rounded-full p-2 transition-all hover:scale-110 ${
              darkMode
                ? 'text-slate-300 hover:text-white hover:bg-white/10'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-2 md:px-6 py-4 md:py-6 shrink-0">
          <div
            className={`flex items-center gap-2 md:gap-3 rounded-xl md:rounded-2xl border px-3 md:px-4 py-2.5 md:py-3 shadow-md focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/30 ${
              darkMode
                ? 'bg-slate-900/80 border-white/15 text-white'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <Search size={16} className={`md:w-[18px] md:h-[18px] shrink-0 ${darkMode ? 'text-slate-300' : 'text-slate-500'}`} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Type a team, league, or match title"
              className={`w-full bg-transparent text-sm md:text-base outline-none ${
                darkMode ? 'text-white placeholder:text-slate-400' : 'text-slate-900 placeholder:text-slate-500'
              }`}
            />
          </div>
        </div>

        <div className="px-2 pb-4 md:pb-6 md:px-6 flex-1 w-full min-h-0 overflow-hidden">
          <div className="h-full min-h-0 space-y-2 md:space-y-3 overflow-y-auto pr-2 sm:pr-4 custom-scrollbar pb-safe">
            {filteredMatches.length === 0 ? (
              <div className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                <Radio size={32} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
                <p className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  No matches found
                </p>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Try searching for another team, league, or sport.
                </p>
              </div>
            ) : (
              filteredMatches.map((match) => {
                const status = statusStyles[match.status];

                return (
                  <button
                    key={match.id}
                    type="button"
                    className={`flex w-full items-center gap-2 md:gap-4 rounded-xl md:rounded-2xl border px-3 py-2.5 md:px-4 md:py-4 text-left transition-all duration-200 shadow-sm hover:shadow-md ${
                      darkMode
                        ? 'border-white/10 bg-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/10'
                        : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/60'
                    }`}
                    onClick={() => handleMatchClick(match.id)}
                  >
                    <div className="h-10 w-10 md:h-14 md:w-14 shrink-0 rounded-xl md:rounded-2xl bg-gradient-to-br from-slate-700 via-slate-500 to-slate-800 p-0.5 md:p-1">
                      <div className="flex h-full w-full items-center justify-center rounded-lg md:rounded-xl bg-white/10">
                        <img
                          src={match.homeLogo || '/no-image.png'}
                          alt={`${match.home} logo`}
                          className={`h-7 w-7 md:h-10 md:w-10 rounded-lg md:rounded-xl ${match.homeLogo ? 'object-contain' : 'object-cover scale-150'}`}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/no-image.png';
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs md:text-base font-semibold leading-tight truncate ${
                          darkMode ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {match.home} <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>vs</span> {match.away}
                      </p>
                      <p className={`text-[10px] md:text-sm truncate ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {match.league} • {match.sport.charAt(0).toUpperCase() + match.sport.slice(1)}
                      </p>
                      <div className="mt-1.5 md:mt-2 flex flex-wrap items-center gap-2 md:gap-3">
                        <span
                          className={`rounded-full px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs font-semibold uppercase tracking-wide ${status.bg} ${status.text}`}
                        >
                          {status.label}
                        </span>
                        {match.time && (
                          <span
                            className={`flex items-center gap-1 rounded-full px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs font-semibold ${
                              darkMode
                                ? 'bg-white/10 text-slate-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <Clock size={10} className={`md:w-[14px] md:h-[14px] ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} />
                            {match.time}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

