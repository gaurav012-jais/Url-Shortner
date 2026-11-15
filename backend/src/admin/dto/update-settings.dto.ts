import { IsOptional, IsInt, IsBoolean, Min, Max } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  id?: string;

  @IsOptional()
  updated_at?: string | Date;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  free_tier_max_clicks?: number;

  @IsOptional()
  @IsBoolean()
  allow_guest_passwords?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  free_user_max_password_links?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(43200) // up to 30 days in minutes
  guest_expiration_minutes?: number;

  @IsOptional()
  @IsBoolean()
  allow_custom_alias_free?: boolean;

  @IsOptional()
  @IsBoolean()
  maintenance_mode?: boolean;
}

