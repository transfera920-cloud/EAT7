import React from 'react';
import { Mountain, Compass, Lock } from 'lucide-react';

interface FooterProps {
  onOpenAdmin: () => void;
  isAdminLoggedIn: boolean;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdmin, isAdminLoggedIn }) => {
  return (
    <footer className="border-t border-slate-900 bg-slate-950 text-slate-400 text-xs py-8 mt-12">
      <div className="max-w-6xl mx-auto px-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-slate-300">
            <Mountain className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-white">下山慶功宴搜尋系統</span>
            <span className="text-slate-600">|</span>
            <span className="text-xs text-slate-400">專為山友量身打造的下山美食地圖</span>
          </div>

          <div className="flex items-center space-x-4 text-slate-400">
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Compass className="w-3.5 h-3.5 text-emerald-500" />
              <span>Google Maps Platform 官方即時路線驅動</span>
            </span>

            <button
              id="footer-admin-btn"
              type="button"
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-emerald-400 transition-colors"
            >
              <Lock className="w-3 h-3" />
              <span>{isAdminLoggedIn ? '後台已登入' : '管理員後台'}</span>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-900/80 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} 下山慶功宴搜尋系統. All rights reserved.</p>
          <p>
            搜尋資料與路線計算均來自 Google Maps Platform，並遵守{' '}
            <a
              href="https://cloud.google.com/maps-platform/terms?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-emerald-400 underline"
            >
              Google Maps Platform 服務條款
            </a>
            。
          </p>
        </div>
      </div>
    </footer>
  );
};
