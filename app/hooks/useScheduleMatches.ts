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
 * Hook to fetch schedule matches for a specific sport
 */
export function useScheduleMatches(activeSport: string) {
  // Fetch from multiple endpoints in parallel
  const { data: todayMatches = [], error: todayError, isLoading: todayLoading } = useSWR('all-today', fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  const { data: sportMatches = [], error: sportError, isLoading: sportLoading } = useSWR(
    activeSport ? `sport-${activeSport}` : null,
    () => fetcher(activeSport),
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  // Transform matches
  const transformedToday = transformMatches(todayMatches);
  const transformedSport = transformMatches(sportMatches);

  // Combine matches, prioritizing sport-specific matches, then today's
  const allMatchesMap = new Map<string, Match>();
  
  // Add today's matches first
  transformedToday.forEach(match => {
    allMatchesMap.set(match.id, match);
  });
  
  // Add sport-specific matches (these should override if duplicate)
  transformedSport.forEach(match => {
    allMatchesMap.set(match.id, match);
  });

  const matches = Array.from(allMatchesMap.values());

  const isLoading = todayLoading || sportLoading;
  const error = todayError || sportError;

  return {
    matches,
    isLoading,
    error,
  };
}

