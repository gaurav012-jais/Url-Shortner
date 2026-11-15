import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpgradePlanDto {
  @IsNotEmpty({ message: 'Plan is required' })
  @IsIn(['free', 'pro', 'enterprise'], {
    message: 'Plan must be one of: free, pro, enterprise',
  })
  plan: 'free' | 'pro' | 'enterprise';

  @IsOptional()
  @IsIn(['monthly', 'yearly'], {
    message: 'Billing cycle must be either monthly or yearly',
  })
  billingCycle?: 'monthly' | 'yearly';
}

