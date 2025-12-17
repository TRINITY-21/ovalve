import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { getMatches } from '../services/streamedApi';
import type { Match } from '../utils/matchTransform';
import { transformMatches } from '../utils/matchTransform';
import { useStreamValidation } from './useStreamValidation';

// Grace period: show matches that are still validating after this time (in ms)
const VALIDATION_GRACE_PERIOD_MS = 5000; // 5 seconds

// SWR fetcher function
const fetcher = async (endpoint: string) => {
  console.log(`[useMatches] Fetcher called for endpoint: ${endpoint}`);
  try {
    const matches = await getMatches(endpoint);
    console.log(`[useMatches] Fetcher returned ${matches.length} matches for ${endpoint}`);
    return matches;
  } catch (error) {
    console.error(`[useMatches] Fetcher error for ${endpoint}:`, error);
    // Return empty array instead of throwing to prevent SWR from showing error state
    return [];
  }
};

/**
 * Hook to fetch and combine matches from multiple endpoints
 */
export function useMatches(activeSport: string) {
  // Fetch from multiple endpoints in parallel
  const { data: liveMatches = [], error: liveError, isLoading: liveLoading } = useSWR('live', fetcher, {
    refreshInterval: 15000, // Refresh every 15 seconds for live matches
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000, // Dedupe requests within 5 seconds
  });

  const { data: todayMatches = [], error: todayError, isLoading: todayLoading } = useSWR('all-today', fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  const { data: sportMatches = [], error: sportError, isLoading: sportLoading } = useSWR(
    activeSport ? `sport-${activeSport}` : null,
    () => fetcher(activeSport),
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  // Validate live matches to check if they have playable streams
  const { validationResults: streamValidation, isValidating: isValidatingStreams } = useStreamValidation(liveMatches, true, 5);

  // Track when validation starts to implement grace period
  const validationStartTimeRef = useRef<number | null>(null);
  const [hasPassedGracePeriod, setHasPassedGracePeriod] = useState(false);

  // Track validation start time
  useEffect(() => {
    if (isValidatingStreams && validationStartTimeRef.current === null) {
      validationStartTimeRef.current = Date.now();
      setHasPassedGracePeriod(false);
    } else if (!isValidatingStreams) {
      validationStartTimeRef.current = null;
      setHasPassedGracePeriod(false);
    }
  }, [isValidatingStreams]);

  // Check if grace period has passed
  useEffect(() => {
    if (validationStartTimeRef.current === null) return;

    const checkGracePeriod = () => {
      const elapsed = Date.now() - validationStartTimeRef.current!;
      if (elapsed >= VALIDATION_GRACE_PERIOD_MS) {
        setHasPassedGracePeriod(true);
      }
    };

    const interval = setInterval(checkGracePeriod, 100);
    checkGracePeriod(); // Check immediately

    return () => clearInterval(interval);
  }, [isValidatingStreams]);

  // Log raw API data for debugging
  console.log(`[useMatches] Raw API data - live: ${liveMatches.length}, today: ${todayMatches.length}, sport: ${sportMatches.length}`);
  console.log(`[useMatches] Loading states - live: ${liveLoading}, today: ${todayLoading}, sport: ${sportLoading}`);
  console.log(`[useMatches] Error states - live: ${liveError}, today: ${todayError}, sport: ${sportError}`);

  // Transform matches
  const transformedLive = transformMatches(liveMatches, true);
  const transformedToday = transformMatches(todayMatches);
  const transformedSport = transformMatches(sportMatches);
  
  console.log(`[useMatches] Transformed - live: ${transformedLive.length}, today: ${transformedToday.length}, sport: ${transformedSport.length}`);

  // Filter live matches based on stream validation with grace period
  // Strategy:
  // 1. Always include matches validated as true (has streams)
  // 2. After grace period OR if validation is not active, include matches still validating (undefined)
  // 3. Always exclude matches validated as false (no streams)
  // This ensures users see matches even if validation is slow or hasn't started
  const validatedLiveMatches = transformedLive.filter(match => {
    const isValid = streamValidation.get(match.id);
    
    // Always include validated matches with streams
    if (isValid === true) {
      return true;
    }
    
    // Always exclude matches that explicitly failed validation
    if (isValid === false) {
      console.log(`[useMatches] Filtering out match ${match.id}: validation failed`);
      return false;
    }
    
    // For matches still validating (undefined):
    // Show them if:
    // - Grace period has passed (validation taking too long), OR
    // - Validation is not currently active (hasn't started or completed)
    if (isValid === undefined) {
      if (hasPassedGracePeriod || !isValidatingStreams) {
        if (hasPassedGracePeriod) {
          console.log(`[useMatches] Including match ${match.id}: still validating but grace period passed`);
        } else {
          console.log(`[useMatches] Including match ${match.id}: validation not active`);
        }
        return true;
      }
      // Don't show if still within grace period and validation is actively running
      return false;
    }
    
    return false;
  });
  
  console.log(`[useMatches] Live matches: ${transformedLive.length} total, ${validatedLiveMatches.length} validated (grace period: ${hasPassedGracePeriod})`);

  // Combine matches, prioritizing live matches, then today's, then sport-specific
  // Create a set of validated live match IDs to ensure they stay live
  const liveMatchIds = new Set(validatedLiveMatches.map(m => m.id));
  
  const allMatchesMap = new Map<string, Match>();
  
  // Add sport-specific matches first (they're most relevant)
  transformedSport.forEach(match => {
    // If this match is also in validated live matches, preserve live status
    if (liveMatchIds.has(match.id)) {
      const liveMatch = validatedLiveMatches.find(m => m.id === match.id);
      if (liveMatch) {
        allMatchesMap.set(match.id, { ...liveMatch, status: 'live' as const });
        return;
      }
    }
    allMatchesMap.set(match.id, match);
  });
  
  // Add today's matches
  transformedToday.forEach(match => {
    // If this match is also in validated live matches, preserve live status
    if (liveMatchIds.has(match.id)) {
      const liveMatch = validatedLiveMatches.find(m => m.id === match.id);
      if (liveMatch) {
        allMatchesMap.set(match.id, { ...liveMatch, status: 'live' as const });
        return;
      }
    }
    allMatchesMap.set(match.id, match);
  });
  
  // Add validated live matches (these should override if duplicate and ensure live status)
  validatedLiveMatches.forEach(match => {
    allMatchesMap.set(match.id, { ...match, status: 'live' as const });
  });

  const matches = Array.from(allMatchesMap.values());

  const isLoading = liveLoading || todayLoading || sportLoading;
  const error = liveError || todayError || sportError;

  return {
    matches,
    isLoading,
    error,
    liveMatches: validatedLiveMatches, // Return validated live matches
    isValidatingLiveMatches: isValidatingStreams, // Return validation loading state
    todayMatches: transformedToday,
    sportMatches: transformedSport,
  };
}

