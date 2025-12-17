'use client';

import { getDisplayName } from '@/lib/utils';
import { Check, CheckCircle, ChevronLeft, ChevronRight, Hourglass, LayoutList, Target, X, XCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useSidebar } from '../contexts/SidebarContext';
import { DAYS } from '../data/constants';

interface Prediction {
  id: string;
  home: string;
  away: string;
  league: string;
  prediction: string;
  confidence: number;
  status: 'won' | 'lost' | 'pending';
  score?: string;
  predictedScore?: string;
  time?: string;
  timeLabel?: string;
  matchDate?: string;
}

// Get day abbreviation from full day name
function getDayAbbr(dayName: string): string {
  const dayMap: Record<string, string> = {
    'Sunday': 'Sun',
    'Monday': 'Mon',
    'Tuesday': 'Tue',
    'Wednesday': 'Wed',
    'Thursday': 'Thu',
    'Friday': 'Fri',
    'Saturday': 'Sat',
  };
  return dayMap[dayName] || dayName.substring(0, 3);
}

// Get day of week from date string (DD-MM-YYYY format)
function getDayOfWeekFromDate(dateStr: string): string {
  try {
    const [day, month, year] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  } catch {
    return 'Monday';
  }
}

// Group predictions by day
function groupPredictionsByDay(predictions: Prediction[]): Record<string, Prediction[]> {
  const grouped: Record<string, Prediction[]> = {};
  
  predictions.forEach(pred => {
    let dayName = 'Monday';
    
    if (pred.matchDate) {
      dayName = getDayOfWeekFromDate(pred.matchDate);
    } else {
      // Use current day as fallback
      const today = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      dayName = days[today.getDay()];
    }
    
    const dayAbbr = getDayAbbr(dayName);
    
    if (!grouped[dayAbbr]) {
      grouped[dayAbbr] = [];
    }
    
    grouped[dayAbbr].push(pred);
  });
  
  // Sort predictions by time within each day
  Object.keys(grouped).forEach(dayKey => {
    grouped[dayKey].sort((a, b) => {
      const timeA = a.timeLabel || a.time || '00:00';
      const timeB = b.timeLabel || b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
  });
  
  return grouped;
}

export default function PredictionsPage() {
  const { darkMode } = useDarkMode();
  const { isCollapsed } = useSidebar();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState('Mon');
  const daysScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const scrollDays = (direction: 'left' | 'right') => {
    const container = daysScrollRef.current;
    if (!container) return;
    const offset = direction === 'left' ? -120 : 120;
    container.scrollBy({ left: offset, behavior: 'smooth' });
  };

  // Fetch predictions from API
  useEffect(() => {
    let cancelled = false;
    async function fetchPredictions() {
      try {
        setLoading(true);
        const response = await fetch('/api/predictions', { cache: 'no-store' });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!cancelled) {
          if (data.error) {
            console.error('Error fetching predictions:', data.error, data.details);
            // Show error message to user
            if (data.message) {
              console.error('Firebase Error:', data.message);
            }
            setPredictions([]);
          } else if (Array.isArray(data)) {
            // Transform API data to Prediction format
            const transformed: Prediction[] = data.map((pred: any, index: number) => {
              // Debug logging for first few items
              if (index < 3) {
                console.log(`[Predictions] Processing prediction ${index}:`, {
                  home: pred.home,
                  away: pred.away,
                  bet: pred.bet,
                  betType: pred.betType,
                  prediction: pred.prediction,
                  confidence: pred.confidence,
                });
              }
              // Check if match has been played - only when homeScore and awayScore both exist
              const matchPlayed = pred.homeScore !== undefined && pred.homeScore !== null && 
                                  pred.awayScore !== undefined && pred.awayScore !== null;
              
              // Determine status - only 'won' or 'lost' if match has been played
              let status: 'won' | 'lost' | 'pending' = 'pending';
              
              if (matchPlayed) {
                // Match has been played, determine result
                if (pred.status) {
                  if (pred.status === 'WON' || pred.status === 'won') {
                    status = 'won';
                  } else if (pred.status === 'FAILED' || pred.status === 'lost' || pred.status === 'LOST') {
                    status = 'lost';
                  }
                } else {
                  // Calculate status based on total goals and bet type
                  const totalGoals = pred.totalGoals !== undefined && pred.totalGoals !== null 
                    ? pred.totalGoals 
                    : (pred.homeScore + pred.awayScore);
                  
                  if (totalGoals !== null && totalGoals !== undefined) {
                    const betType = pred.betType || 'Over 1.5 Goals';
                    if (betType.includes('1.5')) {
                      status = totalGoals > 1.5 ? 'won' : 'lost';
                    } else if (betType.includes('2.5')) {
                      status = totalGoals > 2.5 ? 'won' : 'lost';
                    }
                  }
                }
              } else {
                // Match hasn't been played yet
                status = 'pending';
              }
              
              // Format score - only show if match has been played
              let scoreStr: string | undefined = undefined;
              if (matchPlayed) {
                // Prefer result field, then formatted score, then score number
                if (pred.result) {
                  scoreStr = pred.result;
                } else if (pred.homeScore !== undefined && pred.awayScore !== undefined) {
                  scoreStr = `${pred.homeScore} - ${pred.awayScore}`;
                } else if (pred.score !== undefined && pred.score !== null) {
                  scoreStr = String(pred.score);
                }
              }
              
              // Format predicted score
              let predictedScoreStr: string | undefined = undefined;
              if (pred.predictedScore) {
                predictedScoreStr = pred.predictedScore;
              } else if (pred.ms1 !== undefined && pred.ms0 !== undefined) {
                predictedScoreStr = `${pred.ms1} - ${pred.ms0}`;
              }
              
              // Get prediction text - check multiple possible field names
              // Ensure we always have a prediction text, even if it's the default
              let predictionText = pred.bet || pred.betType || pred.prediction;
              
              // If prediction text is empty, null, or undefined, use default
              if (!predictionText || predictionText.trim() === '') {
                predictionText = 'Over 1.5 Goals';
              }
              
              // Get confidence - handle various formats like "Score: 50.0", "85%", "85", etc.
              let confidence = 85; // default
              if (pred.confidence) {
                const confStr = String(pred.confidence);
                // If it's in format "Score: 50.0", extract the number
                const scoreMatch = confStr.match(/Score:\s*(\d+\.?\d*)/i);
                if (scoreMatch) {
                  const score = parseFloat(scoreMatch[1]);
                  // Convert score to confidence percentage (assuming score is 0-100)
                  confidence = Math.round(score);
                } else {
                  // Try to extract number from string (handles "85%", "85", etc.)
                  const numMatch = confStr.match(/(\d+)/);
                  if (numMatch) {
                    confidence = parseInt(numMatch[1], 10);
                  }
                }
              }
              // Ensure confidence is between 0-100
              confidence = Math.max(0, Math.min(100, isNaN(confidence) ? 85 : confidence));
              
              const result = {
                id: pred.id || `${pred.home}-vs-${pred.away}`,
                home: getDisplayName(pred.home || ''),
                away: getDisplayName(pred.away || ''),
                league: pred.league || 'Unknown League',
                prediction: predictionText,
                confidence: confidence,
                status,
                score: scoreStr,
                predictedScore: predictedScoreStr,
                time: pred.time || pred.timeLabel,
                timeLabel: pred.timeLabel || pred.time,
                matchDate: pred.matchDate,
              };
              
              // Debug logging for first few items
              if (index < 3) {
                console.log(`[Predictions] Transformed prediction ${index}:`, {
                  prediction: result.prediction,
                  confidence: result.confidence,
                  status: result.status,
                });
              }
              
              return result;
            });
            
            setPredictions(transformed);
            console.log(`✅ Loaded ${transformed.length} predictions from API`);
          } else {
            console.warn('Unexpected API response format:', data);
            setPredictions([]);
          }
        }
      } catch (error) {
        console.error('Error fetching predictions:', error);
        if (!cancelled) {
          setPredictions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    
    fetchPredictions();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const checkScroll = () => {
      if (daysScrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = daysScrollRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    checkScroll();
    const container = daysScrollRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, []);

  // Group predictions by day
  const groupedPredictions = useMemo(() => {
    return groupPredictionsByDay(predictions);
  }, [predictions]);

  // Get available days (days that have predictions)
  const availableDays = useMemo(() => {
    const days = Object.keys(groupedPredictions);
    // Sort days according to DAYS order
    return DAYS.filter(day => days.includes(day));
  }, [groupedPredictions]);

  // Set active day to first available day if current active day has no data
  useEffect(() => {
    if (!loading && availableDays.length > 0 && !availableDays.includes(activeDay)) {
      setActiveDay(availableDays[0]);
    }
  }, [loading, availableDays, activeDay]);

  const activeDayData = groupedPredictions[activeDay] || [];

  const total = activeDayData.length || 0;
  const won = activeDayData.filter(p => p.status === 'won').length;
  const lost = activeDayData.filter(p => p.status === 'lost').length;
  const pending = activeDayData.filter(p => p.status === 'pending').length;
  
  // Calculate accuracy based on completed matches (won + lost)
  // Show accuracy even when there are pending matches
  const completedMatches = won + lost;
  const winRate = completedMatches > 0 ? Math.round((won / completedMatches) * 100) : 0;
  
  // Debug logging for stats
  if (activeDayData.length > 0) {
    console.log(`[Stats] Day: ${activeDay}, Total: ${total}, Won: ${won}, Lost: ${lost}, Pending: ${pending}, Accuracy: ${winRate}%`);
  }

  return (
    <div className="p-4 md:p-8 max-w-[2400px] mx-auto">
      <div className="mb-4 sm:mb-6">
        <div className="mb-3 sm:mb-4 flex items-center justify-between">
          <div>
            <h1 className={`text-lg sm:text-xl md:text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Daily Football Tips
            </h1>
            <p className={`text-xs sm:text-sm mt-1 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Expert predictions and daily football tips with over 1.5 goals analysis.
            </p>
          </div>
          <div className="flex items-center gap-2 lg:hidden">
          <button
            aria-label="Scroll days left"
            type="button"
            onClick={() => scrollDays('left')}
            disabled={!canScrollLeft}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
              darkMode
                ? 'border-white/15 bg-white/5 text-white hover:bg-white/10 active:bg-white/20 hover:border-white/25'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:bg-slate-100 hover:border-slate-300'
            }`}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            aria-label="Scroll days right"
            type="button"
            onClick={() => scrollDays('right')}
            disabled={!canScrollRight}
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

      <div className="mb-6 sm:mb-8">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : availableDays.length > 0 ? (
          <div ref={daysScrollRef} className={`flex gap-2 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x pb-2 ${darkMode ? '' : ''}`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
            {availableDays.map(day => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`px-4 py-2.5 sm:px-6 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 min-h-[44px] border shadow-sm hover:shadow-md ${
                  activeDay === day 
                  ? (darkMode 
                      ? 'bg-violet-500/15 text-violet-300 border-violet-500/50 shadow-lg shadow-violet-500/20' 
                      : 'bg-violet-50 text-violet-700 border-violet-300 shadow-md') 
                  : (darkMode 
                      ? 'text-slate-300 border-white/10 hover:text-white hover:bg-white/10 hover:border-white/15' 
                      : 'text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300')
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500">
            No predictions available
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className={`p-5 rounded-2xl border flex flex-col items-center justify-center gap-1 shadow-md ${darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'}`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}><LayoutList size={12}/> Matches</span>
          <span className={`text-3xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>{total}</span>
        </div>
        <div className={`p-5 rounded-2xl border flex flex-col items-center justify-center gap-1 shadow-md ${darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'}`}>
          <span className="text-green-500 text-[10px] uppercase font-bold tracking-wider flex items-center gap-2"><CheckCircle size={12}/> Won</span>
          <span className="text-3xl font-black tracking-tighter text-green-500">{won}</span>
        </div>
        <div className={`p-5 rounded-2xl border flex flex-col items-center justify-center gap-1 shadow-md ${darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'}`}>
          <span className="text-red-500 text-[10px] uppercase font-bold tracking-wider flex items-center gap-2"><XCircle size={12}/> Lost</span>
          <span className="text-3xl font-black tracking-tighter text-red-500">{lost}</span>
        </div>
        <div className={`p-5 rounded-2xl border flex flex-col items-center justify-center gap-1 shadow-md ${darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'}`}>
          <span className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-2 ${completedMatches === 0 ? 'text-slate-400' : 'text-violet-500'}`}><Target size={12}/> Accuracy</span>
          <span className={`text-3xl font-black tracking-tighter ${completedMatches === 0 ? 'text-slate-400' : 'text-violet-500'}`}>{completedMatches === 0 ? '--' : `${winRate}%`}</span>
        </div>
      </div>

      {activeDayData.length > 0 ? (
        <div className={`grid grid-cols-1 ${isCollapsed ? 'md:grid-cols-2' : 'md:grid-cols-1 lg:grid-cols-2'} xl:grid-cols-3 2xl:grid-cols-4 gap-6`}>
          {activeDayData.map((pred, idx) => (
            <div key={idx} className={`p-6 rounded-2xl border transition-all hover:-translate-y-1 group shadow-md hover:shadow-xl ${darkMode ? 'bg-slate-900/60 border-white/10 hover:border-violet-500/40' : 'bg-white border-slate-200 hover:border-violet-300'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <h4 className={`font-bold leading-tight tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    <span className="truncate block">{pred.home}</span>
                    <span className="text-slate-400 font-normal text-xs"> vs </span>
                    <span className="truncate block">{pred.away}</span>
                  </h4>
                  <p className={`text-xs font-medium mt-1 truncate ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{pred.league} • {pred.time || pred.timeLabel || 'FT'}</p>
                </div>
              </div>

              <div className="py-4 border-t border-dashed border-slate-200 dark:border-white/10 mb-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Prediction</span>
                  <div className="flex items-center gap-2 text-violet-500 dark:text-violet-400">
                    <Target size={14} />
                    <span className="text-xs font-bold font-mono">{pred.predictedScore}</span>
                  </div>
                </div>
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl font-bold shadow-sm ${darkMode ? 'bg-violet-500/15 text-violet-300 border border-violet-500/30' : 'bg-violet-50 text-violet-700 border border-violet-200 shadow-md'}`}>
                  <span>{pred.prediction || 'Over 1.5 Goals'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded bg-white/10`}>{pred.confidence || 85}%</span>
                </div>
              </div>

              {pred.status !== 'pending' ? (
                <div className={`flex items-center justify-between rounded-xl p-3 border shadow-sm ${
                  darkMode 
                    ? 'bg-slate-800/60 border-slate-700/60' 
                    : 'bg-slate-50 border-slate-200 shadow-md'
                }`}>
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                      darkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}>Result</span>
                    <span className={`font-bold font-mono text-sm ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}>{(pred as any).score || '-'}</span>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg font-bold text-xs uppercase flex items-center gap-1.5 border ${
                    pred.status === 'won' 
                      ? (darkMode 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                          : 'bg-green-50 text-green-700 border-green-200')
                      : (darkMode 
                          ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                          : 'bg-red-50 text-red-700 border-red-200')
                  }`}>
                    {pred.status === 'won' ? <Check size={12}/> : <X size={12}/>} {pred.status === 'won' ? 'WON' : 'LOST'}
                  </div>
                </div>
              ) : (
                <div className={`flex items-center justify-center p-3 rounded-xl border ${
                  darkMode 
                    ? 'bg-slate-800/30 border-slate-700/30' 
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-full ${darkMode ? 'bg-violet-500/10 text-violet-400' : 'bg-violet-100 text-violet-600'}`}>
                      <Hourglass size={14} />
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      darkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}>Waiting for Result</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 opacity-50 text-center px-4">
          <div className="relative mb-4 hourglass-container">
            <Hourglass size={48} className="text-slate-400 relative z-10"/>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="hourglass-sand-flow"></div>
            </div>
          </div>
          <p className="text-base sm:text-lg font-medium">{activeDay} predictions are not yet available.</p>
          <button className="mt-4 text-violet-500 font-bold text-sm hover:underline" onClick={() => setActiveDay('Wed')}>Back to Today</button>
        </div>
      )}
    </div>
  );
}

