import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { TicketComment } from './TicketComment';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit_number?: string | null;

  @Column({ type: 'text' })
  detail!: string;

  @Column({
    type: 'enum',
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  })
  priority!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  attachment?: string;

  @Column({ type: 'datetime', nullable: true })
  sla?: Date | null;

  @Column({
    type: 'enum',
    enum: ['Open', 'InProgress', 'Resolved', 'Closed'],
    default: 'Open',
  })
  status!: string;

  @Column({ name: 'reporter_id' })
  reporter_id!: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'reporter_id' })
  reporter!: User;

  @Column({ name: 'assignee_id', nullable: true })
  assignee_id?: number | null;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee?: User | null;

  @OneToMany(() => TicketComment, (comment) => comment.ticket)
  comments?: TicketComment[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
