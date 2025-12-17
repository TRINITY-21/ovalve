'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  autoCollapseOnWatch: boolean;
  setAutoCollapseOnWatch: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Sidebar is open by default (isCollapsed = false means sidebar is expanded/open)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [autoCollapseOnWatch, setAutoCollapseOnWatch] = useState(false);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, autoCollapseOnWatch, setAutoCollapseOnWatch }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

