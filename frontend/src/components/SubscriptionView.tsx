import React, { useState, useEffect } from 'react';
import { User, SubscriptionPlanFeature, UserSubscriptionInfo } from '../types';
import { subscriptionApi } from '../services/api';

interface SubscriptionViewProps {
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onUserUpdated?: (updatedUser: User) => void;
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({
  currentUser,
  onOpenAuthModal,
  onUserUpdated,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [plans, setPlans] = useState<SubscriptionPlanFeature[]>([]);
  const [mySubscription, setMySubscription] = useState<UserSubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [confirmModalPlan, setConfirmModalPlan] = useState<SubscriptionPlanFeature | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPlans();
  }, [currentUser]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await subscriptionApi.getPlans();
      setPlans(res.plans);

      if (currentUser) {
        try {
          const sub = await subscriptionApi.getMySubscription();
          setMySubscription(sub);
        } catch {
          // Ignore
        }
      }
    } catch {
      // Fallback defaults
    } finally {
      setLoading(false);
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
      setActionMessage({ type: 'success', text: res.message });
      setConfirmModalPlan(null);

      // Refresh current subscription
      const sub = await subscriptionApi.getMySubscription();
      setMySubscription(sub);

      if (currentUser && onUserUpdated) {
        onUserUpdated({
          ...currentUser,
          plan: res.plan as any,
          plan_expires_at: res.plan_expires_at,
        });
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Failed to update plan. Please try again.',
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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
          <span className="material-symbols-outlined text-[15px]">verified</span>
          <span>Transparent Pricing & Plans</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight">
          Supercharge Your Short Links
        </h1>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          Unlock unlimited clicks, permanent URLs, passcode locks, and deep analytics. Upgrade or downgrade anytime with zero lock-in.
        </p>

        {/* Monthly / Yearly Toggle */}
        <div className="pt-2 flex items-center justify-center gap-3">
          <div className="p-1 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center shadow-inner">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
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
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
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
              <div className="flex items-center gap-2">
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
                  : 'Permanent account with no subscription expiration date'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {mySubscription?.usage && (
              <div className="flex items-center gap-3 text-xs font-code text-on-surface-variant border-r border-outline-variant/30 pr-3 mr-1">
                <span>{mySubscription.usage.total_links} Links</span>
                <span>•</span>
                <span>{mySubscription.usage.password_links} Password Locks</span>
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

      {/* Plan Cards Grid */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <span className="material-symbols-outlined text-[32px] text-primary animate-spin">
            progress_activity
          </span>
          <p className="text-xs text-on-surface-variant font-medium">Loading subscription plans & quotas...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
            const period = billingCycle === 'yearly' ? '/yr' : '/mo';

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 ${
                  plan.popular
                    ? 'bg-surface-container-low border-2 border-primary shadow-xl shadow-primary/10 ring-1 ring-primary/20 scale-[1.02]'
                    : 'bg-surface-container-lowest border border-outline-variant/30 hover:border-outline-variant shadow-sm'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-purple-600 text-white text-[11px] font-bold shadow-md tracking-wider uppercase flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">bolt</span>
                    <span>Most Popular</span>
                  </div>
                )}

                <div>
                  {/* Plan Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-lg text-on-surface">{plan.name}</h3>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] border border-emerald-500/20">
                        Current Plan
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1 min-h-[32px]">{plan.tagline}</p>

                  {/* Price Display */}
                  <div className="mt-5 pb-5 border-b border-outline-variant/20">
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
                    {price === 0 && (
                      <p className="text-[11px] text-on-surface-variant mt-1">
                        Free forever • No credit card required
                      </p>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="mt-6 space-y-3">
                    <p className="text-[11px] uppercase font-bold text-outline tracking-wider">
                      Plan Highlights
                    </p>
                    <ul className="space-y-2.5 text-xs text-on-surface">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">
                            check_circle
                          </span>
                          <span className="leading-tight">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-8 pt-4">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl bg-surface-container-highest text-on-surface-variant font-bold text-xs cursor-default text-center"
                    >
                      ✓ Your Active Plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUpgradeClick(plan)}
                      disabled={upgradingPlan === plan.id}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition shadow-sm active:scale-98 flex items-center justify-center gap-1.5 ${
                        plan.popular
                          ? 'bg-primary hover:bg-primary-container text-on-primary shadow-primary/25'
                          : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/40'
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
                              ? `Upgrade to ${plan.name}`
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
      )}

      {/* Feature Comparison Table */}
      <div className="w-full max-w-6xl mx-auto mt-10 sm:mt-12 bg-surface-container-low rounded-3xl border border-outline-variant/30 p-5 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[22px]">tune</span>
              <h2 className="text-lg sm:text-xl font-bold text-on-surface tracking-tight">Feature Breakdown & System Quotas</h2>
            </div>
            <p className="text-xs text-on-surface-variant">
              See how ZeLnk ensures high availability, sub-15ms edge routing, and enforces fair use policies across tiers.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20 self-start sm:self-auto">
            <span className="material-symbols-outlined text-[15px]">compare_arrows</span>
            <span>All Plans Compared</span>
          </span>
        </div>

        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <table className="w-full text-xs sm:text-sm text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-outline-variant/30 text-on-surface-variant">
                <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-outline text-[11px] w-[34%]">Capability</th>
                <th className="py-3.5 px-4 font-semibold text-center uppercase tracking-wider text-outline text-[11px] w-[22%]">Free Starter</th>
                <th className="py-3.5 px-4 font-extrabold text-center uppercase tracking-wider text-primary text-[11px] w-[22%] bg-primary/5 border-x border-primary/20 rounded-t-xl">Pro Creator</th>
                <th className="py-3.5 px-4 font-semibold text-center uppercase tracking-wider text-outline text-[11px] w-[22%]">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-on-surface">
              <tr className="hover:bg-surface-container/40 transition-colors">
                <td className="py-3.5 px-4 font-medium text-on-surface">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">touch_app</span>
                    <div>
                      <div className="font-semibold">Click Bandwidth per Link</div>
                      <div className="text-[11px] text-on-surface-variant">Monthly visitor redirection allowance</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="px-2.5 py-1 rounded-md bg-surface-container font-medium text-on-surface-variant text-xs">100 Clicks</span>
                </td>
                <td className="py-3.5 px-4 text-center bg-primary/[0.03] border-x border-primary/20">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 text-xs">
                    <span className="material-symbols-outlined text-[14px]">all_inclusive</span>Unlimited
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 text-xs">
                    <span className="material-symbols-outlined text-[14px]">all_inclusive</span>Unlimited
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-surface-container/40 transition-colors">
                <td className="py-3.5 px-4 font-medium text-on-surface">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">lock</span>
                    <div>
                      <div className="font-semibold">Password-Protected URLs</div>
                      <div className="text-[11px] text-on-surface-variant">Gate sensitive links behind passcodes</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="px-2.5 py-1 rounded-md bg-surface-container font-medium text-on-surface-variant text-xs">Max 5 Links</span>
                </td>
                <td className="py-3.5 px-4 text-center bg-primary/[0.03] border-x border-primary/20">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 text-xs">
                    <span className="material-symbols-outlined text-[14px]">all_inclusive</span>Unlimited
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 text-xs">
                    <span className="material-symbols-outlined text-[14px]">all_inclusive</span>Unlimited
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-surface-container/40 transition-colors">
                <td className="py-3.5 px-4 font-medium text-on-surface">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">link</span>
                    <div>
                      <div className="font-semibold">Custom Vanity Slugs & Aliases</div>
                      <div className="text-[11px] text-on-surface-variant">Choose exact memorable short names</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>Included
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center bg-primary/[0.03] border-x border-primary/20">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>Included
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>Included
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-surface-container/40 transition-colors">
                <td className="py-3.5 px-4 font-medium text-on-surface">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">language</span>
                    <div>
                      <div className="font-semibold">Custom Branded Domains</div>
                      <div className="text-[11px] text-on-surface-variant">Connect personal or company domains</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center text-on-surface-variant text-xs">
                  Default Domain
                </td>
                <td className="py-3.5 px-4 text-center bg-primary/[0.03] border-x border-primary/20">
                  <span className="font-bold text-primary text-xs">Up to 5 Domains</span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="font-bold text-purple-600 dark:text-purple-400 text-xs">Unlimited Domains</span>
                </td>
              </tr>

              <tr className="hover:bg-surface-container/40 transition-colors">
                <td className="py-3.5 px-4 font-medium text-on-surface">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">dynamic_feed</span>
                    <div>
                      <div className="font-semibold">Bulk Batch Shorten Limit</div>
                      <div className="text-[11px] text-on-surface-variant">Shorten multiple links at once via CSV/Paste</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="px-2.5 py-1 rounded-md bg-surface-container font-medium text-on-surface-variant text-xs">10 URLs / Batch</span>
                </td>
                <td className="py-3.5 px-4 text-center bg-primary/[0.03] border-x border-primary/20">
                  <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary font-bold text-xs">100 URLs / Batch</span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-300 font-bold text-xs">500 URLs / Batch</span>
                </td>
              </tr>

              <tr className="hover:bg-surface-container/40 transition-colors">
                <td className="py-3.5 px-4 font-medium text-on-surface">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">query_stats</span>
                    <div>
                      <div className="font-semibold">Analytics & Telemetry Depth</div>
                      <div className="text-[11px] text-on-surface-variant">Visitor insights, geography & devices</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center text-on-surface-variant text-xs">
                  Standard Totals
                </td>
                <td className="py-3.5 px-4 text-center font-semibold text-on-surface text-xs bg-primary/[0.03] border-x border-primary/20">
                  Geo, OS & Device Breakdown
                </td>
                <td className="py-3.5 px-4 text-center font-bold text-on-surface text-xs">
                  Real-time Telemetry + Export
                </td>
              </tr>

              <tr className="hover:bg-surface-container/40 transition-colors">
                <td className="py-3.5 px-4 font-medium text-on-surface">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">qr_code_2</span>
                    <div>
                      <div className="font-semibold">QR Code Downloads & Formats</div>
                      <div className="text-[11px] text-on-surface-variant">Instant printable and shareable QR codes</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center text-on-surface-variant text-xs">
                  Standard PNG
                </td>
                <td className="py-3.5 px-4 text-center font-semibold text-primary text-xs bg-primary/[0.03] border-x border-primary/20">
                  High-Res PNG + SVG Download
                </td>
                <td className="py-3.5 px-4 text-center font-bold text-purple-600 dark:text-purple-400 text-xs">
                  Vector SVG + Custom Branding
                </td>
              </tr>

              <tr className="hover:bg-surface-container/40 transition-colors">
                <td className="py-3.5 px-4 font-medium text-on-surface">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">bolt</span>
                    <div>
                      <div className="font-semibold">Redirection Engine & Speed</div>
                      <div className="text-[11px] text-on-surface-variant">Global routing latency & protocol</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="font-code text-xs px-2 py-1 rounded bg-surface-container text-on-surface-variant">HTTP 302</span>
                </td>
                <td className="py-3.5 px-4 text-center bg-primary/[0.03] border-x border-primary/20">
                  <span className="font-code text-xs px-2 py-1 rounded bg-primary/10 text-primary font-bold">HTTP 302 Edge (&lt;15ms)</span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="font-code text-xs px-2 py-1 rounded bg-purple-500/10 text-purple-600 dark:text-purple-300 font-bold">HTTP 302 Dedicated SLA</span>
                </td>
              </tr>

              <tr className="hover:bg-surface-container/40 transition-colors">
                <td className="py-3.5 px-4 font-medium text-on-surface">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">api</span>
                    <div>
                      <div className="font-semibold">Developer API & Webhooks</div>
                      <div className="text-[11px] text-on-surface-variant">Programmatic link generation & events</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center text-on-surface-variant text-xs">
                  60 req / min
                </td>
                <td className="py-3.5 px-4 text-center font-semibold text-primary text-xs bg-primary/[0.03] border-x border-primary/20">
                  1,000 req / min
                </td>
                <td className="py-3.5 px-4 text-center font-bold text-purple-600 dark:text-purple-400 text-xs">
                  Unlimited API + Webhooks
                </td>
              </tr>

              <tr className="hover:bg-surface-container/40 transition-colors">
                <td className="py-3.5 px-4 font-medium text-on-surface">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">support_agent</span>
                    <div>
                      <div className="font-semibold">Support & Redirection Uptime SLA</div>
                      <div className="text-[11px] text-on-surface-variant">Uptime guarantee & developer assistance</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center text-on-surface-variant text-xs">
                  Community Support
                </td>
                <td className="py-3.5 px-4 text-center font-semibold text-on-surface text-xs bg-primary/[0.03] border-x border-primary/20">
                  Priority Email (24h)
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 text-xs">
                    <span className="material-symbols-outlined text-[14px]">verified</span>99.99% SLA + 24/7
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 1-Click Upgrade Confirmation Modal */}
      {confirmModalPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">rocket_launch</span>
                <h3 className="font-extrabold text-base text-on-surface">Confirm Plan Upgrade</h3>
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
                <span className="text-on-surface font-medium">Total Charge:</span>
                <span className="font-black text-sm text-on-surface">
                  $
                  {billingCycle === 'yearly'
                    ? confirmModalPlan.priceYearly
                    : confirmModalPlan.priceMonthly}
                  {billingCycle === 'yearly' ? ' / yr' : ' / mo'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              ✨ <strong>Instant Activation:</strong> Your account will be upgraded immediately. All limits on clicks and passcode locks will be lifted right away.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalPlan(null)}
                className="flex-1 py-2 rounded-xl border border-outline-variant/40 hover:bg-surface-container text-on-surface text-xs font-semibold transition"
              >
                Cancel
              </button>
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
                  <>
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Confirm & Activate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
