import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Click } from '../../analytics/entities/click.entity';

@Entity('urls')
export class Url {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  user_id: string | null;

  @Index('idx_urls_guest_id')
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'guest_id' })
  guest_id: string | null;

  @ManyToOne(() => User, (user) => user.urls, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'text', name: 'original_url' })
  original_url: string;

  @Index('idx_urls_short_code', { unique: true })
  @Column({ type: 'varchar', length: 30, unique: true, name: 'short_code' })
  short_code: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  domain: string | null;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[] | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  favicon: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_custom_alias' })
  is_custom_alias: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  is_active: boolean;

  @Column({ type: 'integer', default: 0, name: 'clicks_count' })
  clicks_count: number;

  @Column({ type: 'integer', nullable: true, name: 'max_clicks' })
  max_clicks: number | null;

  @Column({ type: 'timestamp with time zone', nullable: true, name: 'expires_at' })
  expires_at: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'password_hash' })
  password_hash: string | null;

  @Column({ type: 'integer', default: 0, name: 'failed_password_attempts' })
  failed_password_attempts: number;

  @OneToMany(() => Click, (click) => click.url)
  clicks: Click[];

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updated_at: Date;
}

