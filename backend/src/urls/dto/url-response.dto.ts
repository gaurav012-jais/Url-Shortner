export class UrlResponseDto {
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
  expires_at: Date | null;
  is_expired: boolean;
  has_password?: boolean;
  failed_password_attempts?: number;
  qr_code?: string;
  created_at: Date;
  updated_at: Date;
}

