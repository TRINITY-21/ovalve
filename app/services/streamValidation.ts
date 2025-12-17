import type { APIMatch } from '../types/streamed';
import { getStreams } from './streamedApi';

/**
 * Validate if a match has playable streams
 * @param match - The API match to validate
 * @param timeoutMs - Timeout per source in milliseconds (default: 5000)
 * @returns Promise<boolean> - true if at least one source has streams, false otherwise
 */
export async function validateMatchStreams(
  match: APIMatch,
  timeoutMs: number = 5000
): Promise<boolean> {
  // If match has no sources, it's not playable
  if (!match.sources || match.sources.length === 0) {
    return false;
  }

  // Check all sources in parallel with timeout
  const validationPromises = match.sources.map(async (source) => {
    try {
      // Create a timeout promise that rejects after timeoutMs
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Validation timeout'));
        }, timeoutMs);
      });

      // Race between getStreams and timeout
      const streamsPromise = getStreams(source.source, source.id);
      
      const result = await Promise.race([streamsPromise, timeoutPromise]);
      
      // If we get here, streamsPromise resolved (timeout would have rejected)
      const streams = result as Awaited<typeof streamsPromise>;
      
      // Return true only if we got streams with valid embedUrls
      if (!streams || streams.length === 0) {
        return false;
      }
      
      // Check if at least one stream has a valid embedUrl
      // A valid embedUrl should be a non-empty string and look like a URL
      const hasValidStream = streams.some(stream => {
        if (!stream.embedUrl || stream.embedUrl.trim().length === 0) {
          return false;
        }
        // Basic URL validation - should start with http:// or https://
        const url = stream.embedUrl.trim();
        return url.startsWith('http://') || url.startsWith('https://');
      });
      
      return hasValidStream;
    } catch (error) {
      // Handle timeout, network errors, or API errors
      // Treat all errors as "not playable"
      if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Validation timeout')) {
        // Timeout from getStreams or our timeout
        return false;
      }
      // Other errors (network, API errors, etc.)
      return false;
    }
  });

  // Wait for all validations to complete
  const results = await Promise.allSettled(validationPromises);
  
  // Check if any source returned true (has streams)
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value === true) {
      console.log(`[StreamValidation] Match ${match.id} validated: HAS playable streams`);
      return true;
    }
  }
  
  // No sources had streams
  console.log(`[StreamValidation] Match ${match.id} validated: NO playable streams`);
  return false;
}

/**
 * Validate multiple matches in batches
 * @param matches - Array of API matches to validate
 * @param batchSize - Number of matches to validate in parallel (default: 5)
 * @param timeoutMs - Timeout per source in milliseconds (default: 5000)
 * @returns Promise<Map<string, boolean>> - Map of match ID to validation result
 */
export async function validateMatchesBatch(
  matches: APIMatch[],
  batchSize: number = 5,
  timeoutMs: number = 5000
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();
  
  // Process matches in batches
  for (let i = 0; i < matches.length; i += batchSize) {
    const batch = matches.slice(i, i + batchSize);
    
    // Validate batch in parallel
    const batchPromises = batch.map(async (match) => {
      const isValid = await validateMatchStreams(match, timeoutMs);
      return { id: match.id, isValid };
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Store results
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.set(result.value.id, result.value.isValid);
      } else {
        // If validation failed, treat as not playable
        const matchId = batch[batchResults.indexOf(result)]?.id;
        if (matchId) {
          results.set(matchId, false);
        }
      }
    });
  }
  
  return results;
}

