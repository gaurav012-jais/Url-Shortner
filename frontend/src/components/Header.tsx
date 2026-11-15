import React, { useState } from 'react';
import { User } from '../types';
import { ZeLnkLogo } from './ZeLnkLogo';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onOpenMobileNav?: () => void;
  activeView?: string;
  onNavigate?: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  setSearchQuery,
  currentUser,
  onOpenAuthModal,
  onLogout,
  onOpenMobileNav,
  activeView,
  onNavigate,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-14 bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/30 z-30 flex items-center justify-between px-3 sm:px-6">
      {/* Left: Mobile Menu Toggle + Search Bar */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-md mr-2">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="lg:hidden p-1.5 rounded-lg text-on-surface hover:bg-surface-container transition shrink-0 flex items-center justify-center active:scale-95"
          title="Open navigation menu"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        {/* Mobile Brand Logo Icon */}
        <div className="hidden sm:flex lg:hidden items-center shrink-0">
          <ZeLnkLogo size="sm" showText={false} />
        </div>

        {/* Search Input */}
        <div className="relative w-full flex items-center">
          <span className="material-symbols-outlined text-outline absolute left-2.5 text-[17px] pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Search links, aliases... (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 bg-surface-container-low border border-outline-variant/30 rounded-lg pl-8 pr-3 sm:pr-10 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-body"
          />
          <kbd className="hidden sm:block absolute right-2 font-code text-outline border border-outline-variant/40 bg-surface-container px-1.5 py-0.5 rounded text-[10px]">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls: Telemetry + Top-Corner Account Status */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Telemetry Indicator (Desktop) */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary-container/15 text-tertiary text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
          <span>HTTP 302 Active</span>
        </div>

        {/* Exclusive: Upgrade Pill for Free Users */}
        {currentUser && currentUser.role !== 'admin' && currentUser.plan !== 'pro' && currentUser.plan !== 'enterprise' && onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('subscription')}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-primary/20 hover:from-amber-500/30 hover:to-primary/30 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-bold transition shadow-sm active:scale-95 whitespace-nowrap"
            title="Upgrade to Pro for unlimited clicks & password protection"
          >
            <span className="material-symbols-outlined text-[14px] text-amber-500">star</span>
            <span>Upgrade to Pro</span>
          </button>
        )}

        {/* Exclusive: Admin Console Mode Switcher Button */}
        {currentUser?.role === 'admin' && onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate(activeView === 'admin' ? 'overview' : 'admin')}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold transition shadow-sm active:scale-95 whitespace-nowrap ${
              activeView === 'admin'
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/25 ring-2 ring-purple-400/40'
                : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30'
            }`}
            title="Switch between Admin Console and User Workspace"
          >
            <span className="material-symbols-outlined text-[15px] sm:text-[17px]">
              {activeView === 'admin' ? 'dashboard' : 'shield_person'}
            </span>
            <span className="hidden sm:inline">
              {activeView === 'admin' ? 'User Dashboard' : 'Admin Console'}
            </span>
            <span className="sm:hidden font-bold">
              {activeView === 'admin' ? 'User' : 'Admin'}
            </span>
          </button>
        )}

        {/* --- Top Corner: User or Guest Account Badge --- */}
        {currentUser ? (
          /* Case A: Logged-in User Profile */
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-surface-container-low transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-on-primary text-xs font-bold shadow-sm overflow-hidden shrink-0">
                {currentUser.profile_picture_url ? (
                  <img
                    src={currentUser.profile_picture_url}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  currentUser.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-xs text-on-surface font-medium truncate max-w-[110px]">
                  {currentUser.name}
                </span>
                <div className="flex items-center gap-1">
                  {currentUser.role === 'admin' ? (
                    <span className="font-code text-purple-600 dark:text-purple-400 font-bold text-[10px]">
                      🛡️ Admin
                    </span>
                  ) : currentUser.plan === 'pro' ? (
                    <span className="font-code text-primary font-bold text-[10px]">
                      ⚡ Pro
                    </span>
                  ) : currentUser.plan === 'enterprise' ? (
                    <span className="font-code text-indigo-500 font-bold text-[10px]">
                      🏢 Enterprise
                    </span>
                  ) : (
                    <span className="font-code text-on-surface-variant text-[10px]">
                      Free Plan
                    </span>
                  )}
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
                expand_more
              </span>
            </button>

            {/* User Dropdown */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-52 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xl py-1.5 z-50 text-xs animate-fade-in">
                <div className="px-3 py-2 border-b border-outline-variant/20">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-on-surface truncate">{currentUser.name}</p>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-surface-container text-primary font-code">
                      {currentUser.role === 'admin' ? 'Admin' : currentUser.plan || 'Free'}
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant truncate mt-0.5">{currentUser.email}</p>
                </div>

                {onNavigate && (
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      onNavigate('subscription');
                    }}
                    className="w-full text-left px-3 py-2 text-primary hover:bg-primary/10 flex items-center gap-2 transition font-medium"
                  >
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>Plans & Billing</span>
                  </button>
                )}

                {currentUser.role === 'admin' && onNavigate && (
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      onNavigate(activeView === 'admin' ? 'overview' : 'admin');
                    }}
                    className="w-full text-left px-3 py-2 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 flex items-center gap-2 transition font-semibold"
                  >
                    <span className="material-symbols-outlined text-[16px]">shield_person</span>
                    <span>{activeView === 'admin' ? 'User Dashboard' : 'Admin Console'}</span>
                  </button>
                )}

                <div className="border-t border-outline-variant/20 my-1" />

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    onLogout();
                  }}
                  className="w-full text-left px-3 py-2 text-error hover:bg-error-container/20 flex items-center gap-2 transition"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Case B: Guest Account Badge in Top Corner (As requested: "bass top corner pe likh dena guest account h") */
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowGuestDropdown(!showGuestDropdown)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] sm:text-xs font-medium transition shadow-sm active:scale-95 whitespace-nowrap shrink-0"
              title="Guest Session Active • Click for details"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span className="font-semibold whitespace-nowrap">Guest Account</span>
              <span className="material-symbols-outlined text-[14px] sm:text-[15px] text-amber-600 shrink-0">
                expand_more
              </span>
            </button>

            {/* Guest Details & Sign In Popover */}
            {showGuestDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-xl p-3.5 z-50 text-xs flex flex-col gap-2.5 animate-fade-in">
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="font-semibold text-on-surface">Guest Account</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-semibold font-code">
                    15m Limit
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Links created in guest mode automatically expire in 15 minutes. Sign in or register to preserve your links forever!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowGuestDropdown(false);
                    onOpenAuthModal();
                  }}
                  className="w-full py-1.5 px-3 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[15px]">login</span>
                  <span>Sign In / Register</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
