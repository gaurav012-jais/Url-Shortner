import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Url } from '../../urls/entities/url.entity';

@Entity('clicks')
export class Click {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_clicks_url_id')
  @Column({ type: 'uuid', name: 'url_id' })
  url_id: string;

  @ManyToOne(() => Url, (url) => url.clicks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'url_id' })
  url: Url;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'ip_hash' })
  ip_hash: string | null;

  @Column({ type: 'varchar', length: 50, default: 'desktop', name: 'device_type' })
  device_type: string;

  @Column({ type: 'varchar', length: 50, default: 'Chrome', name: 'browser' })
  browser: string;

  @Column({ type: 'varchar', length: 50, default: 'Unknown', name: 'os' })
  os: string;

  @Column({ type: 'varchar', length: 255, default: 'Direct', name: 'referrer' })
  referrer: string;

  @Index('idx_clicks_created_at')
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  created_at: Date;
}

