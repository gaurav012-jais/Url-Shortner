import React from 'react';
import { Link2, ShieldCheck } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Link2 className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white tracking-tight">LinkCraft</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                In-House
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Industrial URL Engine & Analytics</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-medium text-slate-400">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Local Engine Active</span>
          </div>
          <div className="hidden md:flex items-center space-x-1 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>HTTP 302 Redirection</span>
          </div>
        </div>
      </div>
    </header>
  );
};
