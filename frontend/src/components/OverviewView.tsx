import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { UrlItem, AnalyticsOverview } from '../types';
import { analyticsApi, urlApi } from '../services/api';

interface OverviewViewProps {
  urls: UrlItem[];
  onNavigateToLinks: () => void;
  onOpenQr: (url: UrlItem) => void;
  onOpenAnalytics?: (url: UrlItem) => void;
  onLinkCreated: (link: UrlItem) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  urls,
  onNavigateToLinks,
  onOpenQr,
  onOpenAnalytics,
  onLinkCreated,
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [quickUrl, setQuickUrl] = useState('');
  const [quickAlias, setQuickAlias] = useState('');
  const [loadingQuick, setLoadingQuick] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7D' | '30D'>('7D');

  const fetchAnalytics = async () => {
    try {
      const res = await analyticsApi.getOverview();
      setAnalytics(res);
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [urls]);

  const handleQuickShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrl.trim()) return;

    let clean = quickUrl.trim();
    if (!/^https?:\/\//i.test(clean)) clean = `https://${clean}`;

    try {
      setLoadingQuick(true);
      const res = await urlApi.shortenUrl({
        original_url: clean,
        custom_alias: quickAlias.trim() || undefined,
      });
      onLinkCreated(res);
      setQuickUrl('');
      setQuickAlias('');
      fetchAnalytics();
    } catch (err) {
      console.error('Quick shorten failed:', err);
    } finally {
      setLoadingQuick(false);
    }
  };

  const totalClicks = analytics?.totalClicks ?? urls.reduce((sum, u) => sum + u.clicks_count, 0);
  const totalLinks = analytics?.totalLinks ?? urls.length;
  const activeCount = analytics?.activeLinks ?? urls.filter((u) => u.is_active && !u.is_expired).length;
  const activeRatio = totalLinks > 0 ? ((activeCount / totalLinks) * 100).toFixed(1) : '100.0';
  const avgClicks = totalLinks > 0 ? (totalClicks / totalLinks).toFixed(1) : '0.0';

  const defaultPast7Days = [
    { date: 'Mon', clicks: 0 },
    { date: 'Tue', clicks: 0 },
    { date: 'Wed', clicks: 0 },
    { date: 'Thu', clicks: 0 },
    { date: 'Fri', clicks: 0 },
    { date: 'Sat', clicks: 0 },
    { date: 'Sun', clicks: totalClicks },
  ];

  const chartData =
    analytics && analytics.clickVolumeTrend && analytics.clickVolumeTrend.length > 0
      ? analytics.clickVolumeTrend
      : defaultPast7Days;

  const deviceDistribution = analytics?.deviceDistribution || [
    { name: 'Desktop', value: 0 },
    { name: 'Mobile', value: 0 },
    { name: 'Tablet', value: 0 },
  ];

  const browserDistribution = analytics?.browserDistribution || [
    { name: 'Chrome', value: 0 },
    { name: 'Safari', value: 0 },
    { name: 'Firefox', value: 0 },
  ];

  return (
    <div className="p-3 sm:p-5 lg:p-6 max-w-[1440px] mx-auto w-full flex flex-col gap-3.5 sm:gap-5 animate-screen">
      {/* Top Quick Shortener Bar */}
      <div className="bg-surface-container-lowest rounded-xl p-2.5 sm:p-3 shadow-sm border border-outline-variant/30 animate-card-1">
        <form onSubmit={handleQuickShorten} className="flex flex-col md:flex-row items-center gap-2">
          <div className="hidden sm:flex items-center pl-2 text-outline pointer-events-none">
            <span className="material-symbols-outlined text-[20px] text-primary">link</span>
          </div>

          <div className="flex-1 w-full flex items-center min-w-0 bg-surface-container-low sm:bg-transparent rounded-lg px-2 sm:px-0">
            <span className="sm:hidden material-symbols-outlined text-[18px] text-primary mr-1.5">link</span>
            <input
              type="text"
              value={quickUrl}
              onChange={(e) => setQuickUrl(e.target.value)}
              placeholder="Paste a long URL to shorten..."
              className="w-full bg-transparent py-2 text-xs font-code text-on-surface placeholder:text-outline outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-between sm:justify-end">
            <div className="flex-1 sm:flex-initial flex items-center gap-1 px-2.5 py-1.5 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs font-code">
              <span className="text-on-surface-variant font-bold">/</span>
              <input
                type="text"
                value={quickAlias}
                onChange={(e) => setQuickAlias(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="custom-name"
                className="w-full sm:w-28 bg-transparent text-xs font-code text-on-surface font-semibold outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loadingQuick}
              className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold flex items-center gap-1.5 transition shadow-sm whitespace-nowrap active:scale-95 shrink-0"
            >
              {loadingQuick ? (
                <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></div>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">link</span>
                  <span>Shorten</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 4-Grid KPI Stats: 2x2 on Mobile, 4-col on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Stat 1: Total Links */}
        <div className="bg-surface-container-lowest rounded-xl p-3 sm:p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between active:scale-[0.99] hover-lift transition animate-card-1">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
              Total Links
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">hub</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-code text-on-surface tracking-tight">
              {totalLinks}
            </div>
            <div className="flex items-center gap-1 mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-on-surface-variant font-medium">
              <span>All created links</span>
            </div>
          </div>
        </div>

        {/* Stat 2: Total Clicks */}
        <div className="bg-surface-container-lowest rounded-xl p-3 sm:p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between active:scale-[0.99] hover-lift transition animate-card-2">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
              Total Clicks
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">ads_click</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-code text-on-surface tracking-tight">
              {totalClicks}
            </div>
            <div className="flex items-center gap-1 mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-on-surface-variant font-medium">
              <span>Total visitors</span>
            </div>
          </div>
        </div>

        {/* Stat 3: Active Ratio */}
        <div className="bg-surface-container-lowest rounded-xl p-3 sm:p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between active:scale-[0.99] hover-lift transition animate-card-3">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
              Active Ratio
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">verified</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-code text-on-surface tracking-tight">
              {activeRatio}%
            </div>
            <div className="flex items-center gap-1 mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-on-surface-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
              <span className="font-semibold text-on-surface">{activeCount}</span>
              <span>live</span>
            </div>
          </div>
        </div>

        {/* Stat 4: Avg Clicks */}
        <div className="bg-surface-container-lowest rounded-xl p-3 sm:p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between active:scale-[0.99] hover-lift transition animate-card-4">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
              Avg Clicks
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">bar_chart</span>
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold font-code text-on-surface tracking-tight">
              {avgClicks}
            </div>
            <div className="flex items-center gap-1 mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-on-surface-variant font-medium">
              <span>Clicks per link</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Telemetry Area (Chart + Device Distribution) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Telemetry Chart (8 cols) */}
        <div className="xl:col-span-8 bg-surface-container-lowest rounded-xl p-3.5 sm:p-5 shadow-sm border border-outline-variant/30 flex flex-col justify-between animate-card-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-outline-variant/20">
            <div>
              <h2 className="font-semibold text-xs sm:text-sm text-on-surface">Click Analytics</h2>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Total click trends across your active links
              </p>
            </div>

            <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg self-start border border-outline-variant/30 text-xs">
              {(['24h', '7D', '30D'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition ${
                    timeRange === r
                      ? 'bg-surface-container-lowest text-primary shadow-sm font-semibold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div className="h-52 sm:h-64 w-full pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="clickColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4a40c1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4a40c1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f8" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#474554' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#474554' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #c8c4d6',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  itemStyle={{ color: '#4a40c1', fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="clicks"
                  stroke="#4a40c1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#clickColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device & Browser Distribution (4 cols) */}
        <div className="xl:col-span-4 bg-surface-container-lowest rounded-xl p-3.5 sm:p-5 shadow-sm border border-outline-variant/30 flex flex-col gap-4 animate-card-3">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20 mb-2.5">
              <span className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">devices</span>
                Devices
              </span>
            </div>

            <div className="space-y-2">
              {deviceDistribution.map((dev) => (
                <div key={dev.name} className="space-y-1">
                  <div className="flex justify-between text-xs text-on-surface font-medium">
                    <span>{dev.name}</span>
                    <span className="font-code text-on-surface-variant text-[11px]">{dev.value} clicks</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-container-low overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{
                        width: totalClicks > 0 ? `${Math.min(100, (dev.value / totalClicks) * 100)}%` : '0%',
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20 mb-2.5">
              <span className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">public</span>
                Browsers
              </span>
            </div>

            <div className="space-y-2">
              {browserDistribution.map((br) => (
                <div key={br.name} className="space-y-1">
                  <div className="flex justify-between text-xs text-on-surface font-medium">
                    <span>{br.name}</span>
                    <span className="font-code text-on-surface-variant text-[11px]">{br.value}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-container-low overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{
                        width: totalClicks > 0 ? `${Math.min(100, (br.value / totalClicks) * 100)}%` : '0%',
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Links */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-sm p-3.5 sm:p-5 flex flex-col gap-3 animate-card-4">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">history</span>
            <h2 className="font-semibold text-xs sm:text-sm text-on-surface">Recent Links</h2>
          </div>
          <button
            onClick={onNavigateToLinks}
            className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5"
          >
            <span>View All ({urls.length})</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </button>
        </div>

        {urls.length === 0 ? (
          <div className="py-6 text-center text-xs text-on-surface-variant">
            No links created yet. Paste a link above to get started.
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/15">
            {urls.slice(0, 5).map((link) => (
              <div key={link.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-on-surface truncate">
                    {link.title || link.short_code}
                  </p>
                  <p className="font-code text-xs text-primary font-bold">
                    /{link.short_code}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-code text-[11px] text-on-surface font-semibold bg-surface-container px-2 py-0.5 rounded">
                    {link.clicks_count} clicks
                  </span>
                  <button
                    onClick={() => onOpenAnalytics?.(link)}
                    className="p-1 rounded text-on-surface-variant hover:text-primary transition"
                    title="Deep Analytics"
                  >
                    <span className="material-symbols-outlined text-[16px]">query_stats</span>
                  </button>
                  <button
                    onClick={() => onOpenQr(link)}
                    className="p-1 rounded text-on-surface-variant hover:text-primary transition"
                    title="QR Code"
                  >
                    <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
                  </button>
                  <a
                    href={link.short_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded text-on-surface-variant hover:text-primary transition"
                    title="Open Link"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
