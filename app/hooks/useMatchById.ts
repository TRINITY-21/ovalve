import useSWR from 'swr';
import { getMatches } from '../services/streamedApi';
import type { APIMatch } from '../types/streamed';
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
 * Hook to fetch a specific match by ID
 */
export function useMatchById(matchId: string | null) {
  // Fetch from multiple endpoints in parallel
  const { data: liveMatches = [], error: liveError, isLoading: liveLoading } = useSWR(
    matchId ? 'live' : null,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  const { data: todayMatches = [], error: todayError, isLoading: todayLoading } = useSWR(
    matchId ? 'all-today' : null,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  const { data: allMatches = [], error: allError, isLoading: allLoading } = useSWR(
    matchId ? 'all' : null,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  // Transform matches
  const transformedLive = transformMatches(liveMatches, true);
  const transformedToday = transformMatches(todayMatches);
  const transformedAll = transformMatches(allMatches);

  // Combine matches, removing duplicates
  const allMatchesMap = new Map<string, Match>();
  transformedAll.forEach(m => allMatchesMap.set(m.id, m));
  transformedToday.forEach(m => allMatchesMap.set(m.id, m));
  transformedLive.forEach(m => allMatchesMap.set(m.id, m));

  const combinedMatches = Array.from(allMatchesMap.values());

  // Also create a map of API matches for accessing sources
  const allApiMatches = [...allMatches, ...todayMatches, ...liveMatches];
  const apiMatchesMap = new Map<string, APIMatch>();
  allApiMatches.forEach(m => {
    if (m && m.id) {
      apiMatchesMap.set(m.id, m);
    }
  });

  // Find the match by ID
  let foundMatch: Match | undefined;
  let foundApiMatch: APIMatch | undefined;
  
  if (matchId) {
    // Try exact match first
    foundMatch = combinedMatches.find(m => m.id === matchId);
    
    // If not found, try to extract ID from slug format
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
      foundApiMatch = apiMatchesMap.get(foundMatch.id);
    }
  }

  // Get related matches (same sport, different ID)
  const related = foundMatch
    ? combinedMatches
        .filter(m => m.id !== foundMatch.id && m.sport === foundMatch.sport)
        .slice(0, 6)
    : [];

  const isLoading = liveLoading || todayLoading || allLoading;
  const error = liveError || todayError || allError;

  return {
    match: foundMatch || null,
    apiMatch: foundApiMatch || null,
    related,
    isLoading,
    error: error ? 'Failed to load match. Please try again later.' : (foundMatch ? null : 'Match not found'),
  };
}

