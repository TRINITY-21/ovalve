'use client';

import {
  Activity,
  Bike,
  Car,
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
import { useRouter } from 'next/navigation';
import React from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useSports } from '../hooks/useSports';

// Icon mapping for sports - same as SportSelector
const SPORT_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  football: Trophy,
  soccer: Trophy,
  'american-football': Shield,
  'americanfootball': Shield,
  nfl: Shield,
  baseball: Circle,
  mlb: Circle,
  basketball: Dribbble,
  nba: Dribbble,
  cricket: Activity,
  darts: Target,
  fight: Swords,
  ufc: Swords,
  boxing: Swords,
  'fight (ufc, box)': Swords,
  hockey: Disc,
  nhl: Disc,
  volleyball: Radio,
  tennis: Footprints,
  atp: Footprints,
  wta: Footprints,
  rugby: Dumbbell,
  'motor sports': Car,
  'formula-1': Car,
  'formula1': Car,
  f1: Car,
  motogp: Bike,
  other: Sparkles,
  default: Sparkles,
};

// Get icon for a sport ID
const getSportIcon = (sportId: string) => {
  const normalizedId = sportId.toLowerCase();
  return SPORT_ICONS[normalizedId] || SPORT_ICONS.default;
};


export default function LeaguesPage() {
  const router = useRouter();
  const { darkMode } = useDarkMode();
  
  // Use SWR hook to fetch sports
  const { sports, isLoading: loading, error: swrError } = useSports();
  
  const error = swrError ? 'Failed to load sports. Please try again later.' : null;

  const handleSportClick = (sportId: string) => {
    router.push(`/schedule?sport=${encodeURIComponent(sportId)}`);
  };

  return (
    <div className="p-2 sm:p-4 md:p-8 max-w-[2400px] mx-auto">
      <div className="mb-4 sm:mb-6">
        <h1 className={`text-lg sm:text-xl md:text-2xl font-black tracking-tight mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Sports
        </h1>
        <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          Browse matches by sport. {loading ? 'Loading...' : `${sports.length} sports with matches`}
        </p>
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
            <Trophy size={32} className={darkMode ? 'text-red-400' : 'text-red-600'} />
          </div>
          <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Error Loading Sports
          </h3>
          <p className={`text-sm text-center max-w-md ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {error}
          </p>
        </div>
      )}

      {/* Sports Grid */}
      {!loading && !error && sports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {sports.map((sport) => {
            const Icon = getSportIcon(sport.id);
            return (
              <div 
                key={sport.id} 
                onClick={() => handleSportClick(sport.id)}
                className={`relative overflow-hidden flex items-center gap-4 p-4 border rounded-xl transition-all cursor-pointer group hover:shadow-md
                  ${darkMode ? 'bg-slate-900/60 border-white/10 hover:bg-slate-900/90 hover:border-emerald-500/40' : 'bg-white border-slate-200 hover:border-emerald-300'}
                `}
              >
                {/* Icon */}
                <div className={`w-12 h-12 shrink-0 rounded-lg flex items-center justify-center border transition-transform group-hover:scale-110
                  ${darkMode ? 'bg-slate-800/80 border-white/10' : 'bg-slate-50 border-slate-200'}
                `}>
                  <Icon size={24} className={darkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                </div>
                
                {/* Content */}
                <div className="flex-1 flex items-center gap-4 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`text-base sm:text-lg font-bold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {sport.name}
                      </h3>
                      {sport.liveMatches > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 animate-pulse shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"/>
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <p className={`font-semibold ${darkMode ? 'text-emerald-300' : 'text-emerald-600'}`}>
                        {sport.matches} {sport.matches === 1 ? 'Match' : 'Matches'}
                      </p>
                      {sport.liveMatches > 0 && (
                        <span className={darkMode ? 'text-red-400' : 'text-red-600'}>
                          {sport.liveMatches} Live
                        </span>
                      )}
                      {sport.upcomingMatches > 0 && (
                        <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
                          {sport.upcomingMatches} Upcoming
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Arrow */}
                <div className={`shrink-0 transition-colors ${darkMode ? 'text-slate-400 group-hover:text-white' : 'text-slate-400 group-hover:text-slate-700'}`}>
                  <ChevronRight size={20} />
                </div>
                
                {/* Trophy Background Icon */}
                <div className={`absolute -right-4 -bottom-4 opacity-[0.03] transform rotate-12 group-hover:scale-110 transition-transform duration-500 pointer-events-none
                  ${darkMode ? 'text-white' : 'text-slate-900'}
                `}>
                  <Trophy size={100} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && sports.length === 0 && (
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
            <Trophy size={32} className={darkMode ? 'text-slate-500' : 'text-slate-400'} />
          </div>
          <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            No Sports Found
          </h3>
          <p className={`text-sm text-center max-w-md ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            No sports with matches are currently available. Check back later for updates.
          </p>
        </div>
      )}
    </div>
  );
}

