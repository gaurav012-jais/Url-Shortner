import React, { useState, useEffect } from 'react';
import { User, SubscriptionPlanFeature, UserSubscriptionInfo } from '../types';
import { subscriptionApi } from '../services/api';

interface SubscriptionViewProps {
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onUserUpdated?: (updatedUser: User) => void;
}

const DEFAULT_PLANS: SubscriptionPlanFeature[] = [
  {
    id: 'free',
    name: 'Free Starter',
    tagline: 'Ideal for casual shortening and personal use.',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      'Up to 100 clicks per link',
      'Up to 5 password-protected links',
      'Standard HTTP 302 Fast Redirection',
      'Basic Click Telemetry & Referrers',
      'Single & Bulk Shorten (up to 10 links)',
      'Guest link auto-claim on registration',
    ],
    limits: {
      maxClicksPerLink: 100,
      maxPasswordLinks: 5,
      customAliasAllowed: true,
      bulkShortenMax: 10,
      linkRetentionDays: null,
      analyticsTier: 'basic',
    },
  },
  {
    id: 'pro',
    name: 'Pro Creator',
    tagline: 'For creators, marketers, and power users who need zero limits.',
    priceMonthly: 9,
    priceYearly: 89,
    popular: true,
    features: [
      '⚡ Unlimited Clicks & Bandwidth on all links',
      '🔒 Unlimited Password-Protected Links',
      'Permanent Links with Zero Expiration',
      'Custom Vanity Slugs & Custom Domain Presets',
      'Bulk Batch Shorten (up to 100 links at once)',
      'Deep Geo-Location, Device & OS Analytics',
      'Priority HTTP 302 Edge Routing (<15ms)',
      'Fast QR Code Downloads & Custom Branding',
    ],
    limits: {
      maxClicksPerLink: null,
      maxPasswordLinks: null,
      customAliasAllowed: true,
      bulkShortenMax: 100,
      linkRetentionDays: null,
      analyticsTier: 'advanced',
    },
  },
  {
    id: 'enterprise',
    name: 'Business & Enterprise',
    tagline: 'Maximum throughput, team scalability & SLA guarantees.',
    priceMonthly: 29,
    priceYearly: 289,
    features: [
      'Everything in Pro Creator included',
      'Unlimited Bulk Shorten (up to 500 links)',
      'Full REST API Keys & Webhook Access',
      'Custom Branded Preview & Password Unlock Pages',
      'Role-Based Admin Console Access for Teams',
      'Dedicated 99.99% Redirection Uptime SLA',
      'Priority 24/7 Developer Support',
    ],
    limits: {
      maxClicksPerLink: null,
      maxPasswordLinks: null,
      customAliasAllowed: true,
      bulkShortenMax: 500,
      linkRetentionDays: null,
      analyticsTier: 'enterprise',
    },
  },
];

const COMPARISON_FEATURES = [
  {
    icon: 'touch_app',
    name: 'Click Bandwidth per Link',
    desc: 'Monthly visitor redirection allowance',
    free: '100 Clicks',
    pro: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    icon: 'lock',
    name: 'Password-Protected URLs',
    desc: 'Gate sensitive links behind passcodes',
    free: 'Max 5 Links',
    pro: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    icon: 'link',
    name: 'Custom Vanity Slugs & Aliases',
    desc: 'Choose exact memorable short names',
    free: 'Included',
    pro: 'Included',
    enterprise: 'Included',
  },
  {
    icon: 'language',
    name: 'Custom Branded Domains',
    desc: 'Connect personal or company domains',
    free: 'Default Domain',
    pro: 'Up to 5 Domains',
    enterprise: 'Unlimited Domains',
  },
  {
    icon: 'dynamic_feed',
    name: 'Bulk Batch Shorten Limit',
    desc: 'Shorten multiple links at once via CSV/Paste',
    free: '10 URLs / Batch',
    pro: '100 URLs / Batch',
    enterprise: '500 URLs / Batch',
  },
  {
    icon: 'query_stats',
    name: 'Analytics & Telemetry Depth',
    desc: 'Visitor insights, geography & devices',
    free: 'Standard Totals',
    pro: 'Geo, OS & Devices',
    enterprise: 'Real-time Telemetry + Export',
  },
  {
    icon: 'qr_code_2',
    name: 'QR Code Downloads & Formats',
    desc: 'Printable and shareable QR posters',
    free: 'Standard',
    pro: 'Vector & Themes',
    enterprise: 'Custom Standees',
  },
  {
    icon: 'speed',
    name: 'Redirection Engine & Speed',
    desc: 'Global routing latency & protocol',
    free: 'HTTP 302 Edge',
    pro: '< 15ms Priority Edge',
    enterprise: 'Dedicated Multi-Region',
  },
  {
    icon: 'api',
    name: 'Developer API & Webhooks',
    desc: 'Programmatic link generation',
    free: '60 req / min',
    pro: '300 req / min + Hooks',
    enterprise: 'Unlimited API',
  },
  {
    icon: 'support_agent',
    name: 'Support & Uptime SLA',
    desc: 'Assistance & uptime guarantee',
    free: 'Community Support',
    pro: 'Priority Email (24h)',
    enterprise: '99.99% SLA + 24/7',
  },
];

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({
  currentUser,
  onOpenAuthModal,
  onUserUpdated,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [plans, setPlans] = useState<SubscriptionPlanFeature[]>(DEFAULT_PLANS);
  const [mySubscription, setMySubscription] = useState<UserSubscriptionInfo | null>(null);
  const [mobileCompareTab, setMobileCompareTab] = useState<'free' | 'pro' | 'enterprise'>('pro');
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [confirmModalPlan, setConfirmModalPlan] = useState<SubscriptionPlanFeature | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPlans();
  }, [currentUser]);

  const loadPlans = async () => {
    try {
      const res = await subscriptionApi.getPlans();
      if (res && res.plans && res.plans.length > 0) {
        setPlans(res.plans);
      }

      if (currentUser) {
        try {
          const sub = await subscriptionApi.getMySubscription();
          setMySubscription(sub);
        } catch {
          // Ignore
        }
      }
    } catch {
      // Use DEFAULT_PLANS
    }
  };

  const handleUpgradeClick = (plan: SubscriptionPlanFeature) => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }
    setConfirmModalPlan(plan);
  };

  const handleExecuteUpgrade = async () => {
    if (!confirmModalPlan) return;
    setUpgradingPlan(confirmModalPlan.id);
    setActionMessage(null);

    try {
      const res = await subscriptionApi.upgradePlan(confirmModalPlan.id, billingCycle);
      setActionMessage({ type: res.success ? 'success' : 'error', text: res.message });
      setConfirmModalPlan(null);

      // Refresh current subscription
      const sub = await subscriptionApi.getMySubscription();
      setMySubscription(sub);

      if (currentUser && onUserUpdated && res.success) {
        onUserUpdated({
          ...currentUser,
          plan: res.plan as any,
          plan_expires_at: res.plan_expires_at,
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to update plan. Please contact admin.',
      });
    } finally {
      setUpgradingPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to switch back to the Free Starter plan?')) {
      return;
    }
    setUpgradingPlan('cancel');
    try {
      const res = await subscriptionApi.cancelSubscription();
      setActionMessage({ type: 'success', text: res.message });

      const sub = await subscriptionApi.getMySubscription();
      setMySubscription(sub);

      if (currentUser && onUserUpdated) {
        onUserUpdated({
          ...currentUser,
          plan: 'free',
          plan_expires_at: null,
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to cancel plan.',
      });
    } finally {
      setUpgradingPlan(null);
    }
  };

  const currentPlanId = mySubscription?.plan || currentUser?.plan || 'free';

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-screen">
      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-2.5 sm:space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <span className="material-symbols-outlined text-[15px]">verified</span>
          <span>Plans &amp; Pricing</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-on-surface tracking-tight">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed px-2">
          Pick a plan that fits your project or team. Upgrade or cancel anytime.
        </p>

        {/* Monthly / Yearly Toggle */}
        <div className="pt-1 sm:pt-2 flex items-center justify-center gap-3">
          <div className="p-1 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center shadow-inner">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                billingCycle === 'monthly'
                  ? 'bg-surface-container-highest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-surface-container-highest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>Yearly Billing</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-tertiary-container/30 text-tertiary font-bold">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`max-w-2xl mx-auto p-4 rounded-xl text-xs flex items-center gap-3 border shadow-sm ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {actionMessage.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="flex-1 font-medium">{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-on-surface-variant hover:text-on-surface p-1"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Current Active Plan Status Bar (Logged In) */}
      {currentUser && (
        <div className="w-full max-w-6xl mx-auto p-4 sm:p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">
                {currentPlanId === 'enterprise' ? 'business' : currentPlanId === 'pro' ? 'bolt' : 'badge'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-on-surface-variant">Current Plan:</span>
                <span className="font-bold text-sm text-on-surface uppercase tracking-wide">
                  {currentPlanId === 'enterprise'
                    ? '🏢 Enterprise'
                    : currentPlanId === 'pro'
                    ? '⚡ Pro Creator'
                    : 'Free Starter'}
                </span>
                {currentUser.role === 'admin' && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 text-[10px] font-bold border border-purple-500/20">
                    🛡️ Admin Full Access
                  </span>
                )}
              </div>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                {mySubscription?.plan_expires_at
                  ? `Active until ${new Date(mySubscription.plan_expires_at).toLocaleDateString()}`
                  : 'Permanent account with no expiration date'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {mySubscription?.usage && (
              <div className="flex items-center gap-2.5 text-xs font-code text-on-surface-variant border-r border-outline-variant/30 pr-3 mr-1">
                <span>{mySubscription.usage.total_links} Links</span>
                <span>•</span>
                <span>{mySubscription.usage.password_links} Passwords</span>
                <span>•</span>
                <span>{mySubscription.usage.total_clicks} Clicks</span>
              </div>
            )}
            {currentPlanId !== 'free' && (
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={upgradingPlan === 'cancel'}
                className="px-3 py-1.5 rounded-lg border border-outline-variant/30 hover:border-error/40 text-on-surface-variant hover:text-error text-xs font-medium transition"
              >
                Downgrade to Free
              </button>
            )}
          </div>
        </div>
      )}

      {/* Plan Cards Grid - ALWAYS DISPLAYS 3 CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 w-full max-w-6xl mx-auto">
        {plans.map((plan) => {
          const isCurrent = currentPlanId === plan.id;
          const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
          const period = billingCycle === 'yearly' ? '/yr' : '/mo';

          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-5 sm:p-7 flex flex-col justify-between transition-all duration-300 ${
                plan.popular
                  ? 'bg-surface-container-low border-2 border-primary shadow-xl shadow-primary/10 ring-1 ring-primary/20 scale-[1.01] sm:scale-[1.02]'
                  : 'bg-surface-container-lowest border border-outline-variant/30 hover:border-outline-variant shadow-sm'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-purple-600 text-white text-[11px] font-bold shadow-md tracking-wider uppercase flex items-center gap-1 whitespace-nowrap">
                  <span className="material-symbols-outlined text-[13px]">bolt</span>
                  <span>Most Popular</span>
                </div>
              )}

              <div>
                {/* Plan Header */}
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-base sm:text-lg text-on-surface">{plan.name}</h3>
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] border border-emerald-500/20">
                      Current Plan
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant mt-1 min-h-[30px]">{plan.tagline}</p>

                {/* Price Display */}
                <div className="mt-4 pb-4 sm:mt-5 sm:pb-5 border-b border-outline-variant/20">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-on-surface">
                      ${price}
                    </span>
                    <span className="text-xs text-on-surface-variant font-medium">{period}</span>
                  </div>
                  {billingCycle === 'yearly' && price > 0 && (
                    <p className="text-[11px] text-tertiary font-semibold mt-1">
                      Billed annually (~${(price / 12).toFixed(1)}/mo)
                    </p>
                  )}
                </div>

                {/* Features List */}
                <ul className="mt-4 sm:mt-5 space-y-2.5 sm:space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-on-surface">
                      <span className="material-symbols-outlined text-primary text-[16px] shrink-0 mt-0.5">
                        check_circle
                      </span>
                      <span className="leading-tight">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-2">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 px-4 rounded-xl bg-surface-container text-on-surface-variant font-bold text-xs cursor-default flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Current Active Plan</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUpgradeClick(plan)}
                    disabled={upgradingPlan !== null}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm active:scale-98 ${
                      plan.popular
                        ? 'bg-primary hover:bg-primary-container text-on-primary shadow-primary/20'
                        : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/30'
                    }`}
                  >
                    {upgradingPlan === plan.id ? (
                      <span className="material-symbols-outlined text-[16px] animate-spin">
                        progress_activity
                      </span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">
                          {plan.id === 'free' ? 'arrow_downward' : 'rocket_launch'}
                        </span>
                        <span>
                          {plan.id === 'free'
                            ? 'Switch to Free'
                            : currentUser
                            ? `Select ${plan.name}`
                            : 'Sign In to Select'}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Breakdown & System Quotas */}
      <div className="w-full max-w-6xl mx-auto mt-8 sm:mt-12 bg-surface-container-low rounded-3xl border border-outline-variant/30 p-4 sm:p-8 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px] sm:text-[22px]">tune</span>
              <h2 className="text-base sm:text-xl font-bold text-on-surface tracking-tight">Feature Comparison</h2>
            </div>
            <p className="text-xs text-on-surface-variant">
              Compare limits and capabilities included in each tier.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20 self-start sm:self-auto">
            <span className="material-symbols-outlined text-[15px]">compare_arrows</span>
            <span>All Features</span>
          </span>
        </div>

        {/* 📱 MOBILE VIEW: Clean Responsive Tier Selector (ZERO horizontal overflow/stretching) */}
        <div className="block md:hidden space-y-4">
          {/* Plan Selector Tabs on Mobile */}
          <div className="grid grid-cols-3 p-1 rounded-xl bg-surface-container-high/60 border border-outline-variant/30 text-xs font-semibold">
            {(['free', 'pro', 'enterprise'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setMobileCompareTab(tier)}
                className={`py-2 px-1 rounded-lg text-center transition capitalize ${
                  mobileCompareTab === tier
                    ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tier === 'free' ? 'Free' : tier === 'pro' ? '⚡ Pro' : '🏢 Enterprise'}
              </button>
            ))}
          </div>

          {/* Clean Card List for Selected Tier */}
          <div className="space-y-2">
            {COMPARISON_FEATURES.map((item) => {
              const val =
                mobileCompareTab === 'free'
                  ? item.free
                  : mobileCompareTab === 'pro'
                  ? item.pro
                  : item.enterprise;
              const isHighlight = val.toLowerCase().includes('unlimited') || val.toLowerCase().includes('included');

              return (
                <div
                  key={item.name}
                  className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-xs text-on-surface truncate">{item.name}</p>
                      <p className="text-[10px] text-on-surface-variant truncate">{item.desc}</p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${
                      isHighlight
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 💻 DESKTOP VIEW: Full Side-by-Side Table (Hidden on small mobile screens) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 text-on-surface-variant">
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-outline text-[11px] w-[34%]">Capability</th>
                <th className="py-3.5 px-4 font-semibold text-center uppercase tracking-wider text-outline text-[11px] w-[22%]">Free Starter</th>
                <th className="py-3.5 px-4 font-extrabold text-center uppercase tracking-wider text-primary text-[11px] w-[22%] bg-primary/5 border-x border-primary/20 rounded-t-xl">Pro Creator</th>
                <th className="py-3.5 px-4 font-semibold text-center uppercase tracking-wider text-outline text-[11px] w-[22%]">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-on-surface">
              {COMPARISON_FEATURES.map((item, idx) => (
                <tr key={idx} className="hover:bg-surface-container/40 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-on-surface">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-primary">{item.icon}</span>
                      <div>
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-[11px] text-on-surface-variant">{item.desc}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-1 rounded-md bg-surface-container font-medium text-on-surface-variant text-xs">
                      {item.free}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center bg-primary/[0.03] border-x border-primary/20">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold text-xs ${
                        item.pro.toLowerCase().includes('unlimited') || item.pro.toLowerCase().includes('included')
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {item.pro}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-bold text-xs ${
                        item.enterprise.toLowerCase().includes('unlimited') || item.enterprise.toLowerCase().includes('included')
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-purple-500/10 text-purple-600 dark:text-purple-300'
                      }`}
                    >
                      {item.enterprise}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Details / Preview Notice Modal */}
      {confirmModalPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">rocket_launch</span>
                <h3 className="font-extrabold text-base text-on-surface">{confirmModalPlan.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModalPlan(null)}
                className="p-1 text-on-surface-variant hover:text-on-surface rounded-lg"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-on-surface-variant">Selected Plan:</span>
                <span className="font-bold text-on-surface">{confirmModalPlan.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-on-surface-variant">Billing Frequency:</span>
                <span className="font-semibold text-primary capitalize">{billingCycle}</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-outline-variant/20">
                <span className="text-on-surface font-medium">Price:</span>
                <span className="font-black text-sm text-on-surface">
                  ${billingCycle === 'yearly' ? confirmModalPlan.priceYearly : confirmModalPlan.priceMonthly}
                  {billingCycle === 'yearly' ? ' / yr' : ' / mo'}
                </span>
              </div>
            </div>

            {confirmModalPlan.id !== 'free' ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  <span>Payment Gateway Integration Pending</span>
                </p>
                <p className="text-[11px] leading-relaxed text-on-surface-variant">
                  Online card payments and automated checkout will be activated in an upcoming update. Currently, plans are for preview and tier demonstration.
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                You can switch back to the Free Starter plan anytime.
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalPlan(null)}
                className="flex-1 py-2 rounded-xl border border-outline-variant/40 hover:bg-surface-container text-on-surface text-xs font-semibold transition"
              >
                Close
              </button>
              {confirmModalPlan.id === 'free' && (
                <button
                  type="button"
                  onClick={handleExecuteUpgrade}
                  disabled={upgradingPlan === confirmModalPlan.id}
                  className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
                >
                  {upgradingPlan === confirmModalPlan.id ? (
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                  ) : (
                    <span>Switch to Free</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
