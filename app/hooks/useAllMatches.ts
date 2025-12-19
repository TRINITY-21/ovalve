import useSWR from 'swr';
import { getMatches } from '../services/streamedApi';
import type { Match } from '../utils/matchTransform';
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

/**
 * Hook to fetch all matches for search
 */
export function useAllMatches() {
  // Fetch from multiple endpoints to get all matches
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
    refreshInterval: 60000, // Refresh every minute for all matches
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  // Transform matches
  const transformedLive = transformMatches(liveMatches, true);
  const transformedToday = transformMatches(todayMatches);
  const transformedAll = transformMatches(allMatches);

  // Combine matches, removing duplicates
  const allMatchesMap = new Map<string, Match>();
  
  // Add all matches first
  transformedAll.forEach(m => allMatchesMap.set(m.id, m));
  
  // Add today's matches (override to get better status)
  transformedToday.forEach(m => allMatchesMap.set(m.id, m));
  
  // Add live matches (override to preserve live status)
  transformedLive.forEach(m => allMatchesMap.set(m.id, { ...m, status: 'live' as const }));

  const matches = Array.from(allMatchesMap.values());

  const isLoading = liveLoading || todayLoading || allLoading;
  const error = liveError || todayError || allError;

  return {
    matches,
    isLoading,
    error,
  };
}
