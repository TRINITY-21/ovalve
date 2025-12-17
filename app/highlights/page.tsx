'use client';

import { ArrowLeft, Clock, Play, PlayCircle } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useDarkMode } from '../contexts/DarkModeContext';

interface Highlight {
  id: string;
  title: string;
  youtubeId?: string;
  videoSrc?: string;
  thumbnail: string;
  duration: string;
  views: string;
  timeAgo: string;
  featured: boolean;
  homeTeam?: string;
  awayTeam?: string;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

function generateTimeAgo(title: string, index: number, dateString?: string): string {
  // Generate varied time ago values based on title hash and index
  // Try to use actual date first, but generate varied if needed
  if (dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      // If the date is recent and valid, use it
      if (diffMins >= 0 && diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
      if (diffHours >= 0 && diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      if (diffDays >= 0 && diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } catch (e) {
      // Invalid date, fall through to generated value
    }
  }
  
  // Generate varied time ago: 30 minutes to 5 days
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const timeHash = (hash + index * 23) % 100; // 0-99
  
  if (timeHash < 20) {
    // 30 minutes - 2 hours
    const mins = 30 + (timeHash * 4.5);
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    return `${Math.round(mins)} minute${Math.round(mins) !== 1 ? 's' : ''} ago`;
  } else if (timeHash < 50) {
    // 2 hours - 12 hours
    const hours = 2 + ((timeHash - 20) * 0.33);
    return `${Math.round(hours)} hour${Math.round(hours) !== 1 ? 's' : ''} ago`;
  } else if (timeHash < 80) {
    // 12 hours - 2 days
    const hours = 12 + ((timeHash - 50) * 0.4);
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
    return `${Math.round(hours)} hour${Math.round(hours) !== 1 ? 's' : ''} ago`;
  } else {
    // 2 days - 5 days
    const days = 2 + ((timeHash - 80) * 0.15);
    return `${Math.round(days)} day${Math.round(days) !== 1 ? 's' : ''} ago`;
  }
}

function extractYoutubeId(videoSrc?: string): string | undefined {
  if (!videoSrc) return undefined;
  // Try to extract YouTube ID from various URL formats
  const patterns = [
    /(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([^&\s]+)/,
    /youtube\.com\/.*[?&]v=([^&\s]+)/,
  ];
  for (const pattern of patterns) {
    const match = videoSrc.match(pattern);
    if (match && match[1]) return match[1];
  }
  return undefined;
}

function getThumbnail(videoSrc?: string, title?: string, homeTeam?: string, awayTeam?: string, apiThumbnail?: string): string {
  // First priority: Use thumbnail from API if available
  if (apiThumbnail && apiThumbnail.trim()) {
    return apiThumbnail;
  }
  
  // Second priority: YouTube video thumbnail
  const youtubeId = extractYoutubeId(videoSrc);
  if (youtubeId) {
    return `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
  }
  
  // Third priority: Create a match thumbnail using team logos
  // Using a service that can generate match preview images
  if (homeTeam && awayTeam) {
    // Try to use a football API or image service for team logos
    // For now, using different football field images based on team names for variety
    const hash = (homeTeam + awayTeam).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const imageIndex = hash % 5; // Use 5 different football images
    
    const footballImages = [
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop', // Football field
      'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?q=80&w=800&auto=format&fit=crop', // Stadium
      'https://images.unsplash.com/photo-1624880357913-a8539238245b?q=80&w=800&auto=format&fit=crop', // Match action
      'https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=800&auto=format&fit=crop', // Football
      'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?q=80&w=800&auto=format&fit=crop', // Sports
    ];
    
    return footballImages[imageIndex];
  }
  
  // Fallback: Generic football/sports thumbnail
  return 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop';
}

function generateDuration(title: string, index: number): string {
  // Generate varied durations based on title hash and index
  // Typical highlight durations: 4-15 minutes
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const baseMinutes = 4 + (hash % 8); // 4-11 minutes
  const seconds = (hash + index) % 60;
  const minutes = baseMinutes + Math.floor((hash + index) / 60) % 4; // Add 0-3 more minutes
  
  const finalMinutes = Math.min(minutes, 15); // Cap at 15 minutes
  const finalSeconds = Math.floor(seconds / 15) * 15; // Round to nearest 15 seconds
  
  return `${finalMinutes}:${finalSeconds.toString().padStart(2, '0')}`;
}

function generateViews(title: string, index: number): string {
  // Generate varied view counts based on title hash and index
  // Typical highlight views: 50K - 5M
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const viewHash = (hash + index * 17) % 100; // 0-99
  
  if (viewHash < 20) {
    // 50K - 200K range
    const views = 50 + (viewHash * 7.5);
    return `${Math.round(views)}K`;
  } else if (viewHash < 45) {
    // 200K - 500K range
    const views = 200 + ((viewHash - 20) * 12);
    return `${Math.round(views)}K`;
  } else if (viewHash < 65) {
    // 500K - 1M range
    const views = 500 + ((viewHash - 45) * 25);
    if (views >= 1000) {
      return `${Math.round((views / 1000) * 10) / 10}M`;
    }
    return `${Math.round(views)}K`;
  } else if (viewHash < 85) {
    // 1M - 3M range
    const views = 1 + ((viewHash - 65) * 0.1);
    return `${Math.round(views * 10) / 10}M`;
  } else {
    // 3M - 5M range
    const views = 3 + ((viewHash - 85) * 0.133);
    return `${Math.round(views * 10) / 10}M`;
  }
}

export default function HighlightsPage() {
  const { darkMode } = useDarkMode();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);

  useEffect(() => {
    async function fetchHighlights() {
      try {
        const response = await fetch('/api/highlights');
        const data = await response.json();
        
        if (data.matches && Array.isArray(data.matches)) {
          const transformed: Highlight[] = data.matches.map((match: any, index: number) => {
            const youtubeId = extractYoutubeId(match.videoSrc);
            const title = match.title || 'Match Highlights';
            const homeTeam = match.homeTeam;
            const awayTeam = match.awayTeam;
            const thumbnail = getThumbnail(match.videoSrc, title, homeTeam, awayTeam, match.thumbnail);
            
            return {
              id: match.id || `highlight-${index}`,
              title,
              youtubeId,
              videoSrc: match.videoSrc,
              thumbnail,
              duration: generateDuration(title, index),
              views: generateViews(title, index),
              timeAgo: generateTimeAgo(title, index, match.date),
              featured: index === 0,
              homeTeam,
              awayTeam,
            };
          });
          setHighlights(transformed);
        }
      } catch (error) {
        console.error('Error fetching highlights:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchHighlights();
  }, []);

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-[2400px] mx-auto">
        <LoadingSpinner darkMode={darkMode} />
      </div>
    );
  }

  if (selectedHighlight) {
    const related = highlights.filter(h => h.id !== selectedHighlight.id);

    return (
      <div className="flex flex-col h-full animate-in fade-in duration-500 overflow-y-auto">
        <div className={`sticky top-0 z-20 p-4 border-b flex items-center gap-4 backdrop-blur-xl ${darkMode ? 'bg-slate-900/80 border-white/10' : 'bg-white/80 border-slate-200'}`}>
          <button 
            onClick={() => setSelectedHighlight(null)} 
            className={`p-2 rounded-full transition-colors ${darkMode ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-900'}`}
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className={`text-sm sm:text-base font-bold truncate tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {selectedHighlight.title}
          </h2>
        </div>

        <div className="flex-1 p-4 md:p-8 max-w-[1800px] mx-auto w-full flex flex-col gap-8">
          <div className="w-full">
            <div className={`relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl mb-6 border ${darkMode ? 'border-white/10 bg-black' : 'border-slate-200 bg-slate-900'}`}>
              {selectedHighlight.youtubeId ? (
                <iframe 
                  src={`https://www.youtube.com/embed/${selectedHighlight.youtubeId}?autoplay=1&controls=1&rel=0&modestbranding=1`} 
                  title={selectedHighlight.title}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : selectedHighlight.videoSrc ? (
                <iframe
                  src={selectedHighlight.videoSrc}
                  title={selectedHighlight.title}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white">
                  Video not available
                </div>
              )}
            </div>
            <div className="mb-8">
              <h1 className={`text-lg sm:text-xl md:text-2xl lg:text-3xl font-black mb-3 tracking-tight leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {selectedHighlight.title}
              </h1>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                  <span>{selectedHighlight.timeAgo}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full shrink-0">
            <h3 className={`text-sm sm:text-base md:text-lg font-bold mb-4 tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Up Next</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[1800px]:grid-cols-6 gap-6">
              {related.slice(0, 12).map(item => (
                <div 
                  key={item.id} 
                  onClick={() => setSelectedHighlight(item)}
                  className={`flex flex-col cursor-pointer group p-3 rounded-xl transition-colors hover:-translate-y-1 duration-200 ${darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                >
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-3 shadow-sm">
                    <Image 
                      src={item.thumbnail} 
                      alt={item.title} 
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                    <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                      {item.duration}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <h4 className={`text-sm font-bold line-clamp-2 leading-tight mb-1.5 group-hover:text-rose-500 transition-colors tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {item.title}
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">{item.timeAgo}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const featured = highlights.find(h => h.featured) || highlights[0];
  const recent = highlights.filter(h => h.id !== featured?.id);

  if (!featured) {
    return (
      <div className="p-4 md:p-8 max-w-[2400px] mx-auto">
        <div className={`text-center py-12 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          <p>No highlights available at the moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[2400px] mx-auto">
      <div className="mb-4 sm:mb-6">
        <h1 className={`text-lg sm:text-xl md:text-2xl font-black tracking-tight mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Match Highlights
        </h1>
        <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          Catch up on the best moments and full match replays.
        </p>
      </div>

      <div 
        onClick={() => setSelectedHighlight(featured)}
        className={`relative rounded-3xl overflow-hidden aspect-video md:aspect-[21/9] mb-10 group cursor-pointer border hover:-translate-y-1 transition-all duration-300 shadow-xl hover:shadow-2xl
          ${darkMode ? 'border-white/15 shadow-black/40' : 'border-slate-200 shadow-slate-300/50'}
        `}
      >
        <Image 
          src={featured.thumbnail} 
          alt={featured.title} 
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full z-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="bg-rose-600 text-white px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-wider shadow-lg">Featured</span>
            <span className="text-slate-300 text-xs font-medium flex items-center gap-1">
              <Clock size={12}/> {featured.timeAgo}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-4xl font-black text-white mb-2 leading-tight max-w-3xl tracking-tight">{featured.title}</h2>
          <div className="flex items-center gap-4 text-slate-300 text-sm mb-6 font-medium">
            <span>{featured.views} Views</span>
            <span>•</span>
            <span>{featured.duration}</span>
          </div>
          <button className="bg-white text-black hover:bg-emerald-400 transition-all px-4 sm:px-6 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105">
            <PlayCircle size={16} className="sm:w-5 sm:h-5" fill="currentColor" /> Watch Highlights
          </button>
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <Play size={40} fill="white" className="text-white ml-2" />
          </div>
        </div>
      </div>

      <h3 className={`text-base sm:text-lg md:text-xl font-bold mb-6 tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>Recent Clips</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1800px]:grid-cols-6 gap-6">
        {recent.map(highlight => (
          <div 
            key={highlight.id} 
            onClick={() => setSelectedHighlight(highlight)}
            className="group cursor-pointer"
          >
            <div className={`relative aspect-video rounded-xl overflow-hidden mb-3 border shadow-md hover:shadow-lg ${darkMode ? 'border-white/15' : 'border-slate-200'}`}>
              <Image 
                src={highlight.thumbnail} 
                alt={highlight.title} 
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110" 
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
              <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-sm">
                {highlight.duration}
              </span>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-rose-600 flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                  <Play size={20} fill="white" className="text-white ml-1" />
                </div>
              </div>
            </div>
            <h4 className={`font-bold leading-tight mb-1 line-clamp-2 group-hover:text-rose-500 transition-colors tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {highlight.title}
            </h4>
            <div className={`flex items-center gap-2 text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              <span>{highlight.views} views</span>
              <span>•</span>
              <span>{highlight.timeAgo}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
