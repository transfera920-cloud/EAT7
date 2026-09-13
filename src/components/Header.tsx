import React from 'react';
import { Mountain, Lock, Compass } from 'lucide-react';
import type { SiteSettings } from '../types.ts';

interface HeaderProps {
  settings: SiteSettings;
  onOpenAdmin: () => void;
  isAdminLoggedIn: boolean;
}

export const Header: React.FC<HeaderProps> = ({ settings, onOpenAdmin, isAdminLoggedIn }) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
            <Mountain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                {settings.siteTitle || '下山慶功宴搜尋系統'}
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Compass className="w-3 h-3 mr-1" />
                Google Maps 即時車程篩選
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {settings.siteDescription || '登山下山後，以登山口為起點，搜尋指定車程時間內的慶功宴美食'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="btn-admin-access"
            type="button"
            onClick={onOpenAdmin}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
              isAdminLoggedIn
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 border-slate-700/60'
            }`}
            title="管理後台"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAdminLoggedIn ? '後台管理中' : '管理後台'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
