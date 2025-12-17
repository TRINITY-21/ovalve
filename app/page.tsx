'use client';

import { ArrowRight, ChevronLeft, ChevronRight, Play, Users } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import LiveMatchesCarousel from './components/LiveMatchesCarousel';
import LoadingSpinner from './components/LoadingSpinner';
import MatchCard from './components/MatchCard';
import SportSelector from './components/SportSelector';
import { useDarkMode } from './contexts/DarkModeContext';
import { CATEGORIES_BY_SPORT } from './data/constants';
import { useMatches } from './hooks/useMatches';
import type { Match } from './utils/matchTransform';

export default function DashboardPage() {
  const { darkMode } = useDarkMode();
  const router = useRouter();
  const [activeSport, setActiveSport] = useState('football');
  const [activeCategory, setActiveCategory] = useState('All');
  const [countdown, setCountdown] = useState<string>('');
  const [clientFeaturedMatch, setClientFeaturedMatch] = useState<{
    match: Match;
    startTime: Date;
  } | null>(null);
  const sportControlsRef = useRef<{
    scrollSports: (direction: 'left' | 'right') => void;
    canScrollLeft: boolean;
    canScrollRight: boolean;
  } | null>(null);

  // Use SWR hook to fetch matches
  const { matches, isLoading: loading, error: swrError, liveMatches, isValidatingLiveMatches } = useMatches(activeSport);
  
  const error = swrError ? 'Failed to load matches. Please try again later.' : null;

  useEffect(() => {
    setActiveCategory('All');
  }, [activeSport]);

  const parseMatchTime = (time: string, matchDate?: number) => {
    if (!time) return null;
    
    // If we have the original match date (Unix timestamp), use it directly
    if (matchDate) {
      return new Date(matchDate);
    }
    
    const now = new Date();
    const numericMatch = time.match(/^(\d{1,2}):(\d{2})$/);

    if (numericMatch) {
      const [_, hoursStr, minutesStr] = numericMatch;
      const date = new Date();
      date.setHours(parseInt(hoursStr, 10), parseInt(minutesStr, 10), 0, 0);
      if (date <= now) {
        date.setDate(date.getDate() + 1);
      }
      return date;
    }

    if (time.toLowerCase() === 'tomorrow') {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      date.setHours(18, 0, 0, 0);
      return date;
    }

    return null;
  };

  // Memoize the featured match selection to prevent infinite loops
  const featuredMatch = useMemo<{ match: Match; startTime: Date } | null>(() => {
    let selected: (typeof matches)[number] | null = null;
    let selectedDate: Date | null = null;

    matches.forEach((match) => {
      if (match.status !== 'upcoming') return;
      const startDate = parseMatchTime(match.time, match.date);
      if (!startDate) return;
      if (!selectedDate || startDate < selectedDate) {
        selected = match;
        selectedDate = startDate;
      }
    });

    if (selected && selectedDate) {
      return { match: selected, startTime: selectedDate };
    }
    return null;
  }, [matches]);

  // Only update state if the featured match actually changed
  useEffect(() => {
    // Only update if the match ID or startTime has actually changed
    const currentFeatured = featuredMatch;
    if (!currentFeatured) {
      setClientFeaturedMatch(null);
      return;
    }
    
    setClientFeaturedMatch(prev => {
      if (!prev) {
        return currentFeatured;
      }
      
      const prevMatchId = prev.match.id;
      const prevStartTime = prev.startTime.getTime();
      const currentMatchId = currentFeatured.match.id;
      const currentStartTime = currentFeatured.startTime.getTime();
      
      if (prevMatchId !== currentMatchId || prevStartTime !== currentStartTime) {
        return currentFeatured;
      }
      
      return prev; // Keep previous value if nothing actually changed
    });
  }, [featuredMatch]);

  useEffect(() => {
    if (!clientFeaturedMatch?.startTime) {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const diff = clientFeaturedMatch.startTime.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('00:00:00');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const pad = (value: number) => value.toString().padStart(2, '0');
      setCountdown(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [clientFeaturedMatch]);

  const filteredMatches = useMemo(() => {
    const filtered = matches.filter(match => {
      // Case-insensitive sport matching
      if (match.sport.toLowerCase() !== activeSport.toLowerCase()) return false;
      // Only show upcoming matches in the main grid (exclude live and ended)
      if (match.status !== 'upcoming') return false;
      // Filter by league if category is selected (but category filters are removed, so this is just for league filtering)
      if (activeCategory !== 'All' && match.league !== activeCategory) return false;
      return true;
    });
    
    // Debug logging
    if (filtered.length === 0 && matches.length > 0) {
      const matchesForSport = matches.filter(m => m.sport.toLowerCase() === activeSport.toLowerCase());
      console.log(`No upcoming matches found for ${activeSport}. Total matches for sport: ${matchesForSport.length}`);
      console.log(`Match statuses for ${activeSport}:`, matchesForSport.map(m => ({ id: m.id, status: m.status, home: m.home, away: m.away })));
    }
    
    return filtered;
  }, [matches, activeSport, activeCategory]);

  const categories = CATEGORIES_BY_SPORT[activeSport as keyof typeof CATEGORIES_BY_SPORT] || CATEGORIES_BY_SPORT['football'];

  if (loading && matches.length === 0) {
    return (
      <div className="max-w-[2400px] mx-auto p-2 sm:p-4 md:p-8">
        <LoadingSpinner darkMode={darkMode} />
      </div>
    );
  }

  if (error && matches.length === 0) {
    return (
      <div className="max-w-[2400px] mx-auto p-2 sm:p-4 md:p-8 flex items-center justify-center min-h-[400px]">
        <div className={`text-center ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          <p className="text-sm font-medium mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              darkMode
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[2400px] mx-auto p-2 sm:p-4 md:p-8">
      {clientFeaturedMatch && (
        <div
          onClick={() => router.push(`/watch/${clientFeaturedMatch.match.id}`)}
          className={`group relative mt-0.5 mb-3 sm:mb-6 rounded-xl sm:rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl shadow-lg ${
            darkMode
              ? 'border border-emerald-500/30 hover:border-emerald-500/50 bg-slate-900/50'
              : 'border border-emerald-300/40 hover:border-emerald-400/60 bg-white'
          }`}
        >
          {/* Video thumbnail background */}
          {clientFeaturedMatch.match.thumbnail && (
            <div className="absolute inset-0">
              <Image
                src={clientFeaturedMatch.match.thumbnail}
                alt={`${clientFeaturedMatch.match.home} vs ${clientFeaturedMatch.match.away}`}
                fill
                loading="eager"
                className="object-cover opacity-15 group-hover:opacity-20 transition-opacity duration-500"
                sizes="100vw"
              />
              <div className={`absolute inset-0 ${
                darkMode 
                  ? 'bg-gradient-to-br from-emerald-950/85 via-slate-900/90 to-emerald-950/85' 
                  : 'bg-gradient-to-br from-emerald-50/95 via-white/98 to-emerald-100/95'
              }`} />
            </div>
          )}

          {/* Viewer count for live matches */}
          {clientFeaturedMatch.match.status === 'live' && clientFeaturedMatch.match.viewers && (
            <div className={`absolute top-2 left-2 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-md backdrop-blur-md border shadow-sm ${
              darkMode
                ? 'bg-red-600/90 border-red-400/50 text-white'
                : 'bg-red-500/95 border-red-400/70 text-white shadow-md'
            }`}>
              <Users size={10} />
              <span className="text-[10px] font-bold">{clientFeaturedMatch.match.viewers}</span>
            </div>
          )}

          <div className="relative z-10 p-3 sm:p-5 md:p-8">
            {/* Mobile: Compact horizontal layout */}
            <div className="flex sm:hidden items-center gap-3">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="relative h-10 w-8">
                  <Image
                    src={clientFeaturedMatch.match.homeLogo || '/no-image.png'}
                    alt={clientFeaturedMatch.match.home}
                    fill
                    className={clientFeaturedMatch.match.homeLogo ? 'object-contain' : 'object-cover scale-150'}
                    sizes="32px"
                  />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider ${darkMode ? 'text-white/70' : 'text-slate-600'}`}>
                  VS
                </span>
                <div className="relative h-10 w-8">
                  <Image
                    src={clientFeaturedMatch.match.awayLogo || '/no-image.png'}
                    alt={clientFeaturedMatch.match.away}
                    fill
                    className={clientFeaturedMatch.match.awayLogo ? 'object-contain' : 'object-cover scale-150'}
                    sizes="32px"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shadow-sm ${
                    darkMode 
                      ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/30' 
                      : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}>
                    ⚡ Big Match
                  </p>
                </div>
                <h3 className={`text-xs font-bold leading-tight break-words ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  <span className="block">{clientFeaturedMatch.match.home}</span>
                  <span className={`${darkMode ? 'text-emerald-400' : 'text-emerald-600'} text-[10px]`}>vs</span>{' '}
                  <span className="block">{clientFeaturedMatch.match.away}</span>
                </h3>
                <p className={`text-[10px] font-medium truncate ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {clientFeaturedMatch.match.sport.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                </p>
              </div>
              {clientFeaturedMatch.match.status === 'upcoming' ? (
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className={`px-2 py-1 rounded-lg border text-center font-mono text-[11px] tracking-wider shadow-sm ${
                    darkMode
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-md'
                  }`}>
                    {countdown || '––:––:––'}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/watch/${clientFeaturedMatch.match.id}`);
                    }}
                    className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all shadow-md hover:shadow-lg ${
                      darkMode
                        ? 'bg-red-500 hover:bg-red-400 text-white'
                        : 'bg-red-600 hover:bg-red-500 text-white'
                    }`}
                  >
                    <Play size={12} fill="currentColor" />
                    Watch
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/watch/${clientFeaturedMatch.match.id}`);
                  }}
                  className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex-shrink-0 shadow-md hover:shadow-lg ${
                    darkMode
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <Play size={12} fill="currentColor" />
                  Live
                </button>
              )}
            </div>

            {/* Desktop: Full layout */}
            <div className="hidden sm:flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
              <div className="flex flex-row items-center gap-4 text-left flex-1">
                <div className={`relative flex items-center justify-center gap-3 rounded-2xl backdrop-blur-md px-4 py-3 border shadow-lg ${
                  darkMode 
                    ? 'bg-gradient-to-br from-white/20 to-white/10 border-white/25' 
                    : 'bg-gradient-to-br from-white/90 to-white/70 border-slate-200'
                }`}>
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${
                    darkMode ? 'from-emerald-400/10 to-transparent' : 'from-emerald-300/15 to-transparent'
                  }`} />
                  <div className="relative z-10 h-12 w-10 md:h-14 md:w-12">
                    <Image
                      src={clientFeaturedMatch.match.homeLogo || '/no-image.png'}
                      alt={clientFeaturedMatch.match.home}
                      fill
                      className={`${clientFeaturedMatch.match.homeLogo ? 'object-contain' : 'object-cover scale-150'} transition-transform duration-300 group-hover:scale-110`}
                      sizes="(max-width: 768px) 40px, 48px"
                    />
                  </div>
                  <span
                    className={`relative z-10 font-black uppercase text-xs tracking-[0.5em] ${
                      darkMode ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    VS
                  </span>
                  <div className="relative z-10 h-12 w-10 md:h-14 md:w-12">
                    <Image
                      src={clientFeaturedMatch.match.awayLogo || '/no-image.png'}
                      alt={clientFeaturedMatch.match.away}
                      fill
                      className={`${clientFeaturedMatch.match.awayLogo ? 'object-contain' : 'object-cover scale-150'} transition-transform duration-300 group-hover:scale-110`}
                      sizes="(max-width: 768px) 40px, 48px"
                    />
                  </div>
                </div>
                <div className="relative z-10">
                  <p
                    className={`inline-block text-xs font-black uppercase tracking-[0.5em] px-2 py-0.5 rounded-full mb-1.5 shadow-sm ${
                      darkMode 
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/50' 
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-300 shadow-md'
                    }`}
                  >
                    ⚡ Big Match
                  </p>
                  <h3
                    className={`text-lg md:text-xl font-black leading-tight mb-1 ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {clientFeaturedMatch.match.home}{' '}
                    <span className={`${darkMode ? 'text-emerald-300' : 'text-emerald-600'} font-bold`}>vs</span>{' '}
                    {clientFeaturedMatch.match.away}
                  </h3>
                  <p className={`text-xs md:text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {clientFeaturedMatch.match.sport.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                  </p>
                </div>
              </div>

              <div className="relative z-10 flex flex-col lg:flex-col items-center gap-3">
                {clientFeaturedMatch.match.status === 'upcoming' ? (
                  <>
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`relative rounded-2xl px-3 py-2 md:px-4 md:py-3 border-2 text-center font-mono text-sm md:text-lg tracking-widest overflow-hidden ${
                          darkMode
                            ? 'bg-gradient-to-br from-emerald-950/70 to-slate-900/90 text-emerald-300 border-emerald-500/50'
                            : 'bg-gradient-to-br from-emerald-50 to-white text-emerald-700 border-emerald-300/70'
                        }`}
                      >
                        <div className={`absolute inset-0 animate-pulse opacity-15 ${
                          darkMode ? 'bg-emerald-400' : 'bg-emerald-300'
                        }`} />
                        <span className="relative z-10">{countdown || '––:––:––'}</span>
                      </div>
                      <p className={`text-[9px] md:text-[11px] uppercase tracking-[0.4em] font-bold text-center ${
                        darkMode ? 'text-emerald-400/80' : 'text-emerald-600/80'
                      }`}>
                        Kickoff Countdown
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/watch/${clientFeaturedMatch.match.id}`);
                      }}
                      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-base transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl ${
                        darkMode
                          ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/50'
                          : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/50'
                      }`}
                    >
                      <Play size={18} fill="currentColor" />
                      Watch Now
                    </button>
                  </>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/watch/${clientFeaturedMatch.match.id}`);
                    }}
                      className={`flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl ${
                        darkMode
                          ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/50'
                          : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/50'
                      }`}
                  >
                    <Play size={20} fill="currentColor" />
                    Watch Live
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <LiveMatchesCarousel matches={liveMatches} darkMode={darkMode} isLoading={isValidatingLiveMatches} />

      {/* Quick Actions: Upcoming */}
      {(() => {
        const upcomingMatches = matches
          .filter(m => m.sport === activeSport && m.status === 'upcoming')
          .slice(0, 12);
        
        if (upcomingMatches.length > 0) {
          return (
            <div className="mb-6 sm:mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className={`text-lg sm:text-xl md:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Upcoming
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push('/schedule')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      darkMode
                        ? 'text-emerald-400 hover:text-emerald-300'
                        : 'text-emerald-600 hover:text-emerald-700'
                    }`}
                  >
                    <span className="hidden sm:inline">View Schedule</span>
                    <span className="sm:hidden">Schedule</span>
                    <ArrowRight size={14} />
                  </button>
                {sportControlsRef.current && (
                  <div className="flex items-center gap-2 sm:hidden">
                    <button
                      aria-label="Scroll sports left"
                      type="button"
                      onClick={() => sportControlsRef.current?.scrollSports('left')}
                      disabled={!sportControlsRef.current?.canScrollLeft}
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
                        darkMode
                        ? 'border-white/15 bg-white/5 text-white hover:bg-white/10 active:bg-white/20 hover:border-white/25'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      aria-label="Scroll sports right"
                      type="button"
                      onClick={() => sportControlsRef.current?.scrollSports('right')}
                      disabled={!sportControlsRef.current?.canScrollRight}
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
                        darkMode
                        ? 'border-white/15 bg-white/5 text-white hover:bg-white/10 active:bg-white/20 hover:border-white/25'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
                </div>
              </div>
              <SportSelector 
                activeSport={activeSport} 
                onSportChange={setActiveSport} 
                darkMode={darkMode}
                hideMobileControls={true}
                controlsRef={sportControlsRef}
              />
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6 mt-4">
                {upcomingMatches.map(match => (
                  <MatchCard key={match.id} match={match} darkMode={darkMode} />
                ))}
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Empty State - Show when no matches at all */}
      {/* Only show if not loading, no error, no matches, and validation is not in progress */}
      {!loading && !error && matches.length === 0 && !isValidatingLiveMatches && (
        <div className={`flex flex-col items-center justify-center py-16 px-4 rounded-3xl border-2 border-dashed shadow-sm ${
          darkMode 
            ? 'bg-slate-900/40 border-slate-700/60' 
            : 'bg-slate-50 border-slate-200 shadow-md'
        }`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            darkMode 
              ? 'bg-slate-800/50' 
              : 'bg-slate-100'
          }`}>
            <Play size={32} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
          </div>
          <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            No Matches Found
          </h3>
          <p className={`text-sm text-center max-w-md mb-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            We couldn't find any matches at the moment. This could be due to:
          </p>
          <ul className={`text-sm text-center max-w-md mb-4 space-y-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <li>• API connection issues</li>
            <li>• No matches scheduled right now</li>
            <li>• Server maintenance</li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              darkMode
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            Refresh Page
          </button>
        </div>
      )}
    </div>
  );
}