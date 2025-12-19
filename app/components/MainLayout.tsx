'use client';

import { ReactNode, useState } from 'react';
import { DarkModeProvider, useDarkMode } from '../contexts/DarkModeContext';
import { LoadingProvider, useLoading } from '../contexts/LoadingContext';
import { SidebarProvider } from '../contexts/SidebarContext';
import { useAllMatches } from '../hooks/useAllMatches';
import FeedbackModal from './FeedbackModal';
import Header from './Header';
import LoadingSpinner from './LoadingSpinner';
import SearchModal from './SearchModal';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

function LayoutContent({ children }: MainLayoutProps) {
  const { darkMode } = useDarkMode();
  const { isLoading } = useLoading();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch all matches for search
  const { matches: allMatches } = useAllMatches();
  const liveCount = allMatches.filter((m) => m.status === 'live').length;

  return (
    <div className={`min-h-screen w-full ${darkMode ? 'bg-slate-950' : 'bg-slate-100'} transition-colors duration-300 ${mobileMenuOpen ? 'mobile-sidebar-open' : ''}`}>
      <div className={`mx-auto flex h-screen w-full max-w-[1500px] px-0 py-0 md:px-8 md:py-6 lg:px-10`}>
        <div className={`flex h-full w-full overflow-hidden rounded-none md:rounded-3xl border-0 md:border font-sans selection:bg-emerald-100 shadow-none md:shadow-2xl ${darkMode ? 'bg-slate-950 text-white md:border-white/10 shadow-black/30' : 'bg-white text-slate-900 md:border-slate-200 shadow-slate-200/50'}`}>
            <Sidebar darkMode={darkMode} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
          
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
              <Header 
                darkMode={darkMode}
                searchQuery={searchQuery}
                onMobileMenuToggle={() => setMobileMenuOpen(true)}
                onSearchClick={() => setSearchModalOpen(true)}
                onFeedbackClick={() => setFeedbackOpen(true)}
              />
            
            <main className={`flex-1 custom-scrollbar overflow-y-auto pb-0 relative`}>
              {isLoading && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-lg">
                  <LoadingSpinner darkMode={darkMode} compact={false} />
                </div>
              )}
              {children}
            </main>
          </div>
        </div>
      </div>

      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        darkMode={darkMode}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        matches={allMatches}
      />

      <FeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        darkMode={darkMode}
      />
    </div>
  );
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <DarkModeProvider>
      <LoadingProvider>
        <SidebarProvider>
          <LayoutContent>{children}</LayoutContent>
        </SidebarProvider>
      </LoadingProvider>
    </DarkModeProvider>
  );
}

