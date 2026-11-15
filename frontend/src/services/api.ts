import axios from 'axios';
import {
  UrlItem,
  CreateUrlPayload,
  BulkCreatePayload,
  BulkCreateResponse,
  PaginatedUrlsResponse,
  User,
  AuthResponse,
  AnalyticsOverview,
  LinkAnalyticsDetail,
  SystemSettings,
  PublicTierLimits,
  AdminOverviewStats,
  AdminUrlItem,
  AdminUserItem,
  SubscriptionPlanFeature,
  UserSubscriptionInfo,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export function getOrCreateGuestId(): string {
  let gid = localStorage.getItem('linkflow_guest_id');
  if (!gid) {
    let rand = '';
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      rand = crypto.randomUUID();
    } else if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      rand = Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
    } else {
      rand = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    }
    gid = `guest_${rand}`;
    localStorage.setItem('linkflow_guest_id', gid);
  }
  return gid;
}

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token & Persistent Guest ID
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('linkflow_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Always attach unique Guest ID so unauthenticated requests remain isolated per device
  const guestId = getOrCreateGuestId();
  if (guestId && config.headers) {
    config.headers['x-guest-id'] = guestId;
  }

  return config;
});

// Response Interceptor: Handle 401 & Token Refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('linkflow_refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post<AuthResponse>(`${API_BASE_URL}/api/auth/refresh`, {
            refreshToken,
          });

          localStorage.setItem('linkflow_access_token', res.data.accessToken);
          localStorage.setItem('linkflow_refresh_token', res.data.refreshToken);

          originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
          return apiClient(originalRequest);
        } catch {
          // Invalidate stored tokens if refresh fails
          localStorage.removeItem('linkflow_access_token');
          localStorage.removeItem('linkflow_refresh_token');
          localStorage.removeItem('linkflow_user');
          window.dispatchEvent(new Event('auth_state_changed'));
        }
      }
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/register', { name, email, password });
    localStorage.setItem('linkflow_access_token', res.data.accessToken);
    localStorage.setItem('linkflow_refresh_token', res.data.refreshToken);
    localStorage.setItem('linkflow_user', JSON.stringify(res.data.user));
    await urlApi.claimGuestLinks().catch(() => {});
    window.dispatchEvent(new Event('auth_state_changed'));
    return res.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    localStorage.setItem('linkflow_access_token', res.data.accessToken);
    localStorage.setItem('linkflow_refresh_token', res.data.refreshToken);
    localStorage.setItem('linkflow_user', JSON.stringify(res.data.user));
    await urlApi.claimGuestLinks().catch(() => {});
    window.dispatchEvent(new Event('auth_state_changed'));
    return res.data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network error on logout
    } finally {
      localStorage.removeItem('linkflow_access_token');
      localStorage.removeItem('linkflow_refresh_token');
      localStorage.removeItem('linkflow_user');
      window.dispatchEvent(new Event('auth_state_changed'));
    }
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>('/auth/me');
    localStorage.setItem('linkflow_user', JSON.stringify(res.data));
    return res.data;
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem('linkflow_user');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  saveCurrentUser: (user: User): void => {
    localStorage.setItem('linkflow_user', JSON.stringify(user));
  },

  uploadProfilePicture: async (file: File): Promise<{ profile_picture_url: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await apiClient.post<{ profile_picture_url: string }>('/auth/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    const currentUser = authApi.getCurrentUser();
    if (currentUser) {
      currentUser.profile_picture_url = res.data.profile_picture_url;
      authApi.saveCurrentUser(currentUser);
      window.dispatchEvent(new Event('auth_state_changed'));
    }
    return res.data;
  },
};

export const urlApi = {
  shortenUrl: async (payload: CreateUrlPayload): Promise<UrlItem> => {
    const response = await apiClient.post<UrlItem>('/urls', payload);
    return response.data;
  },

  createBulk: async (payload: BulkCreatePayload): Promise<BulkCreateResponse> => {
    const response = await apiClient.post<BulkCreateResponse>('/urls/bulk', payload);
    return response.data;
  },

  getUrls: async (page = 1, limit = 50): Promise<PaginatedUrlsResponse> => {
    const response = await apiClient.get<PaginatedUrlsResponse>('/urls', {
      params: { page, limit },
    });
    return response.data;
  },

  getPreview: async (code: string): Promise<UrlItem> => {
    const response = await apiClient.get<UrlItem>(`/urls/preview/${code}`);
    return response.data;
  },

  toggleActive: async (id: string): Promise<UrlItem> => {
    const response = await apiClient.patch<UrlItem>(`/urls/${id}/toggle`);
    return response.data;
  },

  deleteUrl: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/urls/${id}`);
    return response.data;
  },

  claimGuestLinks: async (): Promise<{ claimed: number }> => {
    const guestId = localStorage.getItem('linkflow_guest_id');
    if (!guestId) return { claimed: 0 };
    try {
      const response = await apiClient.post<{ claimed: number }>('/urls/claim-guest', { guestId });
      localStorage.removeItem('linkflow_guest_id');
      return response.data;
    } catch {
      return { claimed: 0 };
    }
  },
};

export const analyticsApi = {
  getOverview: async (): Promise<AnalyticsOverview> => {
    const response = await apiClient.get<AnalyticsOverview>('/analytics/overview');
    return response.data;
  },

  getUrlAnalytics: async (urlId: string): Promise<LinkAnalyticsDetail> => {
    const response = await apiClient.get<LinkAnalyticsDetail>(`/analytics/${urlId}`);
    return response.data;
  },
};

export const adminApi = {
  getPublicLimits: async (): Promise<PublicTierLimits> => {
    const res = await apiClient.get<PublicTierLimits>('/admin/public-limits');
    return res.data;
  },

  getOverview: async (): Promise<AdminOverviewStats> => {
    const res = await apiClient.get<AdminOverviewStats>('/admin/overview');
    return res.data;
  },

  getSettings: async (): Promise<SystemSettings> => {
    const res = await apiClient.get<SystemSettings>('/admin/settings');
    return res.data;
  },

  updateSettings: async (dto: Partial<SystemSettings>): Promise<SystemSettings> => {
    const res = await apiClient.patch<SystemSettings>('/admin/settings', dto);
    return res.data;
  },

  getUrls: async (
    page = 1,
    limit = 20,
    search?: string,
    filter?: string,
  ): Promise<{ data: AdminUrlItem[]; total: number; page: number; limit: number }> => {
    const res = await apiClient.get('/admin/urls', {
      params: { page, limit, search, filter },
    });
    return res.data;
  },

  toggleUrl: async (id: string): Promise<{ success: boolean; is_active: boolean }> => {
    const res = await apiClient.patch(`/admin/urls/${id}/toggle`);
    return res.data;
  },

  unlockUrl: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.post(`/admin/urls/${id}/unlock`);
    return res.data;
  },

  deleteUrl: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/admin/urls/${id}`);
    return res.data;
  },

  getUsers: async (
    page = 1,
    limit = 20,
    search?: string,
  ): Promise<{ data: AdminUserItem[]; total: number; page: number; limit: number }> => {
    const res = await apiClient.get('/admin/users', {
      params: { page, limit, search },
    });
    return res.data;
  },

  updateUserRole: async (
    id: string,
    role: 'admin' | 'user',
  ): Promise<{ success: boolean; role: string }> => {
    const res = await apiClient.patch(`/admin/users/${id}/role`, { role });
    return res.data;
  },

  updateUserPlan: async (
    id: string,
    plan: 'free' | 'pro' | 'enterprise',
  ): Promise<{ success: boolean; plan: string }> => {
    const res = await apiClient.patch(`/admin/users/${id}/plan`, { plan });
    return res.data;
  },

  updateUserStatus: async (
    id: string,
    isActive: boolean,
  ): Promise<{ success: boolean; is_active: boolean }> => {
    const res = await apiClient.patch(`/admin/users/${id}/status`, { is_active: isActive });
    return res.data;
  },
};

export const subscriptionApi = {
  getPlans: async (): Promise<{
    plans: SubscriptionPlanFeature[];
    systemLimits: PublicTierLimits;
  }> => {
    const res = await apiClient.get('/subscription/plans');
    return res.data;
  },

  getMySubscription: async (): Promise<UserSubscriptionInfo> => {
    const res = await apiClient.get<UserSubscriptionInfo>('/subscription/me');
    return res.data;
  },

  upgradePlan: async (
    plan: 'free' | 'pro' | 'enterprise',
    billingCycle: 'monthly' | 'yearly' = 'monthly',
  ): Promise<{ success: boolean; message: string; plan: string; plan_expires_at: string | null }> => {
    const res = await apiClient.post('/subscription/upgrade', { plan, billingCycle });
    return res.data;
  },

  cancelSubscription: async (): Promise<{ success: boolean; message: string; plan: string }> => {
    const res = await apiClient.post('/subscription/cancel');
    return res.data;
  },
};

