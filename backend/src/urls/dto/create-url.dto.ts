import {
  IsNotEmpty,
  IsUrl,
  IsOptional,
  IsString,
  Matches,
  IsDateString,
  IsInt,
  Min,
  MaxLength,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';

export class CreateUrlDto {
  @IsNotEmpty({ message: 'Original URL cannot be empty' })
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
      allow_underscores: false,
    },
    { message: 'Original URL must be a valid HTTP or HTTPS URL' },
  )
  original_url: string;

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'Custom alias cannot exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9_-]{3,30}$/, {
    message:
      'Custom alias must be between 3 and 30 characters and contain only letters, numbers, hyphens, and underscores',
  })
  custom_alias?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Custom domain cannot exceed 100 characters' })
  @Matches(
    /^(([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(:\d{1,5})?|localhost(:\d{1,5})?)$/,
    {
      message: 'Custom domain must be a valid hostname (e.g. zelnk-backend.onrender.com or go.mycompany.com)',
    },
  )
  domain?: string;

  @IsOptional()
  @IsArray({ message: 'Tags must be an array of strings' })
  @ArrayMaxSize(20, { message: 'Maximum 20 tags allowed per URL' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @MaxLength(50, { each: true, message: 'Each tag cannot exceed 50 characters' })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Title cannot exceed 255 characters' })
  title?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Expiration date must be a valid ISO 8601 string' })
  expires_at?: string;

  @IsOptional()
  @IsInt({ message: 'Max clicks must be an integer' })
  @Min(1, { message: 'Max clicks must be at least 1' })
  max_clicks?: number;

  @IsOptional()
  @IsString({ message: 'Password must be a string' })
  @MaxLength(100, { message: 'Password cannot exceed 100 characters' })
  password?: string;
}

