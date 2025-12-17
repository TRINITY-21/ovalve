// TypeScript interfaces matching Streamed.pk API responses

export interface APISport {
  id: string;
  name: string;
}

export interface APITeam {
  name: string;
  badge: string;
}

export interface APIMatch {
  id: string;
  title: string;
  category: string;
  date: number; // Unix timestamp in milliseconds
  poster?: string;
  popular: boolean;
  teams?: {
    home?: APITeam;
    away?: APITeam;
  };
  sources: {
    source: string;
    id: string;
  }[];
}

export interface APIStream {
  id: string;
  streamNo: number;
  language: string;
  hd: boolean;
  embedUrl: string;
  source: string;
}






