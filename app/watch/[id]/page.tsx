'use client';

import LoadingSpinner from '@/app/components/LoadingSpinner';
import { useDarkMode } from '@/app/contexts/DarkModeContext';
import { useSidebar } from '@/app/contexts/SidebarContext';
import { getMatches, getStreams } from '@/app/services/streamedApi';
import type { APIMatch, APIStream } from '@/app/types/streamed';
import type { Match } from '@/app/utils/matchTransform';
import { transformMatches } from '@/app/utils/matchTransform';
import { ArrowRight, Check, ChevronDown, Maximize2, MessageSquare, Minimize2, Play, Radio, Send, X } from 'lucide-react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// Map source names to LLM names
const SOURCE_TO_LLM: Record<string, string> = {
  'admin': 'GPT-5',
  'alpha': 'Claude',
  'bravo': 'Gemini',
  'charlie': 'Llama',
  'delta': 'Mistral',
  'echo': 'GPT-4',
  'foxtrot': 'Claude-3',
  'golf': 'Gemini-Pro',
  'intel': 'GPT-3.5',
};

// Generate unique ID for streams
let streamIdCounter = 0;
function generateUniqueStreamId(): string {
  return `stream-${Date.now()}-${++streamIdCounter}`;
}

export default function WatchPage() {
  const { darkMode } = useDarkMode();
  const { setAutoCollapseOnWatch } = useSidebar();
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;
  const [match, setMatch] = useState<Match | null>(null);
  const [apiMatch, setApiMatch] = useState<APIMatch | null>(null);
  const [related, setRelated] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streams, setStreams] = useState<APIStream[]>([]);
  const [streamsLoading, setStreamsLoading] = useState(false);
  const [streamSwitching, setStreamSwitching] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const [streamSource, setStreamSource] = useState<APIStream | null>(null);
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [isTheaterStreamMenuOpen, setIsTheaterStreamMenuOpen] = useState(false);
  const [isTheaterModeExiting, setIsTheaterModeExiting] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, user: 'SoccerFan99', text: 'Kickoff! Lets go!', time: '00:00', avatarColor: 'bg-blue-500' },
  ]);
  const [timeRemaining, setTimeRemaining] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoTime, setVideoTime] = useState(0);
  const [wasPlaying, setWasPlaying] = useState(false);
  const shouldSyncRef = useRef(false);
  const sourceMenuRef = useRef<HTMLDivElement>(null);
  const theaterStreamMenuRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sourceMenuRef.current && !sourceMenuRef.current.contains(event.target as Node)) {
        setIsSourceMenuOpen(false);
      }
      if (theaterStreamMenuRef.current && !theaterStreamMenuRef.current.contains(event.target as Node)) {
        setIsTheaterStreamMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Prevent body scroll when theater mode is open
  useEffect(() => {
    if (theaterMode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [theaterMode]);

  // Sync video state when switching between modes (only when theaterMode changes and we need to sync)
  useEffect(() => {
    if (shouldSyncRef.current && videoRef.current && videoTime > 0) {
      // Small delay to ensure video element is ready
      const timer = setTimeout(() => {
        if (videoRef.current && shouldSyncRef.current) {
          videoRef.current.currentTime = videoTime;
          if (wasPlaying && videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
          } else if (!wasPlaying && !videoRef.current.paused) {
            videoRef.current.pause();
          }
          shouldSyncRef.current = false; // Reset flag after syncing
        }
      }, 150);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theaterMode]); // Only sync when theaterMode changes, not on every videoTime update

  // Auto-collapse sidebar on ALL screen sizes when watch page opens
  useEffect(() => {
    // Immediately trigger sidebar collapse when watch page opens
    setAutoCollapseOnWatch(true);

    // Clean up when leaving the page
    return () => {
      setAutoCollapseOnWatch(false);
    };
  }, [setAutoCollapseOnWatch]);

  // Fetch match from API
  useEffect(() => {
    let isMounted = true;

    const fetchMatch = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch all matches to find the one we need
        const [liveMatches, todayMatches, allMatches] = await Promise.all([
          getMatches('live').catch(() => []),
          getMatches('all-today').catch(() => []),
          getMatches('all').catch(() => []),
        ]);

        if (!isMounted) return;

        // Transform all matches
        const transformedLive = transformMatches(liveMatches, true);
        const transformedToday = transformMatches(todayMatches);
        const transformedAll = transformMatches(allMatches);

        // Combine matches, removing duplicates
        // Create a set of live match IDs to preserve their live status
        const liveMatchIds = new Set(transformedLive.map(m => m.id));
        
        const allMatchesMap = new Map<string, Match>();
        transformedAll.forEach(m => allMatchesMap.set(m.id, m));
        transformedToday.forEach(m => allMatchesMap.set(m.id, m));
        transformedLive.forEach(m => allMatchesMap.set(m.id, m));

        // Recalculate status based on actual match time, BUT preserve live status for matches from live endpoint
        const now = Date.now();
        const sixHoursAgo = now - (6 * 60 * 60 * 1000);
        const combinedMatches = Array.from(allMatchesMap.values()).map(m => {
          // If match came from live endpoint, always keep it as live (trust the API)
          if (liveMatchIds.has(m.id)) {
            return { ...m, status: 'live' as const };
          }
          
          if (!m.date) return m;
          
          // Recalculate status based on actual time for non-live matches
          if (m.date > now) {
            return { ...m, status: 'upcoming' as const };
          } else if (m.date >= sixHoursAgo && m.date <= now) {
            return { ...m, status: 'live' as const };
          } else {
            return { ...m, status: 'ended' as const };
          }
        });

        // Also create a map of API matches for accessing sources
        const allApiMatches = [...allMatches, ...todayMatches, ...liveMatches];
        const apiMatchesMap = new Map<string, APIMatch>();
        allApiMatches.forEach(m => {
          if (m && m.id) {
            apiMatchesMap.set(m.id, m);
          }
        });

        // Find the match by ID - try exact match first, then try to match by extracting ID from slug
        let foundMatch = combinedMatches.find(m => m.id === matchId);
        let foundApiMatch: APIMatch | undefined;
        
        // If not found, try to extract ID from slug format (e.g., "1763766000000-limache-union-espanola")
        if (!foundMatch && matchId.includes('-')) {
          const possibleId = matchId.split('-')[0];
          foundMatch = combinedMatches.find(m => m.id === possibleId || m.id === matchId);
        }
        
        // Also try matching by checking if the ID contains the match ID
        if (!foundMatch) {
          foundMatch = combinedMatches.find(m => 
            matchId.includes(m.id) || m.id.includes(matchId)
          );
        }

        if (foundMatch) {
          setMatch(foundMatch);
          // Get the original API match to access sources
          foundApiMatch = apiMatchesMap.get(foundMatch.id);
          if (foundApiMatch) {
            setApiMatch(foundApiMatch);
          }
          // Get related matches (same sport, different ID)
          const relatedMatches = combinedMatches
            .filter(m => m.id !== foundMatch.id && m.sport === foundMatch.sport)
            .slice(0, 6);
          setRelated(relatedMatches);
        } else {
          setError('Match not found');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching match:', err);
        setError('Failed to load match. Please try again later.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (matchId) {
      fetchMatch();
    }

    return () => {
      isMounted = false;
    };
  }, [matchId]);

  // Fetch streams when API match is available (only for live matches)
  useEffect(() => {
    // Don't fetch streams for ended or upcoming matches
    if (match?.status !== 'live') {
      setStreamsLoading(false);
      setStreams([]);
      setStreamSource(null);
      return;
    }

    if (!apiMatch || apiMatch.sources.length === 0) {
      setStreamsLoading(false);
      return;
    }

    let isMounted = true;
    setStreamsLoading(true);

    const fetchStreams = async () => {
      // Try all available sources and combine all streams
      const allStreams: (APIStream & { uniqueId: string; llmName: string })[] = [];
      
      // Fetch from all sources in parallel for faster loading
      const streamPromises = apiMatch.sources.map(async (source) => {
        try {
          const fetchedStreams = await getStreams(source.source, source.id);
          if (fetchedStreams && fetchedStreams.length > 0) {
            // Get LLM name for this source
            const llmName = SOURCE_TO_LLM[source.source.toLowerCase()] || source.source;
            
            // Map each stream with unique ID and LLM name
            return fetchedStreams.map(stream => ({
              ...stream,
              uniqueId: generateUniqueStreamId(),
              llmName,
            }));
          }
          return [];
        } catch (error) {
          console.error(`Error fetching streams from ${source.source}:`, error);
          return [];
        }
      });

      // Wait for all sources to complete
      const results = await Promise.allSettled(streamPromises);
      
      if (!isMounted) return;

      // Combine all successful stream results
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allStreams.push(...result.value);
        }
      });

      if (allStreams.length > 0) {
        setStreams(allStreams);
        // Set the first stream as default
        setStreamSwitching(true);
        setIframeLoaded(false);
        setStreamSource(allStreams[0]);
        setStreamsLoading(false);
      } else {
        // No sources had streams
        setStreams([]);
        setStreamSource(null);
        setStreamsLoading(false);
      }
    };

    fetchStreams();

    // For live matches, retry fetching streams every 30 seconds
    let retryInterval: NodeJS.Timeout | null = null;
    if (match?.status === 'live') {
      retryInterval = setInterval(() => {
        if (isMounted && apiMatch && streams.length === 0) {
          fetchStreams();
        }
      }, 30000); // Retry every 30 seconds
    }

    return () => {
      isMounted = false;
      if (retryInterval) {
        clearInterval(retryInterval);
      }
    };
  }, [apiMatch, match?.status, streams.length]);

  // Reset iframe loaded state when stream source changes
  useEffect(() => {
    if (streamSource) {
      setIframeLoaded(false);
      setStreamSwitching(true);
    }
  }, [streamSource?.embedUrl]);

  useEffect(() => {
    if (match?.status === 'upcoming' && match.date) {
      const calculateTimeRemaining = () => {
        if (!match.date) return;
        
        const now = Date.now();
        const matchTime = match.date;
        const diff = matchTime - now;
        
        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeRemaining({ hours, minutes, seconds });
        } else {
          setTimeRemaining(null);
        }
      };

      calculateTimeRemaining();
      const interval = setInterval(calculateTimeRemaining, 1000);

      return () => clearInterval(interval);
    } else {
      setTimeRemaining(null);
    }
  }, [match]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner darkMode={darkMode} />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <p className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          {error || 'Match not found'}
        </p>
        <button
          onClick={() => router.push('/')}
          className={`px-4 py-2 rounded-lg font-semibold transition-all ${
            darkMode
              ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          Go to Home
        </button>
      </div>
    );
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    
    const newMessage = {
      id: chatMessages.length + 1,
      user: 'You',
      text: chatMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatarColor: 'bg-indigo-600',
      isMe: true
    };
    
    setChatMessages([...chatMessages, newMessage]);
    setChatMessage('');
  };

  return (
    <div className={`flex flex-col h-full animate-in fade-in duration-500 ${darkMode ? 'bg-slate-950' : 'bg-slate-50'} relative`}>
      {/* Full page loading overlay when streams are loading */}
      {streamsLoading && match && match.status === 'live' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-lg">
          <div className="text-center">
            <LoadingSpinner darkMode={darkMode} compact={false} />
            <p className={`mt-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Loading stream...
            </p>
          </div>
        </div>
      )}
      
      <div className={`flex items-center justify-between p-3 sm:p-4 border-b backdrop-blur-md sticky top-0 z-40 transition-all duration-500 ease-in-out shrink-0 shadow-sm ${darkMode ? 'border-white/10 bg-slate-900/90 shadow-black/30' : 'border-slate-200 bg-white/95 shadow-slate-200/50'}`}>
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push('/');
            }}
            className={`p-1.5 sm:p-2 rounded-full transition-all hover:scale-110 ${darkMode ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
            type="button"
          >
            <X size={16} className="sm:w-5 sm:h-5" />
          </button>
          <div>
            <h2 className={`text-sm sm:text-lg font-bold flex items-center gap-1.5 sm:gap-2 tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              <span className="text-xs sm:text-base">{match.home}</span> <span className={`text-[10px] sm:text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>vs</span> <span className="text-xs sm:text-base">{match.away}</span>
            </h2>
            <div className={`flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {match.status === 'live' ? (
                <>
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/> LIVE
                </>
              ) : match.status === 'upcoming' ? (
                <>
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"/> Starts at {match.time}
                </>
              ) : match.status === 'ended' ? (
                <>
                  <span className="w-2 h-2 bg-slate-400 rounded-full"/> ENDED
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-slate-400 rounded-full"/> {match.time}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`flex-1 flex flex-col lg:flex-row transition-all duration-500 ease-in-out watch-page-main-container min-h-0`}>
        <div className={`flex-1 flex flex-col transition-all duration-500 ease-in-out p-3 sm:p-4 lg:p-6 gap-2 sm:gap-4`}>
          {!theaterMode && (
            <>
              {match.status === 'upcoming' && timeRemaining ? (
                /* Timer Card for Upcoming Matches */
                <div className={`w-full max-w-full ${darkMode ? 'bg-slate-900' : 'bg-slate-50'} relative group transition-all duration-500 ease-in-out aspect-video rounded-xl shadow-2xl ring-1 ring-white/10 overflow-hidden flex items-center justify-center`}>
                  <div className={`text-center px-6 sm:px-8 md:px-12 py-8 sm:py-12 rounded-2xl ${darkMode ? 'bg-slate-800/90' : 'bg-white/95'} backdrop-blur-md border ${darkMode ? 'border-white/10' : 'border-slate-200'} shadow-2xl max-w-2xl w-full mx-4`}>
                    <div className="mb-6">
                      <p className={`text-sm sm:text-base font-medium uppercase tracking-wider mb-4 sm:mb-6 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Match Starts In
                      </p>
                      <div className="flex items-center justify-center gap-3 sm:gap-4 md:gap-6">
                        <div className="flex flex-col items-center">
                          <div className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black ${darkMode ? 'text-white' : 'text-slate-900'} mb-2 tabular-nums`}>
                            {String(timeRemaining.hours).padStart(2, '0')}
                          </div>
                          <div className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            Hours
                          </div>
                        </div>
                        <div className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold ${darkMode ? 'text-slate-600' : 'text-slate-400'} pb-6 sm:pb-8`}>
                          :
                        </div>
                        <div className="flex flex-col items-center">
                          <div className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black ${darkMode ? 'text-white' : 'text-slate-900'} mb-2 tabular-nums`}>
                            {String(timeRemaining.minutes).padStart(2, '0')}
                          </div>
                          <div className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            Minutes
                          </div>
                        </div>
                        <div className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold ${darkMode ? 'text-slate-600' : 'text-slate-400'} pb-6 sm:pb-8`}>
                          :
                        </div>
                        <div className="flex flex-col items-center">
                          <div className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black ${darkMode ? 'text-white' : 'text-slate-900'} mb-2 tabular-nums`}>
                            {String(timeRemaining.seconds).padStart(2, '0')}
                          </div>
                          <div className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            Seconds
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {match.time === 'Tomorrow' ? 'Scheduled for Tomorrow' : `Scheduled for ${match.time}`}
                    </div>
                  </div>
                </div>
              ) : (
                /* Video Player for Live/Ended Matches */
                <div className={`w-full max-w-full bg-black relative group transition-all duration-500 ease-in-out aspect-video rounded-xl shadow-2xl ring-1 ${darkMode ? 'ring-white/15' : 'ring-slate-300/30'} overflow-hidden`}>
                  {streamsLoading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <LoadingSpinner darkMode={darkMode} compact={true} />
                    </div>
                  ) : streamSource?.embedUrl ? (
                    <div className="relative w-full h-full">
                      {streamSwitching && !iframeLoaded && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl">
                          <div className="text-center">
                            <LoadingSpinner darkMode={darkMode} compact={false} />
                            <p className={`mt-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-300'}`}>
                              Loading stream...
                            </p>
                          </div>
                        </div>
                      )}
                      <iframe
                        title={`${match.home} vs ${match.away} Stream`}
                        src={streamSource.embedUrl}
                        className="w-full h-full rounded-xl"
                        scrolling="no"
                        allowFullScreen
                        allow="encrypted-media; picture-in-picture; autoplay; clipboard-write;"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        marginHeight={0}
                        marginWidth={0}
                        onLoad={() => {
                          setIframeLoaded(true);
                          setStreamSwitching(false);
                        }}
                      />
                    </div>
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'text-white' : 'text-slate-300'}`}>
                      <div className="text-center px-4">
                        <p className="text-sm font-medium mb-2">
                          {match.status === 'live' ? 'Stream loading...' : 'No stream available'}
                        </p>
                        <p className="text-xs opacity-75">
                          {match.status === 'live' 
                            ? 'Please wait while we load the stream. If it doesn\'t appear, try refreshing the page.'
                            : match.status === 'ended'
                            ? 'This match has ended. Streams are no longer available.'
                            : 'Streams will be available when the match goes live'}
                        </p>
                        {match.status === 'live' && apiMatch && apiMatch.sources.length > 0 && (
                          <button
                            onClick={() => {
                              setStreamsLoading(true);
                              // Retry fetching streams from all sources
                              const fetchStreams = async () => {
                                const allStreams: APIStream[] = [];
                                
                                // Fetch from all sources in parallel
                                const streamPromises = apiMatch.sources.map(async (source) => {
                                  try {
                                    const fetchedStreams = await getStreams(source.source, source.id);
                                    if (fetchedStreams && fetchedStreams.length > 0) {
                                      // Get LLM name for this source
                                      const llmName = SOURCE_TO_LLM[source.source.toLowerCase()] || source.source;
                                      
                                      // Map each stream with unique ID and LLM name
                                      return fetchedStreams.map(stream => ({
                                        ...stream,
                                        uniqueId: generateUniqueStreamId(),
                                        llmName,
                                      }));
                                    }
                                    return [];
                                  } catch (error) {
                                    console.error(`Error fetching streams from ${source.source}:`, error);
                                    return [];
                                  }
                                });

                                // Wait for all sources to complete
                                const results = await Promise.allSettled(streamPromises);
                                
                                // Combine all successful stream results
                                results.forEach((result) => {
                                  if (result.status === 'fulfilled' && result.value.length > 0) {
                                    allStreams.push(...result.value);
                                  }
                                });

                                if (allStreams.length > 0) {
                                  setStreams(allStreams);
                                  setStreamSource(allStreams[0]);
                                } else {
                                  setStreams([]);
                                  setStreamSource(null);
                                }
                                setStreamsLoading(false);
                              };
                              fetchStreams();
                            }}
                            className={`mt-4 px-4 py-2 rounded-lg font-semibold text-xs transition-all ${
                              darkMode
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            Retry Loading Stream
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {match.status === 'ended' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-lg z-50 pointer-events-auto p-2 sm:p-4 md:p-6">
                      <div className={`text-center px-3 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8 rounded-xl sm:rounded-2xl md:rounded-3xl ${darkMode ? 'bg-slate-900/98' : 'bg-white'} backdrop-blur-xl border-2 ${darkMode ? 'border-white/20' : 'border-slate-200'} shadow-2xl w-full max-w-[280px] sm:max-w-md md:max-w-lg mx-2 sm:mx-4`}>
                        <div className="mb-3 sm:mb-5 md:mb-6">
                          <div className={`w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4 ${darkMode ? 'bg-slate-800/80' : 'bg-slate-100'} shadow-lg`}>
                            <Play size={18} className="sm:w-6 sm:h-6 md:w-7 md:h-7" style={{ width: '18px', height: '18px' }} fill={darkMode ? '#cbd5e1' : '#475569'} />
                    </div>
                          <p className={`text-xs sm:text-base md:text-lg font-bold mb-1.5 sm:mb-3 ${darkMode ? 'text-white' : 'text-slate-900'} leading-tight`}>
                      Stream Has Ended
                    </p>
                          <p className={`text-[10px] sm:text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'} mb-3 sm:mb-5 md:mb-6 px-1 leading-relaxed`}>
                      This match has finished. Check out live matches happening now!
                    </p>
                    <button
                      onClick={() => router.push('/popular?status=live')}
                            className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-[11px] sm:text-xs md:text-sm transition-all duration-200 hover:scale-105 active:scale-95 mx-auto w-auto ${
                        darkMode
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-md shadow-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/60'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/50 hover:shadow-lg hover:shadow-emerald-600/60'
                      }`}
                    >
                            <Play size={12} className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" fill="currentColor" />
                            <span>View Live Matches</span>
                            <ArrowRight size={12} className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                    </button>
                  </div>
                </div>
              </div>
                  )}
                </div>
              )}
            </>
          )}

            <div className="flex items-center justify-start sm:justify-between w-full">
              {/* Stream Selector Dropdown - On left for mobile */}
              {match.status !== 'upcoming' && (
                <div className="relative flex items-center gap-2" ref={sourceMenuRef}>
                  <span className={`text-[10px] sm:text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Available Streams:
                  </span>
                  <button
                    onClick={() => setIsSourceMenuOpen(!isSourceMenuOpen)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border transition-all text-xs sm:text-sm font-medium shadow-sm hover:shadow-md ${
                      darkMode
                        ? 'bg-white/10 border-white/15 text-slate-200 hover:bg-white/15 hover:border-emerald-500/40'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-emerald-300'
                    }`}
                  >
                    <Radio size={12} className="sm:w-4 sm:h-4" />
                    <span className="text-[10px] sm:text-sm">
                      {streamSource ? ((streamSource as any).llmName || streamSource.source) : 'Loading...'}
                    </span>
                    <ChevronDown size={12} className={`sm:w-4 sm:h-4 transition-transform duration-200 ${isSourceMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isSourceMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsSourceMenuOpen(false)} />
                      <div className={`absolute left-0 sm:right-0 mt-2 w-56 sm:w-64 rounded-xl border shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200 ${
                        darkMode
                          ? 'bg-slate-900/98 border-white/15 shadow-black/50'
                          : 'bg-white/98 border-slate-200 shadow-slate-300/50'
                      }`}>
                        <div className="p-1.5 sm:p-2">
                          <div className={`px-2 sm:px-3 py-1 sm:py-2 mb-0.5 sm:mb-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            Stream Quality
                          </div>
                          {streamsLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <LoadingSpinner darkMode={darkMode} compact={true} />
                            </div>
                          ) : streams.length > 0 ? (
                            streams.map((stream) => {
                              const streamWithExtras = stream as APIStream & { uniqueId: string; llmName: string };
                              const streamUniqueId = streamWithExtras.uniqueId;
                              const currentUniqueId = streamSource ? (streamSource as any).uniqueId : null;
                              const isSelected = currentUniqueId === streamUniqueId;
                              
                              return (
                                <button
                                  key={streamUniqueId}
                                  onClick={() => {
                                    setStreamSwitching(true);
                                    setIframeLoaded(false);
                                    setStreamSource(stream);
                                    setIsSourceMenuOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-lg transition-all text-xs sm:text-sm font-medium text-left ${
                                    isSelected
                                      ? (darkMode
                                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm'
                                          : 'bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-sm')
                                      : (darkMode
                                          ? 'text-slate-300 hover:bg-white/5 hover:text-white'
                                          : 'text-slate-700 hover:bg-slate-50')
                                  }`}
                                >
                                  <Radio size={12} className={`sm:w-[14px] sm:h-[14px] ${isSelected ? 'opacity-100' : 'opacity-50'}`} />
                                  <span className="flex-1">
                                    {streamWithExtras.llmName} - {stream.language} {stream.hd ? 'HD' : 'SD'}
                                  </span>
                                  {isSelected && <Check size={14} className="sm:w-4 sm:h-4 text-emerald-500" />}
                                </button>
                              );
                            })
                          ) : (
                            <div className={`px-2 sm:px-3 py-4 text-center text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              No streams available
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Enter Theater Mode Button - Hidden on mobile */}
              <button
              onClick={() => {
                // Save current video state before switching
                if (videoRef.current) {
                  setVideoTime(videoRef.current.currentTime);
                  setWasPlaying(!videoRef.current.paused);
                  shouldSyncRef.current = true;
                }
                setIsTheaterModeExiting(false);
                setTheaterMode(true);
              }}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all duration-300 text-sm font-medium w-fit hover:scale-105 active:scale-95 shadow-sm hover:shadow-md ${
                  darkMode
                    ? 'bg-white/10 border-white/15 text-slate-200 hover:bg-white/15 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Maximize2 size={18} />
                <span>Enter Theater Mode</span>
              </button>
            </div>

            <div className="mt-2 sm:mt-4">
              {match.status === 'live' && (
                <div className={`mb-2 sm:mb-4 p-3 sm:p-4 rounded-xl border shadow-sm ${darkMode ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200 shadow-md'}`}>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      <MessageSquare size={16} className="sm:w-5 sm:h-5" />
                    </div>
                    <p className={`text-[10px] sm:text-sm font-medium ${darkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>
                      Join the live chat and share your thoughts as {match.home} takes on {match.away}
                    </p>
                  </div>
                </div>
              )}

              {match.status === 'upcoming' && (
                <div className={`mb-2 sm:mb-4 p-3 sm:p-4 rounded-xl border shadow-sm ${darkMode ? 'bg-blue-500/15 border-blue-500/30' : 'bg-blue-50 border-blue-200 shadow-md'}`}>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className={`text-xs sm:text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                      Streams will be available when the match goes live
                    </p>
                  </div>
                </div>
              )}
            </div>

          {/* Chat section - appears below Available Streams on 1024px and below */}
            <div className={`flex flex-col border overflow-hidden transition-all duration-500 ease-in-out mt-3 sm:mt-6 rounded-2xl shadow-xl xl:hidden ${darkMode ? 'bg-slate-900/60 border-white/15 shadow-black/30' : 'bg-white border-slate-200 shadow-slate-300/50'}`}>
              <div className={`p-3 sm:p-4 border-b font-bold text-xs sm:text-sm flex items-center justify-between rounded-t-2xl shadow-sm ${darkMode ? 'border-white/15 text-white bg-gradient-to-r from-slate-900/90 to-slate-800/90' : 'border-slate-200 text-slate-900 bg-gradient-to-r from-slate-50 to-white'}`}>
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-500/10">
                    <MessageSquare size={14} className="sm:w-4 sm:h-4 text-emerald-500" /> 
                  </div>
                  <span>Live Chat</span>
                </div>
                <span className={`text-[9px] sm:text-[10px] font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full ${darkMode ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-emerald-600 bg-emerald-50 border border-emerald-200'}`}>Top Chat</span>
              </div>
              <div className="flex flex-col max-h-[600px]">
                <div className="flex-1 p-3 sm:p-4 space-y-2 sm:space-y-4 overflow-y-auto custom-scrollbar min-h-[300px] pb-3 sm:pb-4">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex gap-2 sm:gap-3 ${(msg as any).isMe ? 'flex-row-reverse' : ''} group animate-in fade-in duration-200`}>
                      <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full shrink-0 flex items-center justify-center text-[10px] sm:text-xs font-bold text-white shadow-md ring-2 ring-white/20 ${msg.avatarColor}`}>
                        {msg.user[0]}
                      </div>
                      <div className={`flex flex-col ${(msg as any).isMe ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-baseline gap-1.5 sm:gap-2 mb-1 sm:mb-1.5">
                          <span className={`text-[10px] sm:text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{msg.user}</span>
                          <span className={`text-[9px] sm:text-[10px] opacity-0 group-hover:opacity-100 transition-opacity ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{msg.time}</span>
                        </div>
                        <div className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-xs sm:text-sm max-w-[85%] shadow-sm leading-relaxed transition-all ${(msg as any).isMe ? 'bg-emerald-600 text-white rounded-tr-sm hover:bg-emerald-500' : (darkMode ? 'bg-slate-800 text-slate-200 rounded-tl-sm hover:bg-slate-700' : 'bg-slate-100 text-slate-800 rounded-tl-sm hover:bg-slate-200')}`}>
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className={`p-3 sm:p-4 border-t flex items-center gap-2 sm:gap-2.5 rounded-b-2xl ${darkMode ? 'border-white/15 bg-slate-900/70' : 'border-slate-200 bg-slate-50'}`}>
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Type a message..."
                    className={`flex-1 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border text-xs sm:text-sm outline-none transition-all focus:ring-2 focus:ring-emerald-500/30 shadow-sm ${darkMode ? 'bg-slate-900 border-white/15 text-white placeholder:text-slate-400 focus:border-emerald-500/40' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-500 focus:border-emerald-500'}`}
                  />
                  <button type="submit" className="flex items-center justify-center p-2 sm:p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg shadow-emerald-500/30 aspect-square">
                    <Send size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                </form>
              </div>
            </div>
        </div>

        {/* Spacer to ensure chat is fully visible when scrolling */}
        <div className="pb-6 xl:hidden" />

        {/* Chat section - appears on the right side on screens larger than 1024px (xl and above) */}
        <div className={`hidden xl:flex flex-col border-t lg:border-t-0 lg:border-l overflow-hidden transition-all duration-500 ease-in-out chat-sidebar-large h-full shadow-lg ${darkMode ? 'bg-slate-900/50 border-white/10 shadow-black/30' : 'bg-white border-slate-200 shadow-slate-200/50'} opacity-100 translate-x-0 w-full lg:w-[380px] pointer-events-auto`}>
          <div className={`p-4 border-b font-bold text-sm flex items-center justify-between shrink-0 shadow-sm ${darkMode ? 'border-white/10 text-white bg-slate-900/70' : 'border-slate-200 text-slate-900 bg-white/80'}`}>
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-emerald-500" /> 
              <span>Live Chat</span>
            </div>
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${darkMode ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-emerald-600 bg-emerald-50 border border-emerald-200'}`}>Top Chat</span>
          </div>
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar min-h-0 pb-4">
              {chatMessages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${(msg as any).isMe ? 'flex-row-reverse' : ''} group animate-in fade-in duration-200`}>
                  <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-md ring-2 ring-white/20 ${msg.avatarColor}`}>
                    {msg.user[0]}
                  </div>
                  <div className={`flex flex-col ${(msg as any).isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-2 mb-1.5">
                      <span className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{msg.user}</span>
                      <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">{msg.time}</span>
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[85%] shadow-sm leading-relaxed transition-all ${(msg as any).isMe ? 'bg-emerald-600 text-white rounded-tr-sm hover:bg-emerald-500' : (darkMode ? 'bg-slate-800 text-slate-200 rounded-tl-sm hover:bg-slate-700' : 'bg-slate-100 text-slate-800 rounded-tl-sm hover:bg-slate-200')}`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className={`p-4 border-t flex items-center gap-2.5 shrink-0 ${darkMode ? 'border-white/15 bg-slate-900/70' : 'border-slate-200 bg-slate-50'}`}>
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type a message..."
                className={`flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-emerald-500/30 shadow-sm ${darkMode ? 'bg-slate-900 border-white/15 text-white placeholder:text-slate-400 focus:border-emerald-500/40' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-500 focus:border-emerald-500'}`}
              />
              <button type="submit" className="flex items-center justify-center p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all hover:scale-105 active:scale-95 shadow-md hover:shadow-lg shadow-emerald-500/30 aspect-square">
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Theater Mode Slide-Over */}
      {theaterMode && (
        <>
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 z-50 transition-all duration-500 ease-out ${
              isTheaterModeExiting 
                ? 'bg-black/0 backdrop-blur-0' 
                : 'bg-black/70 backdrop-blur-md'
            }`}
            onClick={() => {
              setIsTheaterModeExiting(true);
              setTimeout(() => {
                setTheaterMode(false);
                setIsTheaterModeExiting(false);
              }, 400);
            }}
          />
          
          {/* Slide-Over Panel */}
          <div className={`fixed inset-x-0 bottom-0 z-50 h-[98vh] max-h-[98vh] w-full flex flex-col ${darkMode ? 'bg-gradient-to-b from-slate-950 to-slate-900' : 'bg-gradient-to-b from-white to-slate-50'} rounded-t-3xl shadow-2xl border-t ${darkMode ? 'border-white/10' : 'border-slate-200'} theater-mode-panel ${
            isTheaterModeExiting ? 'theater-mode-exit-alt' : 'theater-mode-enter-alt'
          }`}>
            {/* Top Bar - Exit Button, Team Names, and Available Streams */}
            <div className={`flex-shrink-0 px-2 sm:px-3 lg:px-8 py-2 sm:py-2.5 lg:py-5 border-b ${darkMode ? 'bg-slate-950/95 border-white/10' : 'bg-white/95 border-slate-200'} backdrop-blur-xl shadow-lg theater-mode-top-bar relative z-20 ${
              isTheaterModeExiting ? 'opacity-0' : 'opacity-100'
            } transition-opacity duration-300 delay-200`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2 lg:gap-4">
                {/* Left Section - Exit Button */}
                <button
                  onClick={() => {
                    // Save current video state before switching
                    if (videoRef.current) {
                      setVideoTime(videoRef.current.currentTime);
                      setWasPlaying(!videoRef.current.paused);
                      shouldSyncRef.current = true;
                    }
                    // Trigger exit animation
                    setIsTheaterModeExiting(true);
                    setTimeout(() => {
                      setTheaterMode(false);
                      setIsTheaterModeExiting(false);
                    }, 400);
                  }}
                  className={`flex items-center gap-1 sm:gap-1.5 lg:gap-2 px-2 sm:px-2.5 lg:px-4 py-1 sm:py-1.5 lg:py-2.5 rounded-md sm:rounded-lg lg:rounded-xl border transition-all duration-300 font-medium text-[10px] sm:text-xs lg:text-sm hover:scale-105 active:scale-95 shadow-lg theater-mode-button ${
                    darkMode
                      ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30'
                      : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200 hover:border-slate-400'
                  }`}
                >
                  <Minimize2 size={12} className="sm:w-3 sm:h-3 lg:w-[18px] lg:h-[18px]" />
                  <span className="hidden sm:inline">Exit Theater Mode</span>
                  <span className="sm:hidden">Exit</span>
                </button>

                {/* Center Section - Team Names */}
                {match && (
                  <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-6 flex-1 justify-center theater-mode-teams">
                  {/* Home Team */}
                  <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-3">
                    <div className={`relative w-6 h-6 sm:w-8 sm:h-8 lg:w-14 lg:h-14 rounded-full ${darkMode ? 'bg-white/10' : 'bg-slate-100'} backdrop-blur-md p-0.5 sm:p-1 lg:p-2 flex items-center justify-center shadow-lg border ${darkMode ? 'border-white/20' : 'border-slate-200'} theater-mode-logo`}>
                      <Image src={match.homeLogo || '/no-image.png'} alt={match.home} fill className={match.homeLogo ? 'object-contain' : 'object-cover scale-150'} sizes="(max-width: 640px) 24px, (max-width: 1024px) 32px, 56px" />
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-[8px] sm:text-[9px] lg:text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'} leading-tight theater-mode-league`}>{match.league}</span>
                      <span className={`font-bold text-[10px] sm:text-xs lg:text-lg ${darkMode ? 'text-white' : 'text-slate-900'} leading-tight theater-mode-team-name`}>{match.home}</span>
                    </div>
                  </div>

                  {/* VS or LIVE Badge */}
                  <div className="flex items-center justify-center px-1 sm:px-1.5 lg:px-3">
                    {match.status === 'live' ? (
                      <div className={`flex items-center gap-0.5 sm:gap-1 lg:gap-2 px-1.5 sm:px-2 lg:px-4 py-0.5 sm:py-1 lg:py-2 rounded-full ${darkMode ? 'bg-red-500/20 border border-red-500/50' : 'bg-red-50 border border-red-200'} theater-mode-live`}>
                        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 lg:w-2 lg:h-2 bg-red-500 rounded-full animate-pulse"></span>
                        <span className={`text-[9px] sm:text-[10px] lg:text-sm font-bold ${darkMode ? 'text-white' : 'text-red-600'} theater-mode-live-text`}>LIVE</span>
                      </div>
                    ) : (
                      <div className={`text-[9px] sm:text-[10px] lg:text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'} theater-mode-vs`}>VS</div>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-3">
                    <div className="flex flex-col">
                      <span className={`text-[8px] sm:text-[9px] lg:text-xs font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'} leading-tight theater-mode-league`}>{match.league}</span>
                      <span className={`font-bold text-[10px] sm:text-xs lg:text-lg ${darkMode ? 'text-white' : 'text-slate-900'} leading-tight theater-mode-team-name`}>{match.away}</span>
                    </div>
                    <div className={`relative w-6 h-6 sm:w-8 sm:h-8 lg:w-14 lg:h-14 rounded-full ${darkMode ? 'bg-white/10' : 'bg-slate-100'} backdrop-blur-md p-0.5 sm:p-1 lg:p-2 flex items-center justify-center shadow-lg border ${darkMode ? 'border-white/20' : 'border-slate-200'} theater-mode-logo`}>
                      <Image src={match.awayLogo || '/no-image.png'} alt={match.away} fill className={match.awayLogo ? 'object-contain' : 'object-cover scale-150'} sizes="(max-width: 640px) 24px, (max-width: 1024px) 32px, 56px" />
                    </div>
                  </div>
                </div>
                )}

                {/* Right Section - Available Streams */}
                {match.status !== 'upcoming' && (
                  <div className="relative z-30" ref={theaterStreamMenuRef}>
                    <button
                      onClick={() => setIsTheaterStreamMenuOpen(!isTheaterStreamMenuOpen)}
                      className={`flex items-center gap-1 sm:gap-1.5 lg:gap-2 px-2 sm:px-2.5 lg:px-4 py-1 sm:py-1.5 lg:py-2.5 rounded-md sm:rounded-lg lg:rounded-xl border transition-all duration-300 font-medium text-[10px] sm:text-xs lg:text-sm hover:scale-105 active:scale-95 shadow-lg theater-mode-button ${
                        darkMode
                          ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30'
                          : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <Radio size={10} className="sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                      <span className="hidden sm:inline">Available Streams</span>
                      <span className="sm:hidden">Streams</span>
                      <ChevronDown size={10} className={`sm:w-3 sm:h-3 lg:w-4 lg:h-4 transition-transform duration-200 ${isTheaterStreamMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isTheaterStreamMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setIsTheaterStreamMenuOpen(false)} />
                        <div className={`absolute right-0 mt-2 w-48 sm:w-56 lg:w-64 rounded-lg sm:rounded-xl border shadow-2xl z-[70] overflow-visible backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200 ${
                          darkMode
                            ? 'bg-slate-900/95 border-white/20'
                            : 'bg-white/95 border-slate-200'
                        }`}>
                          <div className="p-1.5 sm:p-2">
                            <div className={`px-2 sm:px-3 py-1.5 sm:py-2 mb-0.5 sm:mb-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              Stream Quality
                            </div>
                            {streamsLoading ? (
                              <div className="flex items-center justify-center py-4">
                                <LoadingSpinner darkMode={darkMode} compact={true} />
                              </div>
                            ) : streams.length > 0 ? (
                              streams.map((stream) => {
                                const streamWithExtras = stream as APIStream & { uniqueId: string; llmName: string };
                                const streamUniqueId = streamWithExtras.uniqueId;
                                const currentUniqueId = streamSource ? (streamSource as any).uniqueId : null;
                                const isSelected = currentUniqueId === streamUniqueId;
                                
                                return (
                                  <button
                                    key={streamUniqueId}
                                    onClick={() => {
                                      setStreamSwitching(true);
                                      setIframeLoaded(false);
                                      setStreamSource(stream);
                                      setIsTheaterStreamMenuOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 lg:py-2.5 rounded-md sm:rounded-lg transition-all text-xs sm:text-sm font-medium text-left ${
                                      isSelected
                                        ? (darkMode
                                            ? 'bg-emerald-500/30 border border-emerald-400/50 text-emerald-100 shadow-sm'
                                            : 'bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-sm')
                                        : (darkMode
                                            ? 'text-slate-300 hover:bg-white/5 hover:text-white'
                                            : 'text-slate-700 hover:bg-slate-50')
                                    }`}
                                  >
                                    <Radio size={12} className={`sm:w-3.5 sm:h-3.5 lg:w-[14px] lg:h-[14px] ${isSelected ? 'opacity-100' : 'opacity-50'}`} />
                                    <span className="flex-1">
                                      {streamWithExtras.llmName} - {stream.language} {stream.hd ? 'HD' : 'SD'}
                                    </span>
                                    {isSelected && <Check size={12} className={`sm:w-4 sm:h-4 lg:w-4 lg:h-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-500'}`} />}
                                  </button>
                                );
                              })
                            ) : (
                              <div className={`px-2 sm:px-3 py-4 text-center text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                No streams available
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Content Area - Video Player or Timer */}
            <div className={`flex-1 min-h-0 overflow-hidden p-1.5 sm:p-2 lg:p-6 flex items-center justify-center relative z-10 ${
              isTheaterModeExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            } transition-all duration-300 delay-100`}>
              {match.status === 'upcoming' && timeRemaining ? (
                /* Timer Card for Upcoming Matches in Theater Mode */
                <div className={`w-full h-full max-h-full ${darkMode ? 'bg-slate-900' : 'bg-slate-50'} rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10 flex items-center justify-center`}>
                  <div className={`text-center px-6 sm:px-8 md:px-12 py-8 sm:py-12 rounded-2xl ${darkMode ? 'bg-slate-800/90' : 'bg-white/95'} backdrop-blur-md border ${darkMode ? 'border-white/10' : 'border-slate-200'} shadow-2xl max-w-3xl w-full mx-4`}>
                    <div className="mb-6">
                      <p className={`text-base sm:text-lg font-medium uppercase tracking-wider mb-4 sm:mb-6 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Match Starts In
                      </p>
                      <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-8">
                        <div className="flex flex-col items-center">
                          <div className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black ${darkMode ? 'text-white' : 'text-slate-900'} mb-2 tabular-nums`}>
                            {String(timeRemaining.hours).padStart(2, '0')}
                          </div>
                          <div className={`text-xs sm:text-sm font-medium uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            Hours
                          </div>
                        </div>
                        <div className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold ${darkMode ? 'text-slate-600' : 'text-slate-400'} pb-8`}>
                          :
                        </div>
                        <div className="flex flex-col items-center">
                          <div className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black ${darkMode ? 'text-white' : 'text-slate-900'} mb-2 tabular-nums`}>
                            {String(timeRemaining.minutes).padStart(2, '0')}
                          </div>
                          <div className={`text-xs sm:text-sm font-medium uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            Minutes
                          </div>
                        </div>
                        <div className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold ${darkMode ? 'text-slate-600' : 'text-slate-400'} pb-8`}>
                          :
                        </div>
                        <div className="flex flex-col items-center">
                          <div className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black ${darkMode ? 'text-white' : 'text-slate-900'} mb-2 tabular-nums`}>
                            {String(timeRemaining.seconds).padStart(2, '0')}
                          </div>
                          <div className={`text-xs sm:text-sm font-medium uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            Seconds
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm sm:text-base font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {match.time === 'Tomorrow' ? 'Scheduled for Tomorrow' : `Scheduled for ${match.time}`}
                    </div>
                  </div>
                </div>
              ) : (
                /* Video Player for Live/Ended Matches in Theater Mode */
                <div className="w-full h-full max-h-full bg-black rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10 flex items-center justify-center relative">
                  {streamsLoading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <LoadingSpinner darkMode={darkMode} compact={true} />
                    </div>
                  ) : streamSource?.embedUrl ? (
                    <div className="relative w-full h-full">
                      {streamSwitching && !iframeLoaded && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-xl sm:rounded-2xl">
                          <div className="text-center">
                            <LoadingSpinner darkMode={darkMode} compact={false} />
                            <p className={`mt-4 text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-300'}`}>
                              Loading stream...
                            </p>
                          </div>
                        </div>
                      )}
                      <iframe
                        title={`${match.home} vs ${match.away} Stream`}
                        src={streamSource.embedUrl}
                        className="w-full h-full rounded-xl sm:rounded-2xl"
                        scrolling="no"
                        allowFullScreen
                        allow="encrypted-media; picture-in-picture; autoplay; clipboard-write;"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        marginHeight={0}
                        marginWidth={0}
                        onLoad={() => {
                          setIframeLoaded(true);
                          setStreamSwitching(false);
                        }}
                      />
                    </div>
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'text-white' : 'text-slate-300'}`}>
                      <div className="text-center px-4">
                        <p className="text-sm font-medium mb-2">
                          {match.status === 'live' ? 'Stream loading...' : 'No stream available'}
                        </p>
                        <p className="text-xs opacity-75">
                          {match.status === 'live' 
                            ? 'Please wait while we load the stream. If it doesn\'t appear, try refreshing the page.'
                            : match.status === 'ended'
                            ? 'This match has ended. Streams are no longer available.'
                            : 'Streams will be available when the match goes live'}
                        </p>
                        {match.status === 'live' && apiMatch && apiMatch.sources.length > 0 && (
                          <button
                            onClick={() => {
                              setStreamsLoading(true);
                              // Retry fetching streams from all sources
                              const fetchStreams = async () => {
                                const allStreams: APIStream[] = [];
                                
                                // Fetch from all sources in parallel
                                const streamPromises = apiMatch.sources.map(async (source) => {
                                  try {
                                    const fetchedStreams = await getStreams(source.source, source.id);
                                    if (fetchedStreams && fetchedStreams.length > 0) {
                                      // Get LLM name for this source
                                      const llmName = SOURCE_TO_LLM[source.source.toLowerCase()] || source.source;
                                      
                                      // Map each stream with unique ID and LLM name
                                      return fetchedStreams.map(stream => ({
                                        ...stream,
                                        uniqueId: generateUniqueStreamId(),
                                        llmName,
                                      }));
                                    }
                                    return [];
                                  } catch (error) {
                                    console.error(`Error fetching streams from ${source.source}:`, error);
                                    return [];
                                  }
                                });

                                // Wait for all sources to complete
                                const results = await Promise.allSettled(streamPromises);
                                
                                // Combine all successful stream results
                                results.forEach((result) => {
                                  if (result.status === 'fulfilled' && result.value.length > 0) {
                                    allStreams.push(...result.value);
                                  }
                                });

                                if (allStreams.length > 0) {
                                  setStreams(allStreams);
                                  setStreamSource(allStreams[0]);
                                } else {
                                  setStreams([]);
                                  setStreamSource(null);
                                }
                                setStreamsLoading(false);
                              };
                              fetchStreams();
                            }}
                            className={`mt-4 px-4 py-2 rounded-lg font-semibold text-xs transition-all ${
                              darkMode
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            Retry Loading Stream
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {match.status === 'ended' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-lg z-50 pointer-events-auto p-2 sm:p-4 md:p-6">
                      <div className={`text-center px-3 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8 rounded-xl sm:rounded-2xl md:rounded-3xl ${darkMode ? 'bg-slate-900/98' : 'bg-white'} backdrop-blur-xl border-2 ${darkMode ? 'border-white/20' : 'border-slate-200'} shadow-2xl w-full max-w-[280px] sm:max-w-md md:max-w-lg mx-2 sm:mx-4`}>
                        <div className="mb-3 sm:mb-5 md:mb-6">
                          <div className={`w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4 ${darkMode ? 'bg-slate-800/80' : 'bg-slate-100'} shadow-lg`}>
                            <Play size={18} className="sm:w-6 sm:h-6 md:w-7 md:h-7" style={{ width: '18px', height: '18px' }} fill={darkMode ? '#cbd5e1' : '#475569'} />
                          </div>
                          <p className={`text-xs sm:text-base md:text-lg font-bold mb-1.5 sm:mb-3 ${darkMode ? 'text-white' : 'text-slate-900'} leading-tight`}>
                            Stream Has Ended
                          </p>
                          <p className={`text-[10px] sm:text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'} mb-3 sm:mb-5 md:mb-6 px-1 leading-relaxed`}>
                            This match has finished. Check out live matches happening now!
                          </p>
                          <button
                            onClick={() => router.push('/popular?status=live')}
                            className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold text-[11px] sm:text-xs md:text-sm transition-all duration-200 hover:scale-105 active:scale-95 mx-auto w-auto ${
                              darkMode
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-md shadow-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/60'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/50 hover:shadow-lg hover:shadow-emerald-600/60'
                            }`}
                          >
                            <Play size={12} className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" fill="currentColor" />
                            <span>View Live Matches</span>
                            <ArrowRight size={12} className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

