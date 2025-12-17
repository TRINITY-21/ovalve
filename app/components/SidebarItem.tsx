'use client';

import { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useLoading } from '../contexts/LoadingContext';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  collapsed?: boolean;
  darkMode?: boolean;
  onNavigate?: () => void;
}

export default function SidebarItem({ icon: Icon, label, href, collapsed = false, darkMode = false, onNavigate }: SidebarItemProps) {
  const pathname = usePathname();
  const { setLoading } = useLoading();
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

  // Hide loading when pathname changes (navigation completed)
  useEffect(() => {
    // Small delay to ensure page content has rendered
    const timer = setTimeout(() => {
      setLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [pathname, setLoading]);

  const handleClick = () => {
    // Only show loading if navigating to a different page
    if (pathname !== href) {
      setLoading(true);
    }
    
    if (onNavigate) {
      onNavigate();
    }

    // Let the Link component handle navigation naturally
    // The useEffect will detect pathname change and hide loading
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative
        ${isActive 
            ? (darkMode ? 'text-emerald-300 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'text-emerald-700 border border-emerald-300 shadow-md')
            : (darkMode ? 'text-slate-300 hover:text-white border border-transparent' : 'text-slate-600 hover:text-slate-900 border border-transparent')
        }
        ${collapsed ? 'justify-center px-2' : ''}
      `}
      title={collapsed ? label : undefined}
    >
      <div className={`shrink-0 ${isActive ? (darkMode ? 'text-emerald-300' : 'text-emerald-600') : ''}`}><Icon size={18} /></div>
      {!collapsed && (
        <span className="truncate animate-in fade-in duration-200 tracking-tight">{label}</span>
      )}
      {!collapsed && isActive && (
        <div className={`ml-auto w-2 h-2 rounded-full ${darkMode ? 'bg-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-emerald-600 shadow-md'}`} />
      )}
    </Link>
  );
}

