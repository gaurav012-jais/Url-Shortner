import React from 'react';
import { ZeLnkLogo } from './ZeLnkLogo';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalLinksCount: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isAdmin?: boolean;
  workspaceName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile = false,
  onCloseMobile,
  isAdmin = false,
  workspaceName = 'personal-prod',
}) => {
  const baseNavItems = [
    { id: 'overview', label: 'Overview', icon: 'space_dashboard' },
    { id: 'create-link', label: 'Create Link', icon: 'add_circle' },
    { id: 'links', label: 'Links', icon: 'link' },
    { id: 'qr-codes', label: 'QR Codes', icon: 'qr_code_2' },
    { id: 'subscription', label: 'Plans & Billing', icon: 'verified' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const navItems = isAdmin
    ? [...baseNavItems, { id: 'admin', label: 'Admin Console', icon: 'shield_person' }]
    : baseNavItems;

  return (
    <aside
      className={`fixed left-0 top-0 h-full w-64 bg-surface-container-lowest flex flex-col justify-between z-50 border-r border-outline-variant/30 select-none transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpenMobile
        ? 'translate-x-0 shadow-2xl'
        : '-translate-x-full lg:shadow-[0_1px_8px_rgba(0,0,0,0.02)]'
        }`}
    >
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <ZeLnkLogo size="sm" />
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-code">
              v3.4
            </span>
          </div>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition"
            title="Close navigation"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Workspace Selector */}
        <div className="px-3 py-2.5">
          <div className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30 hover:border-outline-variant transition-colors cursor-pointer">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-5 h-5 rounded bg-primary text-on-primary flex items-center justify-center text-[10px] font-code font-bold shrink-0">
                {(workspaceName || 'P').trim().charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-on-surface font-semibold truncate" title={workspaceName || 'personal-prod'}>
                {workspaceName || 'personal-prod'}
              </span>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[16px] shrink-0">
              unfold_more
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1 px-3 pt-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onCloseMobile?.();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${isActive
                  ? 'bg-surface-container text-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface font-medium'
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <span
                      className={`material-symbols-outlined text-[18px] ${isActive ? 'text-primary' : 'text-on-surface-variant'
                        }`}
                    >
                      {item.icon}
                    </span>
                  </div>
                  <span className="truncate text-left text-[13px] leading-tight">{item.label}</span>
                </div>

              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-3.5 border-t border-outline-variant/20 flex flex-col gap-1.5 bg-surface-container-lowest">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-tertiary shrink-0 animate-pulse"></span>
            <span className="text-tertiary font-semibold text-[11px] truncate">PostgreSQL Active</span>
          </div>
          <span className="font-code text-[10px] text-outline px-1.5 py-0.5 rounded bg-surface-container-low border border-outline-variant/30 shrink-0">
            v2.4
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-code">
          <span className="truncate">HTTP 302 Mesh</span>
          <span className="text-outline shrink-0">&lt;20ms</span>
        </div>
      </div>
    </aside>
  );
};
