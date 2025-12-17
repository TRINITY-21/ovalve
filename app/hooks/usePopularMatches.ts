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
 * Hook to fetch popular matches
 */
export function usePopularMatches() {
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

  // Transform matches
  const transformedLive = transformMatches(liveMatches, true);
  const transformedToday = transformMatches(todayMatches);

  // Combine matches, using a Map to avoid duplicates
  const allMatchesMap = new Map<string, Match>();
  
  // Add today's matches first
  transformedToday.forEach(m => allMatchesMap.set(m.id, m));
  
  // Add live matches (override if duplicate to get live status)
  transformedLive.forEach(m => allMatchesMap.set(m.id, m));

  const matches = Array.from(allMatchesMap.values());

  const isLoading = liveLoading || todayLoading;
  const error = liveError || todayError;

  return {
    matches,
    isLoading,
    error,
  };
}

