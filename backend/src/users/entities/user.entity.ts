import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Url } from '../../urls/entities/url.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export enum SubscriptionPlan {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index('idx_users_email', { unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  password_hash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'free',
    name: 'plan',
  })
  plan: string;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    name: 'plan_expires_at',
  })
  plan_expires_at: Date | null;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  is_active: boolean;

  // Profile picture URL (uploaded to Cloudinary)
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'profile_picture_url' })
  profile_picture_url: string | null;

  @OneToMany(() => Url, (url) => url.user)
  urls: Url[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refresh_tokens: RefreshToken[];

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updated_at: Date;
}

