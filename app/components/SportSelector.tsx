'use client';

import { getMatches } from '@/app/services/streamedApi';
import { transformMatches } from '@/app/utils/matchTransform';
import {
  Activity,
  Bike,
  Car,
  ChevronLeft,
  ChevronRight,
  Circle,
  Disc,
  Dribbble,
  Dumbbell,
  Footprints,
  Radio,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trophy
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface Sport {
  id: string;
  name: string;
}

// Icon mapping for sports - each sport has a unique icon
const SPORT_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  // Football/Soccer - Trophy represents championship/competition
  football: Trophy,
  soccer: Trophy,
  
  // American Football - Shield represents helmet/protection
  'american-football': Shield,
  'americanfootball': Shield,
  nfl: Shield,
  
  // Baseball - Circle represents the ball
  baseball: Circle,
  mlb: Circle,
  
  // Basketball - Dribbble represents basketball movement
  basketball: Dribbble,
  nba: Dribbble,
  
  // Cricket - Activity represents movement/action
  cricket: Activity,
  
  // Darts - Target represents the dartboard
  darts: Target,
  
  // Fight/Combat Sports - Swords represent combat
  fight: Swords,
  ufc: Swords,
  boxing: Swords,
  'fight (ufc, box)': Swords,
  
  // Hockey - Disc represents the puck
  hockey: Disc,
  nhl: Disc,
  
  // Volleyball - Radio represents the net/ball
  volleyball: Radio,
  
  // Tennis - Footprints represents court movement
  tennis: Footprints,
  atp: Footprints,
  wta: Footprints,
  
  // Rugby - Dumbbell represents strength/physicality
  rugby: Dumbbell,
  
  // Motor Sports - Car for Formula 1, Bike for MotoGP
  'motor sports': Car,
  'formula-1': Car,
  'formula1': Car,
  f1: Car,
  motogp: Bike,
  
  // Other sports - Sparkles for variety
  other: Sparkles,
  default: Sparkles,
};

// Get icon for a sport ID
const getSportIcon = (sportId: string) => {
  const normalizedId = sportId.toLowerCase();
  return SPORT_ICONS[normalizedId] || SPORT_ICONS.default;
};

interface SportSelectorProps {
  activeSport: string;
  onSportChange: (sport: string) => void;
  darkMode?: boolean;
  hideMobileControls?: boolean;
  controlsRef?: React.MutableRefObject<{ scrollSports: (direction: 'left' | 'right') => void; canScrollLeft: boolean; canScrollRight: boolean } | null>;
  onControlsReady?: () => void;
}

// Helper function to capitalize sport name
const capitalizeSportName = (sportId: string): string => {
  const normalized = sportId.toLowerCase();
  // Map common sport IDs to proper names
  const sportNameMap: Record<string, string> = {
    'football': 'Football',
    'soccer': 'Football',
    'basketball': 'Basketball',
    'hockey': 'Hockey',
    'volleyball': 'Volleyball',
    'baseball': 'Baseball',
    'tennis': 'Tennis',
    'american-football': 'American Football',
    'americanfootball': 'American Football',
    'nfl': 'American Football',
    'nba': 'Basketball',
    'nhl': 'Hockey',
    'mlb': 'Baseball',
    'ufc': 'Fight (UFC, Box)',
    'boxing': 'Fight (UFC, Box)',
    'formula-1': 'Motor Sports',
    'formula1': 'Motor Sports',
    'motogp': 'Motor Sports',
  };
  
  if (sportNameMap[normalized]) {
    return sportNameMap[normalized];
  }
  
  // Capitalize first letter of each word
  return sportId
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function SportSelector({ activeSport, onSportChange, darkMode = false, hideMobileControls = false, controlsRef, onControlsReady }: SportSelectorProps) {
  const sportsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false); // Start as false, will be updated after check
  const [sports, setSports] = useState<Sport[]>([]);
  const [sportsLoading, setSportsLoading] = useState(true);

  // Extract sports from matches API
  useEffect(() => {
    let isMounted = true;
    
    const extractSportsFromMatches = async () => {
      try {
        // Fetch matches from multiple endpoints to get all sports
        const [liveMatches, todayMatches, allMatches] = await Promise.all([
          getMatches('live').catch(() => []),
          getMatches('all-today').catch(() => []),
          getMatches('all').catch(() => []),
        ]);
        
        if (!isMounted) return;
        
        // Transform matches
        const transformedLive = transformMatches(liveMatches, true);
        const transformedToday = transformMatches(todayMatches);
        const transformedAll = transformMatches(allMatches);
        
        // Combine all matches
        const allMatchesMap = new Map<string, typeof transformedLive[0]>();
        transformedAll.forEach(m => allMatchesMap.set(m.id, m));
        transformedToday.forEach(m => allMatchesMap.set(m.id, m));
        transformedLive.forEach(m => allMatchesMap.set(m.id, m));
        
        const combinedMatches = Array.from(allMatchesMap.values());
        
        // Extract unique sports from matches
        const sportMap = new Map<string, string>();
        combinedMatches.forEach(match => {
          if (match.sport) {
            const sportId = match.sport.toLowerCase();
            const sportName = capitalizeSportName(match.sport);
            sportMap.set(sportId, sportName);
          }
        });
        
        // Convert to array and sort (Football first)
        const extractedSports: Sport[] = Array.from(sportMap.entries())
          .map(([id, name]) => ({ id, name }))
          .sort((a, b) => {
            // Football always comes first
            if (a.id === 'football' || a.id === 'soccer') return -1;
            if (b.id === 'football' || b.id === 'soccer') return 1;
            // Keep other sports in alphabetical order
            return a.name.localeCompare(b.name);
          });
        
        if (isMounted) {
          setSports(extractedSports);
          // If active sport is not in the extracted sports, set Football as active (or first one)
          if (extractedSports.length > 0 && !extractedSports.find(s => s.id === activeSport)) {
            const footballSport = extractedSports.find(s => s.id === 'football' || s.id === 'soccer');
            onSportChange(footballSport ? footballSport.id : extractedSports[0].id);
          }
        }
      } catch (error) {
        console.error('Error extracting sports from matches:', error);
        // Fallback to default sports if API fails (Football first)
        if (isMounted) {
          setSports([
            { id: 'football', name: 'Football' },
            { id: 'basketball', name: 'Basketball' },
            { id: 'hockey', name: 'Hockey' },
            { id: 'volleyball', name: 'Volleyball' },
          ]);
        }
      } finally {
        if (isMounted) {
          setSportsLoading(false);
        }
      }
    };
    
    extractSportsFromMatches();
    
    return () => {
      isMounted = false;
    };
  }, [activeSport, onSportChange]);

  const scrollSports = useCallback((direction: 'left' | 'right') => {
    const container = sportsRef.current;
    if (!container) return;
    const offset = direction === 'left' ? -220 : 220;
    container.scrollBy({ left: offset, behavior: 'smooth' });
    
    // Check scroll state after animation completes
    setTimeout(() => {
      if (container) {
        const { scrollLeft, scrollWidth, clientWidth } = container;
        setCanScrollLeft(scrollLeft > 5);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
      }
    }, 350); // Wait for smooth scroll to complete
  }, []);

  // Check scroll state function
  const checkScroll = useCallback(() => {
      if (sportsRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = sportsRef.current;
      const hasMoreLeft = scrollLeft > 5;
      const hasMoreRight = scrollLeft < scrollWidth - clientWidth - 5;
      setCanScrollLeft(hasMoreLeft);
      setCanScrollRight(hasMoreRight);
      }
  }, []);

  // Set up scroll listeners
  useEffect(() => {
    const container = sportsRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      
      // Also check on scroll end for better reliability
      let scrollTimeout: NodeJS.Timeout;
      const handleScroll = () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(checkScroll, 150);
      };
      container.addEventListener('scroll', handleScroll);
      
      return () => {
        clearTimeout(scrollTimeout);
        container.removeEventListener('scroll', checkScroll);
        container.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [checkScroll]);

  // Check scroll state when sports finish loading or change
  useEffect(() => {
    if (!sportsLoading && sports.length > 0) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        // Double RAF to ensure layout is complete
        requestAnimationFrame(() => {
          checkScroll();
          // Also check after a small delay to be safe
          setTimeout(checkScroll, 100);
        });
      });
    }
  }, [sports, sportsLoading, checkScroll]);

  useEffect(() => {
    if (controlsRef) {
      const wasInitialized = controlsRef.current !== null;
      controlsRef.current = { scrollSports, canScrollLeft, canScrollRight };
      // Notify parent that controls are ready (only on first initialization)
      if (!wasInitialized && onControlsReady) {
        onControlsReady();
      }
    }
  }, [canScrollLeft, canScrollRight, scrollSports, controlsRef, onControlsReady]);

  // Force update controlsRef after scroll state changes
  useEffect(() => {
    if (controlsRef && controlsRef.current) {
      controlsRef.current.canScrollLeft = canScrollLeft;
      controlsRef.current.canScrollRight = canScrollRight;
    }
  }, [canScrollLeft, canScrollRight, controlsRef]);

  const Controls = ({ className = '', isMobile = false }: { className?: string; isMobile?: boolean }) => (
    <div className={`flex items-center justify-center gap-2 shrink-0 ${className}`}>
      <button
        aria-label="Scroll sports left"
        type="button"
        onClick={() => scrollSports('left')}
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
        aria-label="Scroll sports right"
        type="button"
        onClick={() => scrollSports('right')}
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
  );

  return (
    <div>
      <div className="flex items-center gap-3">
        <div
          ref={sportsRef}
          className="flex-1 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {sportsLoading ? (
            <div className="flex items-center justify-center px-3 py-2">
              <LoadingSpinner darkMode={darkMode} compact={true} />
            </div>
          ) : (
            sports.map((sport, idx) => {
              const Icon = getSportIcon(sport.id);
              const isActive = activeSport === sport.id;
              return (
                <button
                  key={sport.id}
                  onClick={() => onSportChange(sport.id)}
                  className={`category-pill flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap tracking-tight transition-all border min-h-[44px] flex-shrink-0 shadow-sm hover:shadow-md ${
                    isActive
                      ? (darkMode
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/50 shadow-emerald-500/10'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-emerald-200/20')
                      : (darkMode
                          ? 'bg-slate-900 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/15'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300')
                  } ${isActive ? 'category-pill-active' : ''}`}
                  style={{ animationDelay: `${idx * 70}ms` }}
                >
                  <Icon size={16} className="sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">{sport.name}</span>
                </button>
              );
            })
          )}
        </div>

        <Controls className="hidden sm:flex" />
      </div>
      
      {!hideMobileControls && (
        <div className="flex justify-end mt-3 sm:hidden">
          <Controls isMobile={true} />
        </div>
      )}
    </div>
  );
}

