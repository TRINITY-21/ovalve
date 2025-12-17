import { getBadgeImageUrl, getPosterImageUrl } from '../services/streamedApi';
import type { APIMatch } from '../types/streamed';

export interface Match {
  id: string;
  sport: string;
  home: string;
  away: string;
  homeLogo?: string; // Optional - may be undefined if no badge available
  awayLogo?: string; // Optional - may be undefined if no badge available
  league: string;
  time: string;
  status: 'live' | 'upcoming' | 'ended';
  score?: string;
  viewers?: string;
  minute?: string;
  isHot?: boolean;
  thumbnail?: string;
  quality?: string;
  date?: number; // Original Unix timestamp from API for accurate time calculations
  _hasValidTeams?: boolean; // Internal flag to indicate if teams were successfully extracted
}

/**
 * Determine match status based on date
 * @param date - Unix timestamp in milliseconds
 * @param isFromLiveEndpoint - Whether this match came from the /live endpoint
 */
function determineStatus(date: number, isFromLiveEndpoint = false): 'live' | 'upcoming' | 'ended' {
  const now = Date.now();
  const matchDate = date;
  const diff = matchDate - now;
  
  // If from live endpoint, it's definitely live
  if (isFromLiveEndpoint) {
    return 'live';
  }
  
  // Consider a match "live" if it started within the last 6 hours
  // (some sports like baseball, cricket can last longer, so 6 hours gives a better buffer)
  const sixHoursAgo = now - (6 * 60 * 60 * 1000);
  
  if (matchDate >= sixHoursAgo && matchDate <= now) {
    // Started recently, likely still live
    return 'live';
  } else if (matchDate > now) {
    // Future match
    return 'upcoming';
  } else {
    // Past match (more than 6 hours ago)
    return 'ended';
  }
}

/**
 * Format time from Unix timestamp
 */
function formatTime(date: number, status: 'live' | 'upcoming' | 'ended'): string {
  if (status === 'live') {
    return 'LIVE';
  }
  
  if (status === 'ended') {
    return 'FT';
  }
  
  // For upcoming matches, format as HH:MM or "Tomorrow"
  const matchDate = new Date(date);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const matchDay = new Date(matchDate);
  matchDay.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  
  if (matchDay.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  }
  
  // Format as HH:MM
  const hours = matchDate.getHours().toString().padStart(2, '0');
  const minutes = matchDate.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Extract team names from match title
 * Handles formats like: "Team A vs Team B", "Team A v Team B", "Team A vs. Team B - League"
 */
function extractTeamsFromTitle(title: string): { home: string; away: string } | null {
  if (!title || typeof title !== 'string') {
    return null;
  }
  
  // Remove league suffix if present (everything after last " - " or " -")
  // Match patterns like: " - League Name" or " -League Name"
  const titleWithoutLeague = title.replace(/\s*-\s*[^-]+$/, '').trim();
  
  if (!titleWithoutLeague) {
    return null;
  }
  
  // Try different patterns: "vs", "v", "vs.", "VS", etc.
  // Order matters - try more specific patterns first
  const patterns = [
    /\s+vs\.?\s+/i,  // " vs " or " vs. " (most common)
    /\s+v\s+/i,      // " v " (abbreviated)
    /\s+VS\s+/,      // " VS " (uppercase)
    /\s+V\s+/,       // " V " (uppercase abbreviated)
  ];
  
  for (const pattern of patterns) {
    const match = titleWithoutLeague.match(pattern);
    if (match && match.index !== undefined) {
      const home = titleWithoutLeague.substring(0, match.index).trim();
      const away = titleWithoutLeague.substring(match.index + match[0].length).trim();
      
      // Validate that we got actual team names (not empty, not just whitespace)
      if (home && away && home.length > 0 && away.length > 0) {
        // Make sure they're not the placeholder values
        if (home !== 'Home Team' && away !== 'Away Team') {
          return { home, away };
        }
      }
    }
  }
  
  return null;
}

/**
 * Extract league name from match title or use category
 */
function extractLeague(title: string, category: string): string {
  // Try to extract league from title (e.g., "Manchester United vs Liverpool - Premier League")
  const leagueMatch = title.match(/-?\s*([A-Z][a-zA-Z\s]+)$/);
  if (leagueMatch && leagueMatch[1]) {
    return leagueMatch[1].trim();
  }
  
  // Fallback to capitalized category
  return category.charAt(0).toUpperCase() + category.slice(1);
}

/**
 * Transform API match to app Match type
 * @param apiMatch - The API match object
 * @param isFromLiveEndpoint - Whether this match came from the /live endpoint (default: false)
 */
export function transformMatch(apiMatch: APIMatch, isFromLiveEndpoint = false): Match | null {
  const status = determineStatus(apiMatch.date, isFromLiveEndpoint);
  const time = formatTime(apiMatch.date, status);
  
  // Extract team names and badge paths - try teams object first, then parse from title
  // IMPORTANT: Always preserve badge paths from teams object, even if we extract names from title
  let home = apiMatch.teams?.home?.name?.trim();
  let away = apiMatch.teams?.away?.name?.trim();
  const homeBadgePath = apiMatch.teams?.home?.badge?.trim();
  const awayBadgePath = apiMatch.teams?.away?.badge?.trim();
  
  // If teams object doesn't have names, try to extract from title
  // But keep the badge paths from teams object if they exist
  if (!home || !away) {
    const teamsFromTitle = extractTeamsFromTitle(apiMatch.title);
    if (teamsFromTitle) {
      home = home || teamsFromTitle.home.trim();
      away = away || teamsFromTitle.away.trim();
    }
  }
  
  // If we still don't have valid team names, return null (don't include this match)
  if (!home || !away || home === 'Home Team' || away === 'Away Team') {
    console.warn(`[transformMatch] Skipping match ${apiMatch.id}: Invalid team names (home: ${home}, away: ${away})`);
    return null;
  }
  
  // Get badge URLs (return undefined instead of empty string to avoid img src errors)
  // Badge paths from API are encoded strings that need .webp extension
  const homeLogo = homeBadgePath && homeBadgePath.length > 0
    ? getBadgeImageUrl(homeBadgePath)
    : undefined;
  const awayLogo = awayBadgePath && awayBadgePath.length > 0
    ? getBadgeImageUrl(awayBadgePath)
    : undefined;
  
  // Extract league
  const league = extractLeague(apiMatch.title, apiMatch.category);
  
  // Get thumbnail from poster
  const thumbnail = apiMatch.poster 
    ? getPosterImageUrl(apiMatch.poster)
    : undefined;
  
  // Map popular to isHot
  const isHot = apiMatch.popular;
  
  // For live matches, we might want to show viewers (if available in future)
  // For now, we'll leave it undefined unless the API provides it
  
  return {
    id: apiMatch.id,
    sport: apiMatch.category,
    home,
    away,
    homeLogo,
    awayLogo,
    league,
    time,
    status,
    isHot,
    thumbnail,
    date: apiMatch.date, // Store original date for accurate time calculations
    _hasValidTeams: true, // Mark as having valid teams
    // Optional fields that may not be available from API
    score: undefined,
    viewers: undefined,
    minute: undefined,
    quality: undefined,
  };
}

/**
 * Transform multiple API matches
 * @param apiMatches - Array of API match objects
 * @param isFromLiveEndpoint - Whether these matches came from the /live endpoint (default: false)
 */
export function transformMatches(apiMatches: APIMatch[], isFromLiveEndpoint = false): Match[] {
  console.log(`[transformMatches] Transforming ${apiMatches.length} matches (isFromLiveEndpoint: ${isFromLiveEndpoint})`);
  const transformed = apiMatches
    .map(match => transformMatch(match, isFromLiveEndpoint))
    .filter((match): match is Match => match !== null); // Filter out null matches (those without valid teams)
  console.log(`[transformMatches] Successfully transformed ${transformed.length} matches (filtered out ${apiMatches.length - transformed.length})`);
  return transformed;
}

