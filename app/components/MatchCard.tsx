'use client';

import { Clock, Play, Users } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { Match } from '../utils/matchTransform';

interface MatchCardProps {
  match: Match;
  compact?: boolean;
  darkMode?: boolean;
}

export default function MatchCard({ match, compact = false, darkMode = false }: MatchCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/watch/${match.id}`);
  };

  const isLive = match.status === 'live';
  const isEnded = match.status === 'ended';

  return (
    <div 
      onClick={handleClick}
      className={`group cursor-pointer rounded-2xl border transition-all duration-300 hover:-translate-y-1 shadow-md hover:shadow-xl
        ${darkMode 
          ? 'bg-slate-900/90 border-slate-800/60 hover:border-emerald-500/40 hover:bg-slate-900 hover:shadow-emerald-500/20' 
          : 'bg-white border-slate-200 hover:border-emerald-400/60 hover:shadow-emerald-500/10 hover:bg-white'
        }
        ${compact ? 'p-2.5 sm:p-3.5' : 'p-3 sm:p-4'}`}
    >
      <div className="flex flex-col gap-2.5 sm:gap-3.5">
        <div className={`relative w-full aspect-[4/3] md:aspect-[3/2] rounded-xl overflow-hidden border backdrop-blur-sm
          ${darkMode 
            ? 'bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-slate-950/90 border-slate-800/50 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]' 
            : 'bg-gradient-to-br from-slate-50 via-white to-slate-50/80 border-slate-200/60 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]'
          }`}
        >
          {/* Thumbnail background */}
          {match.thumbnail && (
            <div className="absolute inset-0">
              <Image
                src={match.thumbnail}
                alt={`${match.home} vs ${match.away}`}
                fill
                className="object-cover opacity-25 group-hover:opacity-35 transition-opacity duration-500"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
              <div className={`absolute inset-0 ${
                darkMode 
                  ? 'bg-gradient-to-b from-slate-950/80 via-slate-900/70 to-slate-950/80' 
                  : 'bg-gradient-to-b from-slate-50/90 via-white/95 to-slate-50/90'
              }`} />
            </div>
          )}

          {/* Viewer count for live matches */}
          {isLive && match.viewers && (
              <div className={`absolute top-2 left-2 z-20 flex items-center gap-1 px-1.5 py-0.5 rounded-md backdrop-blur-md border shadow-sm ${
              darkMode
                ? 'bg-black/60 border-white/30 text-white'
                : 'bg-white/95 border-slate-200 text-slate-800 shadow-md'
            }`}>
              <Users size={10} />
              <span className="text-[9px] font-bold">{match.viewers}</span>
            </div>
          )}

          {/* Watch button overlay on hover */}
          <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:scale-110 active:scale-95 min-h-[44px] min-w-[120px] ${
                darkMode
                  ? 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/50'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/50'
              }`}
            >
              <Play size={16} fill="currentColor" />
              {isLive ? 'Watch' : isEnded ? 'WATCH' : 'Watch'}
            </button>
          </div>

          <div className={`absolute inset-0 z-10 ${match.thumbnail ? '' : darkMode ? 'bg-gradient-to-b from-transparent via-slate-900/20 to-slate-950/40' : 'bg-gradient-to-b from-transparent via-slate-100/30 to-slate-200/20'}`} />
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 md:gap-2.5 px-3.5 md:px-4 py-2">
            <div className="flex items-center justify-center gap-2 md:gap-2.5">
              <div className={`relative flex-shrink-0 ${compact ? 'w-10 h-12 md:w-11 md:h-14' : 'w-11 h-14 md:w-14 md:h-16'}`}>
                <Image 
                  src={match.homeLogo || '/no-image.png'} 
                  alt={match.home}
                  fill
                  className={`${match.homeLogo ? 'object-contain' : 'object-cover scale-150'} drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-transform group-hover:scale-105`}
                  sizes="(max-width: 640px) 40px, (max-width: 768px) 44px, 56px"
                />
              </div>
              <span
                className={`text-xs sm:text-sm font-black uppercase tracking-tight italic select-none px-1 py-0.5 rounded-full border backdrop-blur-sm flex-shrink-0
                  ${darkMode
                    ? 'text-white border-white/20 bg-white/5 shadow-[0_4px_12px_rgba(0,0,0,0.35)]'
                    : 'text-slate-700 border-slate-200 bg-white/80 shadow-[0_6px_14px_rgba(15,118,110,0.15)]'}
                `}
              >
                VS
              </span>
              <div className={`relative flex-shrink-0 ${compact ? 'w-10 h-12 md:w-11 md:h-14' : 'w-11 h-14 md:w-14 md:h-16'}`}>
                <Image 
                  src={match.awayLogo || '/no-image.png'} 
                  alt={match.away}
                  fill
                  className={`${match.awayLogo ? 'object-contain' : 'object-cover scale-150'} drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-transform group-hover:scale-105`}
                  sizes="(max-width: 640px) 40px, (max-width: 768px) 44px, 56px"
                />
              </div>
            </div>
            {isLive ? (
              <div className="flex items-center gap-1 px-2 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5 rounded-full bg-gradient-to-r from-red-600 to-red-500 text-white text-[10px] sm:text-[12px] font-bold shadow-lg shadow-red-500/40 backdrop-blur-sm border border-red-400/30">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white animate-pulse" />
                LIVE
              </div>
            ) : isEnded ? (
              <div className={`flex items-center gap-1 px-2 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-[12px] font-semibold shadow-md backdrop-blur-sm border
                ${darkMode 
                  ? 'bg-slate-900/90 text-slate-100 border-slate-800/60 shadow-black/30' 
                  : 'bg-slate-100 text-slate-700 border-slate-200 shadow-slate-900/10'
                }`}
              >
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500" />
                <span>Ended</span>
              </div>
            ) : (
              <div className={`flex items-center gap-1 px-2 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-[12px] font-semibold shadow-md backdrop-blur-sm border
                ${darkMode 
                  ? 'bg-slate-800/90 text-slate-100 border-slate-700/60 shadow-black/30' 
                  : 'bg-white text-slate-700 border-slate-200 shadow-slate-900/10'
                }`}
              >
                <Clock size={10} className={`sm:w-[12px] sm:h-[12px] ${darkMode ? 'text-slate-300' : 'text-slate-600'}`} />
                <span>{match.time}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.3em]">
            <span className={`${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {match.sport.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
            </span>
          </div>
          <h4 className={`text-xs sm:text-sm md:text-[15px] font-semibold leading-snug tracking-tight transition-colors group-hover:text-emerald-500
            ${darkMode ? 'text-white' : 'text-slate-900'}
          `}>
            {match.home} <span className={`${darkMode ? 'text-slate-300' : 'text-slate-600'} font-normal`}>vs</span> {match.away}
          </h4>
        </div>
      </div>
    </div>
  );
}

