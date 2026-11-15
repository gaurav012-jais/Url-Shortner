export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  plan: 'free' | 'pro' | 'enterprise';
  plan_expires_at?: string | null;
  profile_picture_url?: string | null;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface UrlItem {
  id: string;
  original_url: string;
  short_code: string;
  domain?: string | null;
  tags?: string[] | null;
  short_url: string;
  title: string | null;
  favicon: string | null;
  is_custom_alias: boolean;
  is_active: boolean;
  clicks_count: number;
  max_clicks: number | null;
  expires_at: string | null;
  is_expired: boolean;
  has_password?: boolean;
  failed_password_attempts?: number;
  qr_code?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUrlPayload {
  original_url: string;
  custom_alias?: string;
  domain?: string;
  tags?: string[];
  title?: string;
  expires_at?: string;
  max_clicks?: number;
  password?: string;
}

export interface BulkCreatePayload {
  urls: CreateUrlPayload[];
}

export interface BulkCreateResponse {
  created: UrlItem[];
  failed: { original_url: string; reason: string }[];
  total: number;
  success_count: number;
  failure_count: number;
}

export interface AnalyticsOverview {
  totalLinks: number;
  totalClicks: number;
  activeLinks: number;
  clickVolumeTrend: { date: string; clicks: number }[];
  deviceDistribution: { name: string; value: number }[];
  browserDistribution: { name: string; value: number }[];
  topLinks: UrlItem[];
}

export interface LinkAnalyticsDetail {
  url: UrlItem;
  stats: {
    totalClicks: number;
    uniqueClicks: number;
    clicksRecorded: number;
  };
  trend: { date: string; clicks: number }[];
  deviceDistribution: { name: string; value: number }[];
  browserDistribution: { name: string; value: number }[];
  osDistribution: { name: string; value: number }[];
  referrers: { referrer: string; count: number; percentage: number }[];
  recentClicks: {
    id: string;
    clicked_at: string;
    device_type: string;
    browser: string;
    os: string;
    referrer: string;
  }[];
}

export interface PaginatedUrlsResponse {
  data: UrlItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CustomDomainItem {
  id: string;
  domain: string;
  status: 'active' | 'pending_verification' | 'failed';
  cname_target: string;
  created_at: string;
}

export interface SystemSettings {
  id?: string;
  free_tier_max_clicks: number;
  allow_guest_passwords: boolean;
  free_user_max_password_links: number;
  guest_expiration_minutes: number;
  allow_custom_alias_free: boolean;
  maintenance_mode: boolean;
  updated_at?: string;
}

export interface PublicTierLimits {
  free_tier_max_clicks: number;
  allow_guest_passwords: boolean;
  free_user_max_password_links: number;
  guest_expiration_minutes: number;
  allow_custom_alias_free: boolean;
  maintenance_mode: boolean;
}

export interface AdminOverviewStats {
  totalUrls: number;
  totalClicks: number;
  totalUsers: number;
  guestUrls: number;
  lockedUrls: number;
  expiredUrls: number;
  activeUrls: number;
  todayClicks: number;
}

export interface AdminUrlItem {
  id: string;
  short_code: string;
  original_url: string;
  title: string | null;
  clicks_count: number;
  max_clicks: number | null;
  is_active: boolean;
  is_expired: boolean;
  has_password: boolean;
  failed_password_attempts: number;
  is_locked: boolean;
  expires_at: string | null;
  created_at: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  guest_id: string | null;
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  plan?: 'free' | 'pro' | 'enterprise';
  plan_expires_at?: string | null;
  is_active: boolean;
  created_at: string;
  urls_count: number;
}

export interface SubscriptionPlanFeature {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  popular?: boolean;
  features: string[];
  limits: {
    maxClicksPerLink: number | null;
    maxPasswordLinks: number | null;
    customAliasAllowed: boolean;
    bulkShortenMax: number;
    linkRetentionDays: number | null;
    analyticsTier: 'basic' | 'advanced' | 'enterprise';
  };
}

export interface UserSubscriptionInfo {
  plan: 'free' | 'pro' | 'enterprise';
  plan_expires_at: string | null;
  is_active: boolean;
  is_admin: boolean;
  is_expired: boolean;
  plan_details: SubscriptionPlanFeature;
  usage: {
    total_links: number;
    password_links: number;
    total_clicks: number;
  };
}
