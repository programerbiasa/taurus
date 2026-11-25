import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User, UserRole } from './User';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  user_id!: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'target_user_id', nullable: true })
  target_user_id?: number | null;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'target_user_id' })
  target_user?: User | null;

  @Column({ type: 'boolean', default: false })
  is_broadcast!: boolean;

  @Column({ type: 'varchar', length: 100 })
  sender_name!: string;

  @Column({
    type: 'enum',
    enum: ['admin', 'it_support', 'client'],
    default: 'client',
  })
  sender_role!: UserRole;

  @Column({ type: 'text' })
  message!: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
