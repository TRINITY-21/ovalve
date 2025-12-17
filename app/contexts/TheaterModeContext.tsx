'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface TheaterModeContextType {
  theaterMode: boolean;
  setTheaterMode: (mode: boolean) => void;
}

const TheaterModeContext = createContext<TheaterModeContextType | undefined>(undefined);

export function TheaterModeProvider({ children }: { children: ReactNode }) {
  const [theaterMode, setTheaterMode] = useState(false);

  return (
    <TheaterModeContext.Provider value={{ theaterMode, setTheaterMode }}>
      {children}
    </TheaterModeContext.Provider>
  );
}

export function useTheaterMode() {
  const context = useContext(TheaterModeContext);
  if (context === undefined) {
    throw new Error('useTheaterMode must be used within a TheaterModeProvider');
  }
  return context;
}

