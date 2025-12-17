'use client';

import { ChevronLeft, ChevronRight, Flame, Radio } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import MatchCard from '../components/MatchCard';
import SportSelector from '../components/SportSelector';
import { useDarkMode } from '../contexts/DarkModeContext';
import { usePopularMatches } from '../hooks/usePopularMatches';
import type { Match } from '../utils/matchTransform';

type StatusFilter = 'live' | 'all';

function PopularPageContent() {
  const { darkMode } = useDarkMode();
  const searchParams = useSearchParams();
  const [activeSport, setActiveSport] = useState(() => {
    const sportParam = searchParams.get('sport');
    return sportParam || 'football';
  });
  const [activeStatus, setActiveStatus] = useState<StatusFilter>(() => {
    const statusParam = searchParams.get('status');
    if (statusParam === 'live') {
      return 'live';
    }
    return 'all';
  });
  const [controlsReady, setControlsReady] = useState(false);
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: true });
  const sportControlsRef = useRef<{
    scrollSports: (direction: 'left' | 'right') => void;
    canScrollLeft: boolean;
    canScrollRight: boolean;
  } | null>(null);

  // Use SWR hook to fetch matches
  const { matches, isLoading: loading, error: swrError } = usePopularMatches();
  
  const error = swrError ? 'Failed to load matches. Please try again later.' : null;

  // Update active sport when URL parameter changes
  useEffect(() => {
    const sportParam = searchParams.get('sport');
    if (sportParam && sportParam !== activeSport) {
      setActiveSport(sportParam);
    }
  }, [searchParams, activeSport]);

  useEffect(() => {
    // Check if controls are ready after component mounts
    const checkControls = () => {
      if (sportControlsRef.current) {
        setControlsReady(true);
        setScrollState({
          canScrollLeft: sportControlsRef.current.canScrollLeft,
          canScrollRight: sportControlsRef.current.canScrollRight,
        });
      }
    };
    // Check immediately and periodically until ready
    checkControls();
    const interval = setInterval(() => {
      if (sportControlsRef.current) {
        setControlsReady(true);
        setScrollState({
          canScrollLeft: sportControlsRef.current.canScrollLeft,
          canScrollRight: sportControlsRef.current.canScrollRight,
        });
        clearInterval(interval);
      }
    }, 50);
    // Also check after a delay to catch late updates
    const timeout = setTimeout(() => {
      checkControls();
      clearInterval(interval);
    }, 500);
    
    // Periodically update scroll state to keep buttons in sync
    const stateUpdateInterval = setInterval(() => {
      if (sportControlsRef.current) {
        setScrollState({
          canScrollLeft: sportControlsRef.current.canScrollLeft,
          canScrollRight: sportControlsRef.current.canScrollRight,
        });
      }
    }, 200);
    
    return () => {
      clearInterval(interval);
      clearInterval(stateUpdateInterval);
      clearTimeout(timeout);
    };
  }, []);

  const popularMatches = useMemo(() => {
    return matches.filter(m => {
      // Only show matches with valid team names (not placeholders)
      if (!m.home || !m.away || m.home === 'Home Team' || m.away === 'Away Team') {
        return false;
      }
      
      // Filter by sport
      if (m.sport !== activeSport) return false;
      
      // Filter by status
      if (activeStatus === 'live') {
        return m.status === 'live';
      }
      // For 'all' status, show popular matches (isHot) that are live or upcoming
      return (m.isHot && (m.status === 'live' || m.status === 'upcoming'));
    });
  }, [matches, activeSport, activeStatus]);

  return (
    <div className="p-2 sm:p-4 md:p-8 max-w-[2400px] mx-auto">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className={`text-lg sm:text-xl md:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Popular Now
            </h1>
            <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Trending matches happening right now
            </p>
          </div>
          <div className="flex items-center gap-2 sm:hidden">
          <button
            aria-label="Scroll sports left"
            type="button"
            onClick={() => {
              sportControlsRef.current?.scrollSports('left');
              // Update state after scroll animation
              setTimeout(() => {
                if (sportControlsRef.current) {
                  setScrollState({
                    canScrollLeft: sportControlsRef.current.canScrollLeft,
                    canScrollRight: sportControlsRef.current.canScrollRight,
                  });
                }
              }, 400);
            }}
            disabled={!controlsReady || !scrollState.canScrollLeft}
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
            onClick={() => {
              sportControlsRef.current?.scrollSports('right');
              // Update state after scroll animation
              setTimeout(() => {
                if (sportControlsRef.current) {
                  setScrollState({
                    canScrollLeft: sportControlsRef.current.canScrollLeft,
                    canScrollRight: sportControlsRef.current.canScrollRight,
                  });
                }
              }, 400);
            }}
            disabled={!controlsReady || !scrollState.canScrollRight}
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

      <div className="mb-6 space-y-1 sm:space-y-2">
        <SportSelector 
          activeSport={activeSport} 
          onSportChange={setActiveSport} 
          darkMode={darkMode}
          hideMobileControls={true}
          controlsRef={sportControlsRef}
        />
        
        {/* Status Filter - Compact Border Design */}
        <div className="flex flex-row items-center gap-2 sm:gap-4">
          <div className={`flex items-center gap-0.5 sm:gap-1 ${
            darkMode 
              ? '' 
              : ''
          }`}>
            <button
              onClick={() => setActiveStatus('all')}
              className={`relative px-2 py-0.5 sm:px-5 sm:py-2.5 md:pl-0 text-xs sm:text-sm font-bold transition-all duration-300 ease-out ${
                activeStatus === 'all'
                  ? darkMode
                    ? 'text-emerald-400'
                    : 'text-emerald-700'
                  : darkMode
                    ? 'text-slate-300 hover:text-slate-100'
                    : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <span className="relative z-10 flex items-center gap-1 sm:gap-2">
                <Radio className={`w-4 h-4 sm:w-4 sm:h-4 ${activeStatus === 'all' ? 'opacity-100' : 'opacity-60'}`} />
                All Popular
              </span>
            </button>
            <button
              onClick={() => setActiveStatus('live')}
              className={`relative px-2 py-0.5 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold transition-all duration-300 ease-out ${
                activeStatus === 'live'
                  ? darkMode
                    ? 'text-red-400'
                    : 'text-red-700'
                  : darkMode
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className="relative z-10 flex items-center gap-1 sm:gap-2">
                <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${
                  activeStatus === 'live' 
                    ? darkMode
                      ? 'bg-red-400 animate-pulse'
                      : 'bg-red-600 animate-pulse'
                    : darkMode 
                      ? 'bg-slate-500' 
                      : 'bg-slate-400'
                }`} />
                Live Only
              </span>
            </button>
          </div>
          
          {/* Match Count Badge */}
          {popularMatches.length > 0 && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
              darkMode
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-md'
            }`}>
              <Flame size={12} className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} />
              <span>{popularMatches.length} {popularMatches.length === 1 ? 'Match' : 'Matches'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner darkMode={darkMode} compact={false} />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className={`flex flex-col items-center justify-center py-16 px-4 rounded-3xl border-2 border-dashed shadow-sm ${
          darkMode 
            ? 'bg-slate-900/40 border-slate-700/60' 
            : 'bg-slate-50 border-slate-200 shadow-md'
        }`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            darkMode 
              ? 'bg-red-900/30' 
              : 'bg-red-50'
          }`}>
            <Flame size={32} className={darkMode ? 'text-red-400' : 'text-red-600'} />
          </div>
          <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Error Loading Matches
          </h3>
          <p className={`text-sm text-center max-w-md ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {error}
          </p>
        </div>
      )}

      {/* Matches Grid */}
      {!loading && !error && popularMatches.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6">
          {popularMatches.map(match => (
            <MatchCard key={match.id} match={match} darkMode={darkMode} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && popularMatches.length === 0 && (
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
            <Flame size={32} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
          </div>
          <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            No Popular Matches Found
          </h3>
          <p className={`text-sm text-center max-w-md ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {activeStatus === 'live' 
              ? 'There are no live popular matches at the moment. Check back soon!' 
              : `No popular matches found for ${activeSport}. Try selecting a different sport or filter.`}
          </p>
        </div>
      )}
    </div>
  );
}

export default function PopularPage() {
  // Note: Can't use hooks in Suspense fallback, so using default darkMode
  // The actual page will use the correct darkMode once loaded
  return (
    <Suspense fallback={
      <div className="p-2 sm:p-4 md:p-8 max-w-[2400px] mx-auto">
        <LoadingSpinner darkMode={false} compact={false} />
      </div>
    }>
      <PopularPageContent />
    </Suspense>
  );
}

