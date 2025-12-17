import type { APIMatch, APISport, APIStream } from '../types/streamed';

const API_BASE_URL = 'https://streamed.pk';

/**
 * Create an AbortSignal with a timeout
 * Uses AbortSignal.timeout if available, otherwise creates a manual timeout
 */
function createTimeoutSignal(timeoutMs: number): AbortSignal {
  // Use native AbortSignal.timeout if available (Node 17.3+, modern browsers)
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    return AbortSignal.timeout(timeoutMs);
  }
  
  // Fallback: create manual timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  // Clean up timeout if signal is already aborted
  controller.signal.addEventListener('abort', () => clearTimeout(timeoutId));
  
  return controller.signal;
}

/**
 * Fetch all available sports
 */
export async function getSports(): Promise<APISport[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/sports`, {
      cache: 'no-store',
      signal: createTimeoutSignal(10000), // 10 second timeout
    });
    if (!response.ok) {
      console.warn(`Error fetching sports: ${response.statusText}`);
      return [];
    }
    return await response.json();
  } catch (error) {
    // Handle network errors gracefully
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn('Network error fetching sports. API may be unreachable.');
      return [];
    }
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Request timeout for sports');
      return [];
    }
    console.warn('Error fetching sports:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

/**
 * Fetch matches from various endpoints
 * @param endpoint - 'live', 'all', 'all-today', 'all/popular', 'live/popular', 'all-today/popular', or sport ID
 */
export async function getMatches(endpoint: string): Promise<APIMatch[]> {
  const url = endpoint.includes('/') 
    ? `${API_BASE_URL}/api/matches/${endpoint}`
    : `${API_BASE_URL}/api/matches/${endpoint}`;
  
  console.log(`[getMatches] Fetching from: ${url}`);
  
  try {
    // Remove Next.js-specific options for client-side fetching
    // These options only work in server components
    const response = await fetch(url, {
      cache: 'no-store',
      signal: createTimeoutSignal(10000), // 10 second timeout
    });
    
    console.log(`[getMatches] Response status for ${endpoint}: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      // Log detailed error information
      const errorText = await response.text().catch(() => 'Unable to read error response');
      console.error(`[getMatches] Error response for ${endpoint}:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText.substring(0, 200), // First 200 chars
      });
      
      // Don't throw for non-critical errors, just return empty array
      if (response.status >= 500) {
        // Server error - log but don't throw
        console.warn(`[getMatches] Server error fetching matches from ${endpoint}: ${response.statusText}`);
        return [];
      }
      // For client errors (4xx), also return empty array
      console.warn(`[getMatches] Client error fetching matches from ${endpoint}: ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    console.log(`[getMatches] Successfully fetched ${Array.isArray(data) ? data.length : 0} matches from ${endpoint}`);
    return data;
  } catch (error) {
    // Handle network errors, timeouts, and other fetch failures gracefully
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      // Network error - likely CORS, connection issue, or API down
      console.error(`[getMatches] Network error fetching matches from ${endpoint}. API may be unreachable.`, error);
      return [];
    }
    if (error instanceof Error && error.name === 'AbortError') {
      // Timeout error
      console.error(`[getMatches] Request timeout for ${endpoint}`);
      return [];
    }
    // For other errors, log but still return empty array
    console.error(`[getMatches] Error fetching matches from ${endpoint}:`, error);
    return [];
  }
}

/**
 * Fetch streams for a specific match source
 * @param source - Stream source identifier (e.g., 'alpha', 'bravo')
 * @param id - Source-specific match ID
 */
export async function getStreams(source: string, id: string): Promise<APIStream[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stream/${source}/${id}`, {
      signal: createTimeoutSignal(10000), // 10 second timeout
    });
    if (!response.ok) {
      console.warn(`Error fetching streams for ${source}/${id}: ${response.statusText}`);
      return [];
    }
    return await response.json();
  } catch (error) {
    // Handle network errors gracefully
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.warn(`Network error fetching streams for ${source}/${id}. API may be unreachable.`);
      return [];
    }
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`Request timeout for streams ${source}/${id}`);
      return [];
    }
    console.warn(`Error fetching streams for ${source}/${id}:`, error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

/**
 * Get image URL for team badge
 * @param badgePath - Badge path from API
 */
export function getBadgeImageUrl(badgePath: string): string {
  if (!badgePath) return '';
  // Remove leading slash if present
  const cleanPath = badgePath.startsWith('/') ? badgePath.slice(1) : badgePath;
  return `${API_BASE_URL}/api/images/badge/${cleanPath}.webp`;
}

/**
 * Get image URL for match poster
 * @param posterPath - Poster path from API (can be full URL, relative path, or encoded string)
 */
export function getPosterImageUrl(posterPath: string): string {
  if (!posterPath) return '';
  
  // If it's already a full URL (starts with http:// or https://), use it as-is
  if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
    return posterPath;
  }
  
  // If it's a relative path starting with /api/images/, construct full URL
  if (posterPath.startsWith('/api/images/')) {
    // Check if it already has .webp extension
    if (posterPath.endsWith('.webp')) {
      return `${API_BASE_URL}${posterPath}`;
    }
    // Add .webp if not present
    return `${API_BASE_URL}${posterPath}.webp`;
  }
  
  // If it's just a path (not starting with /), treat it as poster path
  const cleanPath = posterPath.startsWith('/') ? posterPath.slice(1) : posterPath;
  return `${API_BASE_URL}/api/images/poster/${cleanPath}.webp`;
}

/**
 * Get proxied image URL
 * @param imagePath - Image path to proxy
 */
export function getProxyImageUrl(imagePath: string): string {
  if (!imagePath) return '';
  // Remove leading slash if present
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  return `${API_BASE_URL}/api/images/proxy/${cleanPath}.webp`;
}

