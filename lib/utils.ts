export function sanitizeTeamName(raw: string): string {
  const s = (raw || '').trim();
  // Remove trailing (W) marker indicating women's team
  return s.replace(/\s*\(w\)\s*$/i, '').trim();
}

export function firstNameOf(raw: string): string {
  const noMarker = sanitizeTeamName(raw);
  // Drop anything after an opening parenthesis
  const cut = noMarker.split('(')[0];
  // Split on whitespace, hyphen or slash and take the first token that has letters/digits
  const tokens = cut.split(/[\s\-\/]+/).filter(Boolean);
  const first = tokens.find(t => /[A-Za-z0-9]/.test(t)) || (tokens[0] || cut).trim();
  return first.replace(/[^A-Za-z0-9]+/g, '');
}

export function getDisplayName(name: string, maxLength: number = 50): string {
  // Return full team name, only truncate if extremely long
  const sanitized = sanitizeTeamName(name);
  // Drop anything after an opening parenthesis for cleaner display
  const cleaned = sanitized.split('(')[0].trim();
  
  // Only truncate if it's extremely long (more than maxLength)
  if (cleaned.length > maxLength) {
    return cleaned.slice(0, maxLength - 3) + '...';
  }
  return cleaned;
}

export function extractTimeLabel(timeStr: string): { isLive: boolean; time?: string } {
  const lower = (timeStr || '').toLowerCase();
  if (lower.includes('live now') || lower.includes('live')) {
    return { isLive: true };
  }
  const match = (timeStr || '').match(/\d{1,2}:\d{2}/);
  return { isLive: false, time: match?.[0] };
}

export function getMatchStatus(timeStr: string): 'live' | 'upcoming' | 'ended' {
  const lower = (timeStr || '').toLowerCase();
  if (lower.includes('live')) return 'live';
  if (lower.includes('tomorrow')) return 'upcoming';
  const m = (timeStr || '').match(/(\d{1,2}):(\d{2})/);
  if (m) {
    const hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (!Number.isNaN(hh) && !Number.isNaN(mm) && hh < 24 && mm < 60) {
      const now = new Date();
      const when = new Date(now);
      when.setHours(hh, mm, 0, 0);
      if (when < now) return 'ended';
      return 'upcoming';
    }
  }
  return 'ended';
}
