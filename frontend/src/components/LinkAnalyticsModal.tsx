import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { UrlItem, LinkAnalyticsDetail } from '../types';
import { analyticsApi } from '../services/api';

interface LinkAnalyticsModalProps {
  url: UrlItem | null;
  onClose: () => void;
}

export const LinkAnalyticsModal: React.FC<LinkAnalyticsModalProps> = ({ url, onClose }) => {
  const [data, setData] = useState<LinkAnalyticsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) {
      setData(null);
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await analyticsApi.getUrlAnalytics(url.id);
        setData(res);
      } catch (err) {
        console.error('Failed to load link analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();

    // Live update telemetry while modal is open every 4 seconds
    const interval = setInterval(() => {
      if (!document.hidden && url) {
        analyticsApi.getUrlAnalytics(url.id).then(setData).catch(() => {});
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [url]);

  if (!url) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url.short_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/50">
          <div className="flex items-center gap-3 min-w-0">
            {url.favicon ? (
              <img
                src={url.favicon}
                alt=""
                className="w-8 h-8 rounded-lg object-contain p-1 bg-white border border-outline-variant/30 shrink-0"
                onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center font-bold text-xs shrink-0">
                <span className="material-symbols-outlined text-[18px]">query_stats</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base text-on-surface truncate">
                  {url.title || `/${url.short_code}`}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-code font-bold ${
                    url.is_expired
                      ? 'bg-error-container/20 text-error'
                      : url.is_active
                      ? 'bg-tertiary-container/20 text-tertiary'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {url.is_expired ? 'Expired' : url.is_active ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant truncate max-w-lg">
                {url.original_url}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition shrink-0"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Info & Copy Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-primary text-[18px]">link</span>
              <span className="font-code font-bold text-primary text-xs truncate">
                {url.short_url}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-surface-container-lowest hover:bg-surface-container text-xs font-medium text-on-surface flex items-center gap-1.5 border border-outline-variant/30 transition shadow-sm"
            >
              <span className="material-symbols-outlined text-[14px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? 'Copied' : 'Copy Route'}</span>
            </button>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Loading telemetry drilldown...</span>
            </div>
          ) : data ? (
            <>
              {/* 3 Metric Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                    <span>Total Clicks</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      ads_click
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="font-code text-2xl font-bold text-on-surface">
                      {data.stats.totalClicks.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-tertiary ml-2 font-medium">All Time</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                    <span>Unique Visitors</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      fingerprint
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="font-code text-2xl font-bold text-on-surface">
                      {data.stats.uniqueClicks.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-on-surface-variant ml-2 font-medium">
                      IP Hashed
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
                    <span>Active Ratio</span>
                    <span className="material-symbols-outlined text-primary text-[18px]">
                      check_circle
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="font-code text-2xl font-bold text-on-surface">
                      {url.is_active && !url.is_expired ? '100%' : '0%'}
                    </span>
                    <span className="text-[11px] text-tertiary ml-2 font-medium">
                      HTTP 302 Edge
                    </span>
                  </div>
                </div>
              </div>

              {/* 7-Day Click Volume Timeline */}
              <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-sm text-on-surface">Click Volume Telemetry</h4>
                    <p className="text-[11px] text-on-surface-variant">Past 7 days traffic trend</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-code bg-surface-container text-on-surface-variant">
                    7 Days
                  </span>
                </div>

                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.trend}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="linkTrendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4a40c1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#4a40c1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7eefe" />
                      <XAxis
                        dataKey="date"
                        stroke="#777585"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis stroke="#777585" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #c4c0ff',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="clicks"
                        stroke="#4a40c1"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#linkTrendGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Devices, Browsers & Operating Systems */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Devices */}
                <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between">
                  <h4 className="font-semibold text-xs text-on-surface mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">devices</span>
                    <span>Device Distribution</span>
                  </h4>
                  <div className="space-y-2">
                    {data.deviceDistribution.map((d) => {
                      const total =
                        data.deviceDistribution.reduce((sum, item) => sum + item.value, 0) || 1;
                      const pct = Math.round((d.value / total) * 100);
                      return (
                        <div key={d.name} className="flex flex-col gap-1 text-xs">
                          <div className="flex justify-between text-on-surface-variant font-medium">
                            <span>{d.name}</span>
                            <span className="font-code">
                              {d.value} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Browsers */}
                <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex flex-col justify-between">
                  <h4 className="font-semibold text-xs text-on-surface mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">public</span>
                    <span>Browser Breakdown</span>
                  </h4>
                  <div className="space-y-2">
                    {data.browserDistribution.map((b) => {
                      const total =
                        data.browserDistribution.reduce((sum, item) => sum + item.value, 0) || 1;
                      const pct = Math.round((b.value / total) * 100);
                      return (
                        <div key={b.name} className="flex flex-col gap-1 text-xs">
                          <div className="flex justify-between text-on-surface-variant font-medium">
                            <span>{b.name}</span>
                            <span className="font-code">
                              {b.value} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                            <div
                              className="h-full bg-tertiary rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Referrers */}
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm">
                <h4 className="font-semibold text-xs text-on-surface mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">alt_route</span>
                  <span>Top Traffic Sources (Referrers)</span>
                </h4>
                {data.referrers.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">No referrers recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data.referrers.map((ref) => (
                      <div
                        key={ref.referrer}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface-container-low/50"
                      >
                        <span className="font-code font-semibold text-on-surface truncate max-w-xs">
                          {ref.referrer}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-code text-on-surface-variant">{ref.count} clicks</span>
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-code font-bold text-[10px]">
                            {ref.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Clicks Stream Table */}
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm">
                <h4 className="font-semibold text-xs text-on-surface mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">history</span>
                  <span>Live Redirection Stream (Last 25 Clicks)</span>
                </h4>
                {data.recentClicks.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">No clicks recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-outline-variant/20 text-on-surface-variant font-medium">
                          <th className="pb-2">Time</th>
                          <th className="pb-2">Device</th>
                          <th className="pb-2">Browser</th>
                          <th className="pb-2">OS</th>
                          <th className="pb-2">Referrer</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/10">
                        {data.recentClicks.map((click) => (
                          <tr key={click.id} className="hover:bg-surface-container-low/40">
                            <td className="py-2 font-code text-on-surface-variant">
                              {new Date(click.clicked_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-2 capitalize">{click.device_type}</td>
                            <td className="py-2">{click.browser}</td>
                            <td className="py-2">{click.os}</td>
                            <td className="py-2 font-code truncate max-w-xs text-on-surface-variant">
                              {click.referrer}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-error">
              Failed to load analytics for this route.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

