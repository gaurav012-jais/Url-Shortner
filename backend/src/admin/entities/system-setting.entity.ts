import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Maximum clicks a free/guest link can receive before cutoff (0 = unlimited)
  @Column({ type: 'integer', default: 100, name: 'free_tier_max_clicks' })
  free_tier_max_clicks: number;

  // Whether guest users can set passwords on links
  @Column({ type: 'boolean', default: false, name: 'allow_guest_passwords' })
  allow_guest_passwords: boolean;

  // Maximum password-protected links a free registered user can create
  @Column({ type: 'integer', default: 5, name: 'free_user_max_password_links' })
  free_user_max_password_links: number;

  // Guest link expiration in minutes (default: 15)
  @Column({ type: 'integer', default: 15, name: 'guest_expiration_minutes' })
  guest_expiration_minutes: number;

  // Allow custom vanity aliases for free tier
  @Column({ type: 'boolean', default: true, name: 'allow_custom_alias_free' })
  allow_custom_alias_free: boolean;

  // Emergency Maintenance Mode switch
  @Column({ type: 'boolean', default: false, name: 'maintenance_mode' })
  maintenance_mode: boolean;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updated_at: Date;
}

