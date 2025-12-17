'use client';

import { ArrowRight, ChevronLeft, ChevronRight, Play, Users } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import type { Match } from '../utils/matchTransform';

interface LiveMatchesCarouselProps {
  matches: Match[];
  darkMode?: boolean;
  isLoading?: boolean;
}

export default function LiveMatchesCarousel({ matches, darkMode = false, isLoading = false }: LiveMatchesCarouselProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const prevScrollStateRef = useRef({ canScrollLeft: false, canScrollRight: true });

  // Use matches directly - they're already filtered and validated live matches
  // No need to filter again since we're receiving validated live matches from useMatches
  const liveMatches = useMemo(() => matches, [matches]);

  // Check scroll state function - stored in ref to avoid dependency issues
  const checkScrollRef = useRef(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const newCanScrollLeft = scrollLeft > 0;
      const newCanScrollRight = scrollLeft < scrollWidth - clientWidth - 10;
      
      // Only update state if values actually changed
      if (prevScrollStateRef.current.canScrollLeft !== newCanScrollLeft) {
        setCanScrollLeft(newCanScrollLeft);
        prevScrollStateRef.current.canScrollLeft = newCanScrollLeft;
      }
      if (prevScrollStateRef.current.canScrollRight !== newCanScrollRight) {
        setCanScrollRight(newCanScrollRight);
        prevScrollStateRef.current.canScrollRight = newCanScrollRight;
      }
    }
  });

  // Set up scroll listeners
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const checkScroll = checkScrollRef.current;

    // Initial check with a delay to ensure DOM is ready
    const initialTimeout = setTimeout(checkScroll, 100);
    
    // Debounced scroll handler
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(checkScroll, 50);
    };
    
    container.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', checkScroll);
    
      return () => {
      clearTimeout(initialTimeout);
      clearTimeout(scrollTimeout);
      container.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', checkScroll);
      };
  }, []); // Empty deps - only set up once

  // Re-check scroll state when liveMatches length changes (after DOM updates)
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM has updated
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        checkScrollRef.current();
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, [liveMatches.length]); // Only depend on length

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const cards = container.querySelectorAll('[data-match-card]');
      
      if (cards.length === 0) return;
      
      const gap = 16; // gap-4 = 16px
      const firstCard = cards[0] as HTMLElement;
      const cardWidth = firstCard.offsetWidth;
      const cardWithGap = cardWidth + gap;
      
      // Calculate how many cards fit in the visible viewport
      const containerWidth = container.clientWidth;
      const visibleCount = Math.max(1, Math.floor(containerWidth / cardWithGap));
      
      // Calculate scroll amount: scroll by the number of visible cards
      const scrollAmount = (cardWidth * visibleCount) + (gap * (visibleCount - 1));
      const offset = direction === 'left' ? -scrollAmount : scrollAmount;
      
      container.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Show loading state while validating
  if (isLoading && liveMatches.length === 0) {
    return (
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg sm:text-xl md:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Live Now
          </h2>
        </div>
        <div className="flex items-center justify-center py-12 px-4 rounded-2xl border-2 border-dashed" style={{ minHeight: '200px' }}>
          <div className="text-center">
            <LoadingSpinner darkMode={darkMode} compact={true} />
            <p className={`mt-4 text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Validating live streams...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Don't show if no matches and not loading
  if (liveMatches.length === 0) return null;

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-lg sm:text-xl md:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Live Now
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/popular?status=live')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              darkMode
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-emerald-600 hover:text-emerald-700'
            }`}
          >
            <span className="hidden sm:inline">View All Live</span>
            <span className="sm:hidden">View All</span>
            <ArrowRight size={14} />
          </button>
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
              darkMode 
                ? 'border-white/15 bg-white/5 text-white hover:bg-white/10 active:bg-white/20 hover:border-white/25' 
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
              darkMode 
                ? 'border-white/15 bg-white/5 text-white hover:bg-white/10 active:bg-white/20 hover:border-white/25' 
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2 pt-2 pl-2 touch-pan-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {liveMatches.map((match) => (
            <div
              key={match.id}
              data-match-card
              onClick={() => router.push(`/watch/${match.id}`)}
              className={`group relative flex-shrink-0 w-[280px] sm:w-[320px] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 sm:hover:scale-105 hover:shadow-2xl border-2 shadow-lg ${
                darkMode
                  ? 'bg-slate-900/95 border-red-500/40 hover:border-red-500/70 shadow-red-500/10'
                  : 'bg-white border-red-200/60 hover:border-red-400/70 shadow-red-200/20'
              }`}
            >
              {/* Thumbnail background */}
              {match.thumbnail && (
                <div className="absolute inset-0">
                  <Image
                    src={match.thumbnail}
                    alt={`${match.home} vs ${match.away}`}
                    fill
                    className="object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-500"
                    sizes="(max-width: 640px) 280px, 320px"
                  />
                  <div className={`absolute inset-0 ${
                    darkMode 
                      ? 'bg-gradient-to-b from-slate-950/90 via-slate-900/80 to-slate-950/90' 
                      : 'bg-gradient-to-b from-white/95 via-white/90 to-white/95'
                  }`} />
                </div>
              )}

              {/* LIVE badge */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-red-600 to-red-500 text-white text-[11px] font-bold shadow-lg shadow-red-500/40 backdrop-blur-sm border border-red-400/30">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                LIVE
              </div>

              {/* Viewer count */}
              {match.viewers && (
                <div className={`absolute top-2 right-2 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-md backdrop-blur-md border shadow-sm ${
                  darkMode
                    ? 'bg-black/60 border-white/30 text-white'
                    : 'bg-white/95 border-slate-200 text-slate-800 shadow-md'
                }`}>
                  <Users size={10} />
                  <span className="text-[9px] font-bold">{match.viewers}</span>
                </div>
              )}

              {/* Content */}
              <div className="relative z-10 p-4 flex flex-col h-full">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <div className="relative h-12 w-10 sm:h-14 sm:w-12">
                    <Image
                      src={match.homeLogo || '/no-image.png'}
                      alt={match.home}
                      fill
                      className={`${match.homeLogo ? 'object-contain' : 'object-cover scale-150'} drop-shadow-lg`}
                      sizes="(max-width: 640px) 40px, 48px"
                    />
                  </div>
                  <span
                    className={`text-xs sm:text-sm font-black uppercase tracking-tight italic select-none px-2 py-1 rounded-full border backdrop-blur-sm ${
                      darkMode
                        ? 'text-white border-white/20 bg-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.35)]'
                        : 'text-slate-700 border-slate-200 bg-white/80 shadow-[0_6px_14px_rgba(15,118,110,0.15)]'
                    }`}
                  >
                    VS
                  </span>
                  <div className="relative h-12 w-10 sm:h-14 sm:w-12">
                    <Image
                      src={match.awayLogo || '/no-image.png'}
                      alt={match.away}
                      fill
                      className={`${match.awayLogo ? 'object-contain' : 'object-cover scale-150'} drop-shadow-lg`}
                      sizes="(max-width: 640px) 40px, 48px"
                    />
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div className="text-center mb-3">
                    <p className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {match.sport.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                    </p>
                    <h3 className={`text-xs sm:text-base font-bold leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {match.home} <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>vs</span> {match.away}
                    </h3>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/watch/${match.id}`);
                    }}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 hover:scale-105 active:scale-95 min-h-[44px] shadow-lg hover:shadow-xl ${
                      darkMode
                        ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/50'
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/50'
                    }`}
                  >
                    <Play size={14} className="sm:w-4 sm:h-4" fill="currentColor" />
                    Watch Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

