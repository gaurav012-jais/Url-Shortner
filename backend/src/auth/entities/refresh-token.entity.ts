import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  user_id: string;

  @ManyToOne(() => User, (user) => user.refresh_tokens, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index('idx_refresh_tokens_hash')
  @Column({ type: 'text', name: 'token_hash' })
  token_hash: string;

  @Column({ type: 'timestamp with time zone', name: 'expires_at' })
  expires_at: Date;

  @Column({ type: 'boolean', default: false, name: 'is_revoked' })
  is_revoked: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  created_at: Date;
}

