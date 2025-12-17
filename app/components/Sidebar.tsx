'use client';

import { Calendar, ChevronRight, Film, Flame, Monitor, Moon, PanelLeft, Sun, TrendingUp, Trophy } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { useSidebar } from '../contexts/SidebarContext';
import SidebarItem from './SidebarItem';

interface SidebarProps {
  darkMode: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export default function Sidebar({ darkMode, mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
  const { toggleDarkMode } = useDarkMode();
  const { isCollapsed, setIsCollapsed, autoCollapseOnWatch } = useSidebar();
  const hasAutoCollapsedRef = useRef(false);

  // Auto-collapse only ONCE when watch page triggers it, then allow manual control
  useEffect(() => {
    if (autoCollapseOnWatch && !hasAutoCollapsedRef.current) {
      // Auto-collapse only once when entering watch page
      // Mark as auto-collapsed first to prevent re-triggering
      hasAutoCollapsedRef.current = true;
      // Then collapse if sidebar is currently open
      setIsCollapsed(true);
    } else if (!autoCollapseOnWatch) {
      // Reset the flag when leaving watch page
      hasAutoCollapsedRef.current = false;
    }
    // Note: Once hasAutoCollapsedRef is true, we don't interfere with manual toggles
    // The user can freely toggle the sidebar using the button
  }, [autoCollapseOnWatch, setIsCollapsed]);

  return (
    <>
      <div 
        className={`fixed inset-y-0 left-0 z-50 border-r transform transition-all duration-[400ms] ease-in-out sidebar-collapse-transition shadow-xl
          ${mobileMenuOpen ? 'translate-x-0 w-56' : '-translate-x-full'} 
          md:translate-x-0 md:static md:block 
          ${isCollapsed ? 'w-20' : 'w-56'}
          ${darkMode ? 'bg-slate-950 border-white/10 shadow-black/30' : 'bg-white border-slate-200 shadow-slate-200/50'}
        `}
      >
        <div className={`p-6 flex items-center gap-3 border-b ${darkMode ? 'border-white/10' : 'border-slate-100'} ${(isCollapsed && !mobileMenuOpen) ? 'justify-center px-2' : ''} relative`}>
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-visible relative -mt-3">
              <Image 
                src="/ovalve.png" 
                alt="OVALVE Logo" 
                width={48}
                height={48}
                className="object-contain scale-150"
                priority
              />
            </div>
            
            {(!isCollapsed || mobileMenuOpen) && (
              <span className={`text-lg sm:text-xl font-black tracking-wider animate-in fade-in duration-200 leading-none ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                OVALVE
              </span>
            )}
          </div>

          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`absolute top-1/2 -translate-y-1/2 -right-4 w-9 h-9 flex items-center justify-center rounded-full shadow-lg border hidden md:flex z-50 transition-all hover:scale-110
              ${darkMode ? 'bg-slate-900 border-white/20 text-slate-300 hover:text-white hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50'}
            `}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <PanelLeft size={18} />}
          </button>
        </div>

        <nav className="p-4 space-y-2 pb-28">
          <SidebarItem icon={Monitor} label="Live Now" href="/" collapsed={isCollapsed && !mobileMenuOpen} darkMode={darkMode} onNavigate={() => setMobileMenuOpen(false)} />
          <SidebarItem icon={Flame} label="Popular Now" href="/popular" collapsed={isCollapsed && !mobileMenuOpen} darkMode={darkMode} onNavigate={() => setMobileMenuOpen(false)} />
          <SidebarItem icon={Calendar} label="Schedule" href="/schedule" collapsed={isCollapsed && !mobileMenuOpen} darkMode={darkMode} onNavigate={() => setMobileMenuOpen(false)} />
          <SidebarItem icon={Trophy} label="Sports" href="/leagues" collapsed={isCollapsed && !mobileMenuOpen} darkMode={darkMode} onNavigate={() => setMobileMenuOpen(false)} />
          
          <div className={`pt-4 mt-4 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'} ${(isCollapsed && !mobileMenuOpen) ? 'hidden' : 'block'}`}>
            <p className={`px-4 text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Library</p>
          </div>
          
          <div className={(isCollapsed && !mobileMenuOpen) ? `pt-4 border-t mt-4 ${darkMode ? 'border-white/10' : 'border-slate-100'}` : ""}>
            <SidebarItem icon={Film} label="Highlights" href="/highlights" collapsed={isCollapsed && !mobileMenuOpen} darkMode={darkMode} onNavigate={() => setMobileMenuOpen(false)} />
            <SidebarItem icon={TrendingUp} label="Predictions" href="/predictions" collapsed={isCollapsed && !mobileMenuOpen} darkMode={darkMode} onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </nav>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <button
            type="button"
            onClick={toggleDarkMode}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border text-sm font-semibold shadow-sm transition-all hover:shadow-md ${
              darkMode
                ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            {(!isCollapsed || mobileMenuOpen) ? (darkMode ? 'Light Mode' : 'Dark Mode') : ''}
          </button>
        </div>
      </div>
      
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 md:hidden transition-opacity" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}
    </>
  );
}

