import React, { useState, useEffect } from 'react';
import { UrlItem } from '../types';

interface LinksListViewProps {
  urls: UrlItem[];
  loading: boolean;
  searchQuery: string;
  onNavigateToCreate: () => void;
  onToggleActive: (id: string) => void;
  onDeleteUrl: (id: string) => void;
  onOpenQr: (url: UrlItem) => void;
  onOpenAnalytics?: (url: UrlItem) => void;
}

const LINKS_PER_PAGE = 10;

export const LinksListView: React.FC<LinksListViewProps> = ({
  urls,
  loading,
  searchQuery,
  onNavigateToCreate,
  onToggleActive,
  onDeleteUrl,
  onOpenQr,
  onOpenAnalytics,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleExportCsv = () => {
    if (urls.length === 0) return;
    const headers = ['Short Code', 'Short URL', 'Original Destination', 'Clicks', 'Status', 'Tags', 'Created At'];
    const rows = urls.map((u) => [
      `"${u.short_code}"`,
      `"${u.short_url}"`,
      `"${u.original_url.replace(/"/g, '""')}"`,
      u.clicks_count,
      u.is_expired ? 'Expired' : u.is_active ? 'Active' : 'Disabled',
      `"${(u.tags || []).join(', ')}"`,
      `"${new Date(u.created_at).toISOString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zelnk-routes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = (id: string, shortUrl: string) => {
    navigator.clipboard.writeText(shortUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredUrls = urls.filter((u) => {
    // Status filter
    if (statusFilter === 'active' && (!u.is_active || u.is_expired)) return false;
    if (statusFilter === 'inactive' && u.is_active && !u.is_expired) return false;

    // Search query
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      u.short_code.toLowerCase().includes(term) ||
      u.original_url.toLowerCase().includes(term) ||
      (u.title && u.title.toLowerCase().includes(term))
    );
  });

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredUrls.length / LINKS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUrls = filteredUrls.slice((safePage - 1) * LINKS_PER_PAGE, safePage * LINKS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-[1440px] mx-auto w-full flex flex-col gap-3.5 sm:gap-5">
      {/* Telemetry Edge Banner */}
      <div className="px-3 sm:px-4 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] sm:text-xs text-on-surface-variant font-code">
        <div className="flex items-center gap-2 truncate">
          <span className="flex items-center gap-1 text-primary font-medium truncate">
            <span className="material-symbols-outlined text-[15px]">bolt</span>
            Routing Edge: Local Engine
          </span>
          <span>/</span>
          <span className="text-on-surface font-semibold truncate">PostgreSQL Mesh</span>
        </div>
        <div className="flex items-center gap-1.5 text-tertiary font-semibold shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
          <span>100% Operational</span>
        </div>
      </div>

      {/* Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-on-surface tracking-tight">
              All Links
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-code text-[11px] sm:text-xs font-semibold">
              {urls.length} total
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-on-surface-variant">
            Manage custom routing rules, monitor click telemetry, and toggle active endpoints.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={urls.length === 0}
            className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium transition flex items-center justify-center gap-1.5 border border-outline-variant/30 disabled:opacity-50 shadow-sm"
            title="Download links as CSV"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Export CSV</span>
          </button>

          <button
            onClick={onNavigateToCreate}
            className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Create Link</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2 overflow-x-auto no-scrollbar whitespace-nowrap">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            statusFilter === 'all'
              ? 'bg-surface-container text-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          All Routes ({urls.length})
        </button>
        <button
          onClick={() => setStatusFilter('active')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            statusFilter === 'active'
              ? 'bg-surface-container text-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          Active ({urls.filter((u) => u.is_active && !u.is_expired).length})
        </button>
        <button
          onClick={() => setStatusFilter('inactive')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            statusFilter === 'inactive'
              ? 'bg-surface-container text-primary font-semibold shadow-sm'
              : 'text-on-surface-variant hover:bg-surface-container-low'
          }`}
        >
          Inactive / Expired ({urls.filter((u) => !u.is_active || u.is_expired).length})
        </button>
      </div>

      {/* Loading & Empty State */}
      {loading && urls.length === 0 ? (
        <div className="py-16 bg-surface-container-lowest rounded-xl border border-outline-variant/30 flex flex-col items-center justify-center space-y-2 text-on-surface-variant text-xs">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span>Loading link telemetry...</span>
        </div>
      ) : filteredUrls.length === 0 ? (
        <div className="py-12 px-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-center">
          <span className="material-symbols-outlined text-[40px] text-outline mb-2">link_off</span>
          <p className="text-sm font-semibold text-on-surface">No links found</p>
          <p className="text-xs text-on-surface-variant mt-1 mb-4">
            {searchQuery ? 'No links match your search query.' : 'Get started by creating your first custom named link.'}
          </p>
          <button
            onClick={onNavigateToCreate}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-medium shadow-sm hover:bg-primary-container transition"
          >
            Create Link Now
          </button>
        </div>
      ) : (
        <>
          {/* ============================================================== */}
          {/* 1. MOBILE LINK CARDS VIEW (< 768px): Purpose-built for phones */}
          {/* ============================================================== */}
          <div className="md:hidden flex flex-col gap-3">
            {paginatedUrls.map((item) => {
              const isInactive = !item.is_active || item.is_expired;

              return (
                <div
                  key={item.id}
                  className={`relative flex flex-col p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm transition-all gap-2.5 ${
                    isInactive ? 'opacity-75 bg-surface-container-low/20' : ''
                  }`}
                >
                  {/* Card Header: Favicon + Short Link + Copy Button */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center overflow-hidden border border-outline-variant/30 flex-shrink-0">
                        {item.favicon ? (
                          <img
                            src={item.favicon}
                            alt=""
                            className="w-4 h-4 object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                            link
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-code text-[13px] font-bold text-on-surface truncate">
                            /{item.short_code}
                          </span>
                          {item.has_password && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-code text-[10px] font-semibold shrink-0"
                              title="Password Protected"
                            >
                              <span className="material-symbols-outlined text-[11px]">lock</span>
                              Protected
                            </span>
                          )}
                          <button
                            onClick={() => handleCopy(item.id, item.short_url)}
                            className="p-1 rounded text-outline hover:text-primary transition-colors shrink-0"
                            title="Copy short link"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {copiedId === item.id ? 'check' : 'content_copy'}
                            </span>
                          </button>
                        </div>
                        {item.title && (
                          <p className="text-xs font-medium text-on-surface truncate max-w-[200px]">
                            {item.title}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {item.is_expired ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-error-container text-on-error-container text-[10px] font-semibold">
                          <span className="material-symbols-outlined text-[12px]">timer_off</span>
                          Expired
                        </span>
                      ) : !item.is_active ? (
                        (item.failed_password_attempts || 0) >= 10 ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-error-container text-on-error-container text-[10px] font-semibold"
                            title="Locked after 10 failed password attempts"
                          >
                            <span className="material-symbols-outlined text-[12px]">lock_clock</span>
                            Locked (10 tries)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[10px] font-medium">
                            Disabled
                          </span>
                        )
                      ) : (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-tertiary-fixed/30 text-on-tertiary-fixed text-[10px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                            Active
                          </span>
                          {item.expires_at && (
                            <span
                              className="text-[9px] text-amber-600 dark:text-amber-400 font-code flex items-center gap-0.5"
                              title={`Expires at ${new Date(item.expires_at).toLocaleString()}`}
                            >
                              <span className="material-symbols-outlined text-[10px]">schedule</span>
                              Exp: {new Date(item.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Destination URL */}
                  <div className="pl-10 text-[11px] font-code text-on-surface-variant truncate">
                    <span
                      className="truncate block select-all cursor-text text-on-surface-variant/90"
                      title={item.original_url}
                    >
                      {item.original_url}
                    </span>
                  </div>

                  {/* Tags Chips if available */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex items-center gap-1 pl-10 flex-wrap">
                      {item.tags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-code text-[10px]"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Card Footer: Clicks count + Quick Touch Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant/15 pl-1">
                    <div className="flex items-center gap-2 text-on-surface-variant text-[11px]">
                      <div className="flex items-center gap-1 font-semibold text-on-surface font-code">
                        <span className="material-symbols-outlined text-[15px] text-primary">touch_app</span>
                        <span>{item.clicks_count.toLocaleString()}</span>
                      </div>
                      <span className="text-outline">·</span>
                      <span className="text-outline text-[10px]">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Quick Thumb Actions */}
                    <div className="flex items-center gap-1">
                      <a
                        href={item.short_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary transition"
                        title="Open Short Link"
                      >
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      </a>
                      <button
                        onClick={() => onOpenQr(item)}
                        className="p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary transition"
                        title="QR Code"
                      >
                        <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                      </button>
                      <button
                        onClick={() => onOpenAnalytics?.(item)}
                        className="p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary transition"
                        title="Analytics"
                      >
                        <span className="material-symbols-outlined text-[16px]">query_stats</span>
                      </button>
                      <button
                        onClick={() => onToggleActive(item.id)}
                        className={`p-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container transition ${
                          item.is_active ? 'text-tertiary' : 'text-outline'
                        }`}
                        title={item.is_active ? 'Disable' : 'Enable'}
                      >
                        <span className="material-symbols-outlined text-[16px]">power_settings_new</span>
                      </button>
                      <button
                        onClick={() => onDeleteUrl(item.id)}
                        className="p-1.5 rounded-lg bg-surface-container-low hover:bg-error-container text-on-surface-variant hover:text-error transition"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ============================================================== */}
          {/* 2. DESKTOP / TABLET TABLE VIEW (≥ 768px): Structured wide table */}
          {/* ============================================================== */}
          <div className="hidden md:block bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/20 bg-surface-container-low/40 text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                    <th className="py-3 px-4">Custom Route &amp; Title</th>
                    <th className="py-3 px-4">Target Destination</th>
                    <th className="py-3 px-4 text-center">Clicks</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-xs">
                  {paginatedUrls.map((item) => {
                    const isInactive = !item.is_active || item.is_expired;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-surface-container-low/50 transition-colors ${
                          isInactive ? 'opacity-70 bg-surface-container-low/20' : ''
                        }`}
                      >
                        {/* Custom Route & Title */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center overflow-hidden border border-outline-variant/30 flex-shrink-0">
                              {item.favicon ? (
                                <img
                                  src={item.favicon}
                                  alt=""
                                  className="w-4 h-4 object-contain"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                                  link
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-on-surface text-xs truncate max-w-xs">
                                {item.title || item.short_code}
                              </div>
                              <div className="flex items-center gap-1.5 font-code text-xs text-primary font-bold mt-0.5">
                                <span>/{item.short_code}</span>
                                {item.has_password && (
                                  <span
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-code text-[10px] font-semibold"
                                    title="Password Protected"
                                  >
                                    <span className="material-symbols-outlined text-[11px]">lock</span>
                                    Protected
                                  </span>
                                )}
                                <button
                                  onClick={() => handleCopy(item.id, item.short_url)}
                                  className="p-0.5 rounded text-on-surface-variant hover:text-primary transition"
                                  title="Copy short link"
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    {copiedId === item.id ? 'check' : 'content_copy'}
                                  </span>
                                </button>
                              </div>
                              {item.tags && item.tags.length > 0 && (
                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                  {item.tags.map((t) => (
                                    <span
                                      key={t}
                                      className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-code text-[10px]"
                                    >
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Destination */}
                        <td className="py-3.5 px-4 font-code text-xs text-on-surface-variant max-w-xs truncate">
                          <span
                            className="truncate block select-all cursor-text text-on-surface-variant/90"
                            title={item.original_url}
                          >
                            {item.original_url}
                          </span>
                        </td>

                        {/* Clicks */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface font-code text-xs font-semibold">
                            <span className="material-symbols-outlined text-[13px] text-primary">
                              ads_click
                            </span>
                            <span>{item.clicks_count}</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {item.is_expired ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[11px] font-medium"
                              title={item.expires_at ? `Expired on ${new Date(item.expires_at).toLocaleString()}` : 'Expired'}
                            >
                              <span className="material-symbols-outlined text-[12px]">timer_off</span>
                              Expired
                            </span>
                          ) : !item.is_active ? (
                            (item.failed_password_attempts || 0) >= 10 ? (
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container text-[11px] font-semibold"
                                title="Locked after 10 failed password attempts"
                              >
                                <span className="material-symbols-outlined text-[12px]">lock_clock</span>
                                Locked (10 tries)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-medium">
                                Disabled
                              </span>
                            )
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tertiary-container/15 text-tertiary text-[11px] font-semibold w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                                Active
                              </span>
                              {item.expires_at && (
                                <span
                                  className="text-[10px] text-amber-600 dark:text-amber-400 font-code flex items-center gap-0.5"
                                  title={`Expires at ${new Date(item.expires_at).toLocaleString()}`}
                                >
                                  <span className="material-symbols-outlined text-[11px]">schedule</span>
                                  Exp: {new Date(item.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Created */}
                        <td className="py-3.5 px-4 text-on-surface-variant text-[11px]">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <a
                              href={item.short_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant hover:text-primary transition"
                              title="Test Redirection"
                            >
                              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                            </a>

                            <button
                              onClick={() => onOpenAnalytics?.(item)}
                              className="p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant hover:text-primary transition"
                              title="Deep Telemetry & Analytics"
                            >
                              <span className="material-symbols-outlined text-[16px]">query_stats</span>
                            </button>

                            <button
                              onClick={() => onOpenQr(item)}
                              className="p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant hover:text-primary transition"
                              title="QR Code"
                            >
                              <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                            </button>

                            <button
                              onClick={() => onToggleActive(item.id)}
                              className={`p-1.5 rounded-md hover:bg-surface-container transition ${
                                item.is_active ? 'text-tertiary' : 'text-outline'
                              }`}
                              title={item.is_active ? 'Disable Route' : 'Activate Route'}
                            >
                              <span className="material-symbols-outlined text-[16px]">power_settings_new</span>
                            </button>

                            <button
                              onClick={() => onDeleteUrl(item.id)}
                              className="p-1.5 rounded-md hover:bg-surface-container text-on-surface-variant hover:text-error transition"
                              title="Delete Route"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* 3. DEVICE-ADAPTIVE PAGINATION BAR                             */}
      {/* ============================================================== */}
      {filteredUrls.length > LINKS_PER_PAGE && (
        <div className="mt-2 pt-2">
          {/* Mobile Pagination (< 640px): Compact, thumb-friendly matching phone version */}
          <div className="flex sm:hidden items-center justify-between px-1">
            <span className="text-[11px] font-code text-on-surface-variant">
              {(safePage - 1) * LINKS_PER_PAGE + 1}–{Math.min(safePage * LINKS_PER_PAGE, filteredUrls.length)} of{' '}
              <strong className="text-on-surface">{filteredUrls.length}</strong>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(safePage - 1)}
                disabled={safePage === 1}
                className="w-8 h-8 rounded-lg bg-surface-container-low text-on-surface flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:bg-surface-container transition shadow-sm"
                title="Previous page"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <span className="font-code text-xs px-2 text-on-surface font-semibold">
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(safePage + 1)}
                disabled={safePage === totalPages}
                className="w-8 h-8 rounded-lg bg-surface-container-low text-on-surface flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:bg-surface-container transition shadow-sm"
                title="Next page"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Desktop Pagination (≥ 640px): Full page list */}
          <div className="hidden sm:flex items-center justify-between px-1">
            <p className="text-xs text-on-surface-variant font-code">
              Showing{' '}
              <span className="font-semibold text-on-surface">
                {(safePage - 1) * LINKS_PER_PAGE + 1}–{Math.min(safePage * LINKS_PER_PAGE, filteredUrls.length)}
              </span>{' '}
              of <span className="font-semibold text-on-surface">{filteredUrls.length}</span> routes
            </p>

            <div className="flex items-center gap-1">
              {/* Prev */}
              <button
                onClick={() => handlePageChange(safePage - 1)}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '...' ? (
                    <span key={`dot-${idx}`} className="px-2 text-xs text-on-surface-variant">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p as number)}
                      className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold transition border ${
                        safePage === p
                          ? 'bg-primary text-on-primary border-primary shadow-sm'
                          : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              {/* Next */}
              <button
                onClick={() => handlePageChange(safePage + 1)}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
