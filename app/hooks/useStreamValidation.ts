import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { validateMatchesBatch } from '../services/streamValidation';
import type { APIMatch } from '../types/streamed';

interface ValidationCacheEntry {
  isValid: boolean;
  timestamp: number;
}

// Cache validation results for 2-3 minutes (150000ms = 2.5 minutes)
// Failed validations are cached for shorter time (30 seconds) to allow retry
const CACHE_DURATION_MS = 150000;
const FAILED_CACHE_DURATION_MS = 30000; // 30 seconds for failed validations

/**
 * Hook to validate stream availability for matches
 * @param matches - Array of API matches to validate
 * @param enabled - Whether validation is enabled (default: true)
 * @param batchSize - Number of matches to validate in parallel (default: 5)
 * @returns Object with validation results map and loading state
 */
export function useStreamValidation(
  matches: APIMatch[],
  enabled: boolean = true,
  batchSize: number = 5
): { validationResults: Map<string, boolean | undefined>; isValidating: boolean } {
  const [validationResults, setValidationResults] = useState<Map<string, boolean>>(new Map());
  const [isValidating, setIsValidating] = useState(false);
  const cacheRef = useRef<Map<string, ValidationCacheEntry>>(new Map());
  const validatingRef = useRef<Set<string>>(new Set());

  // Update validation results from cache on mount/match changes
  useEffect(() => {
    if (!enabled) return;
    
    const now = Date.now();
    setValidationResults(prev => {
      const next = new Map(prev);
      let updated = false;
      
      matches.forEach(match => {
        const cached = cacheRef.current.get(match.id);
        if (cached) {
          // Use shorter cache for failed validations
          const cacheDuration = !cached.isValid ? FAILED_CACHE_DURATION_MS : CACHE_DURATION_MS;
          if ((now - cached.timestamp) < cacheDuration) {
            if (!next.has(match.id) || next.get(match.id) !== cached.isValid) {
              next.set(match.id, cached.isValid);
              updated = true;
            }
          }
        }
      });
      
      return updated ? next : prev;
    });
  }, [matches, enabled]);

  // Filter matches that need validation
  const matchesToValidate = useMemo(() => {
    if (!enabled) return [];
    
    const now = Date.now();
    const toValidate: APIMatch[] = [];
    
    for (const match of matches) {
      const cached = cacheRef.current.get(match.id);
      
      // Skip if recently validated (within cache duration)
      // Use shorter cache for failed validations to allow retry
      const cacheDuration = cached && !cached.isValid ? FAILED_CACHE_DURATION_MS : CACHE_DURATION_MS;
      if (cached && (now - cached.timestamp) < cacheDuration) {
        continue;
      }
      
      // Skip if already being validated
      if (validatingRef.current.has(match.id)) {
        continue;
      }
      
      // Add to validation queue
      toValidate.push(match);
    }
    
    return toValidate;
  }, [matches, enabled]);

  // Validate matches in batches
  const validateMatches = useCallback(async (matchesToCheck: APIMatch[]) => {
    if (matchesToCheck.length === 0) return;
    
    // Mark matches as being validated
    matchesToCheck.forEach(match => validatingRef.current.add(match.id));
    setIsValidating(true);
    
    try {
      // Validate in batches
      const results = await validateMatchesBatch(matchesToCheck, batchSize);
      
      // Update cache and results
      const now = Date.now();
      setValidationResults(prev => {
        const next = new Map(prev);
        results.forEach((isValid, matchId) => {
          next.set(matchId, isValid);
          // Update cache
          cacheRef.current.set(matchId, {
            isValid,
            timestamp: now,
          });
          console.log(`[StreamValidation] Match ${matchId}: ${isValid ? 'VALID' : 'INVALID'}`);
        });
        return next;
      });
    } catch (error) {
      // On error, mark all as not playable
      console.warn('Error validating matches:', error);
      setValidationResults(prev => {
        const next = new Map(prev);
        matchesToCheck.forEach(match => {
          next.set(match.id, false);
          cacheRef.current.set(match.id, {
            isValid: false,
            timestamp: Date.now(),
          });
        });
        return next;
      });
    } finally {
      // Remove from validating set
      matchesToCheck.forEach(match => validatingRef.current.delete(match.id));
      setIsValidating(false);
    }
  }, [batchSize]);

  // Trigger validation when matches change
  useEffect(() => {
    if (!enabled || matchesToValidate.length === 0) return;
    
    console.log(`[StreamValidation] Starting validation for ${matchesToValidate.length} matches`);
    
    // Validate matches asynchronously (don't block UI)
    validateMatches(matchesToValidate);
  }, [matchesToValidate, enabled, validateMatches]);

  // Clean up old cache entries periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = false;
      
      cacheRef.current.forEach((entry, matchId) => {
        if ((now - entry.timestamp) >= CACHE_DURATION_MS) {
          cacheRef.current.delete(matchId);
          cleaned = true;
        }
      });
      
      // If we cleaned entries, also remove from validation results
      if (cleaned) {
        setValidationResults(prev => {
          const next = new Map(prev);
          cacheRef.current.forEach((_, matchId) => {
            if (!next.has(matchId)) {
              next.delete(matchId);
            }
          });
          return next;
        });
      }
    }, 60000); // Clean up every minute
    
    return () => clearInterval(cleanupInterval);
  }, []);

  // Return validation results map (undefined means not validated yet) and loading state
  const validationResultsMap = useMemo(() => {
    const result = new Map<string, boolean | undefined>();
    
    matches.forEach(match => {
      const isValid = validationResults.get(match.id);
      result.set(match.id, isValid);
    });
    
    return result;
  }, [matches, validationResults]);

  return {
    validationResults: validationResultsMap,
    isValidating,
  };
}

