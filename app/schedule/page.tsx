'use client';

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import MatchCard from '../components/MatchCard';
import SportSelector from '../components/SportSelector';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useScheduleMatches } from '../hooks/useScheduleMatches';

export default function SchedulePage() {
  const { darkMode } = useDarkMode();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeSport, setActiveSport] = useState(() => {
    const sportParam = searchParams.get('sport');
    return sportParam || 'football';
  });
  const [showRecentResults, setShowRecentResults] = useState(false);
  const [controlsReady, setControlsReady] = useState(false);
  const sportControlsRef = useRef<{
    scrollSports: (direction: 'left' | 'right') => void;
    canScrollLeft: boolean;
    canScrollRight: boolean;
  } | null>(null);

  // Use SWR hook to fetch matches
  const { matches, isLoading: loading, error: swrError } = useScheduleMatches(activeSport);
  
  const error = swrError ? 'Failed to load matches. Please try again later.' : null;

  // Update active sport from URL parameter only on initial load or external URL changes
  useEffect(() => {
    const sportParam = searchParams.get('sport');
    const expectedSport = sportParam || 'football';
    
    // Only update if URL param differs from current state (external change)
    if (expectedSport !== activeSport) {
      setActiveSport(expectedSport);
    }
  }, [searchParams]); // Only depend on searchParams, not activeSport

  // Update URL when sport is manually changed
  const handleSportChange = (sport: string) => {
    setActiveSport(sport);
    const params = new URLSearchParams(searchParams.toString());
    if (sport === 'football') {
      params.delete('sport');
    } else {
      params.set('sport', sport);
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newUrl);
  };

  useEffect(() => {
    // Check if controls are ready after component mounts
    const checkControls = () => {
      if (sportControlsRef.current) {
        setControlsReady(true);
      }
    };
    // Check immediately and periodically until ready
    checkControls();
    const interval = setInterval(() => {
      if (sportControlsRef.current) {
        setControlsReady(true);
        clearInterval(interval);
      }
    }, 50);
    // Also check after a delay to catch late updates
    const timeout = setTimeout(() => {
      checkControls();
      clearInterval(interval);
    }, 500);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);


  // Helper function to check if a match is today
  const isToday = (matchDate?: number): boolean => {
    if (!matchDate) return false;
    const match = new Date(matchDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const matchDay = new Date(match);
    matchDay.setHours(0, 0, 0, 0);
    return matchDay.getTime() === today.getTime();
  };

  // Helper function to check if a match is tomorrow
  const isTomorrow = (matchDate?: number): boolean => {
    if (!matchDate) return false;
    const match = new Date(matchDate);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const matchDay = new Date(match);
    matchDay.setHours(0, 0, 0, 0);
    return matchDay.getTime() === tomorrow.getTime();
  };

  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      // Case-insensitive sport matching
      if (m.sport.toLowerCase() !== activeSport.toLowerCase()) return false;
      // Only show upcoming matches
      if (m.status !== 'upcoming') return false;
      return true;
    });
  }, [matches, activeSport]);

  const recentResults = useMemo(() => {
    return matches
      .filter(m => {
        // Case-insensitive sport matching
        if (m.sport.toLowerCase() !== activeSport.toLowerCase()) return false;
        // Only ended matches
        if (m.status !== 'ended') return false;
        // Only today's ended matches
        if (!isToday(m.date)) return false;
        return true;
      })
      .slice(0, 10)
      .map(match => ({ ...match, score: undefined })); // Remove scores
  }, [matches, activeSport]);

  const todayMatches = useMemo(() => {
    return filteredMatches
      .filter(m => isToday(m.date))
      .sort((a, b) => {
        // Sort by time (earlier matches first)
        if (!a.date || !b.date) return 0;
        return a.date - b.date;
      });
  }, [filteredMatches]);

  const tomorrowMatches = useMemo(() => {
    return filteredMatches
      .filter(m => isTomorrow(m.date))
      .sort((a, b) => {
        // Sort by time (earlier matches first)
        if (!a.date || !b.date) return 0;
        return a.date - b.date;
      });
  }, [filteredMatches]);

  if (loading && matches.length === 0) {
    return (
      <div className="p-2 sm:p-4 md:p-8 max-w-[2400px] mx-auto">
        <LoadingSpinner darkMode={darkMode} />
      </div>
    );
  }

  if (error && matches.length === 0) {
    return (
      <div className="p-2 sm:p-4 md:p-8 max-w-[2400px] mx-auto flex items-center justify-center min-h-[400px]">
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
    <div className="p-2 sm:p-4 md:p-8 max-w-[2400px] mx-auto">
      <div className="mb-4 sm:mb-6">
        <div className="mb-3 sm:mb-4 flex items-center justify-between">
          <div>
            <h1 className={`text-lg sm:text-xl md:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Schedule
            </h1>
            <p className={`text-xs sm:text-sm mt-1 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Browse upcoming matches and plan your viewing schedule.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:hidden">
          <button
            aria-label="Scroll sports left"
            type="button"
            onClick={() => sportControlsRef.current?.scrollSports('left')}
            disabled={!controlsReady || !sportControlsRef.current?.canScrollLeft}
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
            disabled={!controlsReady || !sportControlsRef.current?.canScrollRight}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
              darkMode
                ? 'border-white/15 bg-white/5 text-white hover:bg-white/10 active:bg-white/20 hover:border-white/25'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <ChevronRight size={16} />
          </button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <SportSelector 
          activeSport={activeSport} 
          onSportChange={handleSportChange} 
          darkMode={darkMode}
          hideMobileControls={true}
          controlsRef={sportControlsRef}
        />
      </div>

      <div className="space-y-6">
        {/* Today Section - Priority */}
        {todayMatches.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <h3 className={`text-xs sm:text-sm md:text-base font-semibold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Today
              </h3>
              <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-semibold ${
                darkMode 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}>
                {todayMatches.length}
              </span>
              <div className={`flex-1 h-px ${darkMode ? 'bg-white/15' : 'bg-slate-200'}`} />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6">
              {todayMatches.map(match => (
                <MatchCard key={match.id} match={match} compact darkMode={darkMode} />
              ))}
            </div>
          </div>
        ) : !loading && (
          <div className={`text-center py-8 rounded-xl border ${darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              No matches scheduled for today
            </p>
          </div>
        )}

        {/* Recent Results - Today's ended matches, shown after Today's upcoming */}
        {recentResults.length > 0 && (
          <div>
            <button
              onClick={() => setShowRecentResults(!showRecentResults)}
              className={`w-full flex items-center justify-between mb-2 sm:mb-3 transition-colors ${
                darkMode 
                  ? 'hover:bg-white/5' 
                  : 'hover:bg-slate-50'
              } rounded-lg p-2 -m-2 border-b ${darkMode ? 'border-white/10' : 'border-slate-200'} pb-1.5 sm:pb-2`}
            >
              <div className="flex items-center gap-2">
                <h3 className={`text-xs sm:text-sm md:text-base font-semibold tracking-tight ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Today's Results
                </h3>
                <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-semibold ${
                  darkMode 
                    ? 'bg-slate-700/50 text-slate-300 border border-slate-600/50' 
                    : 'bg-slate-200 text-slate-600 border border-slate-300'
                }`}>
                  {recentResults.length}
                </span>
              </div>
              {showRecentResults ? (
                <ChevronUp size={18} className={darkMode ? 'text-slate-300' : 'text-slate-600'} />
              ) : (
                <ChevronDown size={18} className={darkMode ? 'text-slate-300' : 'text-slate-600'} />
              )}
            </button>
            {showRecentResults && (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6 animate-in fade-in duration-200">
                {recentResults.map(match => (
                  <MatchCard key={match.id} match={match} compact darkMode={darkMode} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tomorrow Section - Less priority */}
        {tomorrowMatches.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <h3 className={`text-xs sm:text-sm md:text-base font-semibold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Tomorrow
              </h3>
              <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-semibold ${
                darkMode 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}>
                {tomorrowMatches.length}
              </span>
              <div className={`flex-1 h-px ${darkMode ? 'bg-white/15' : 'bg-slate-200'}`} />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6">
              {tomorrowMatches.map(match => (
                <MatchCard key={match.id} match={match} compact darkMode={darkMode} />
              ))}
            </div>
          </div>
        ) : !loading && (
          <div className={`text-center py-8 rounded-xl border ${darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              No matches scheduled for tomorrow
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

