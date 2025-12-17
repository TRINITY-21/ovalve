import useSWR from 'swr';
import { getMatches } from '../services/streamedApi';
import { transformMatches } from '../utils/matchTransform';

// SWR fetcher function
const fetcher = async (endpoint: string) => {
  try {
    return await getMatches(endpoint);
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return [];
  }
};

interface SportWithMatches {
  id: string;
  name: string;
  matches: number;
  liveMatches: number;
  upcomingMatches: number;
}

// Helper function to capitalize sport name
const capitalizeSportName = (sportId: string): string => {
  const normalized = sportId.toLowerCase();
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
  
  return sportId
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Hook to fetch sports with match counts
 */
export function useSports() {
  // Fetch from multiple endpoints in parallel
  const { data: liveMatches = [], error: liveError, isLoading: liveLoading } = useSWR('live', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  const { data: todayMatches = [], error: todayError, isLoading: todayLoading } = useSWR('all-today', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  const { data: allMatches = [], error: allError, isLoading: allLoading } = useSWR('all', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  // Transform matches
  const transformedLive = transformMatches(liveMatches, true);
  const transformedToday = transformMatches(todayMatches);
  const transformedAll = transformMatches(allMatches);

  // Combine all matches (avoid duplicates)
  // Create a set of live match IDs to preserve their live status
  const liveMatchIds = new Set(transformedLive.map(m => m.id));
  
  const allMatchesMap = new Map<string, typeof transformedLive[0]>();
  
  // Add all matches first
  transformedAll.forEach(m => {
    // If this match is also in live matches, preserve live status
    if (liveMatchIds.has(m.id)) {
      const liveMatch = transformedLive.find(lm => lm.id === m.id);
      if (liveMatch) {
        allMatchesMap.set(m.id, { ...liveMatch, status: 'live' as const });
        return;
      }
    }
    allMatchesMap.set(m.id, m);
  });
  
  // Add today's matches
  transformedToday.forEach(m => {
    // If this match is also in live matches, preserve live status
    if (liveMatchIds.has(m.id)) {
      const liveMatch = transformedLive.find(lm => lm.id === m.id);
      if (liveMatch) {
        allMatchesMap.set(m.id, { ...liveMatch, status: 'live' as const });
        return;
      }
    }
    allMatchesMap.set(m.id, m);
  });
  
  // Add live matches (these should override if duplicate and ensure live status)
  transformedLive.forEach(m => {
    allMatchesMap.set(m.id, { ...m, status: 'live' as const });
  });

  const combinedMatches = Array.from(allMatchesMap.values());

  // Extract sports from matches and count
  const sportMap = new Map<string, { matches: number; liveMatches: number; upcomingMatches: number }>();

  combinedMatches.forEach(match => {
    if (!match.sport) return;
    
    const sportId = match.sport.toLowerCase();
    const existing = sportMap.get(sportId) || { matches: 0, liveMatches: 0, upcomingMatches: 0 };
    
    sportMap.set(sportId, {
      matches: existing.matches + 1,
      liveMatches: existing.liveMatches + (match.status === 'live' ? 1 : 0),
      upcomingMatches: existing.upcomingMatches + (match.status === 'upcoming' ? 1 : 0),
    });
  });

  // Convert to array with sport info
  const sports: SportWithMatches[] = Array.from(sportMap.entries())
    .map(([sportId, counts]) => ({
      id: sportId,
      name: capitalizeSportName(sportId),
      matches: counts.matches,
      liveMatches: counts.liveMatches,
      upcomingMatches: counts.upcomingMatches,
    }))
    .sort((a, b) => {
      // Sort by live matches first, then total matches
      if (a.liveMatches !== b.liveMatches) {
        return b.liveMatches - a.liveMatches;
      }
      // Football always comes first if tied
      if (a.id === 'football' || a.id === 'soccer') return -1;
      if (b.id === 'football' || b.id === 'soccer') return 1;
      return b.matches - a.matches;
    });

  const isLoading = liveLoading || todayLoading || allLoading;
  const error = liveError || todayError || allError;

  return {
    sports,
    isLoading,
    error,
  };
}

