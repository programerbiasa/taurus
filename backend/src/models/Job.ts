import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { Ticket } from './Ticket';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id' })
  user_id!: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'ticket_id', nullable: true })
  ticket_id?: number | null;

  @ManyToOne(() => Ticket, { nullable: true, eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ticket_id' })
  ticket?: Ticket | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  problem_category?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit_number?: string | null;

  @Column({ type: 'text', nullable: true })
  problem_detail?: string;

  @Column({ type: 'text', nullable: true })
  problem_finding?: string;

  @Column({ type: 'text', nullable: true })
  action_taken?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  attachment?: string | null;

  @Column({
    type: 'enum',
    enum: ['Pending', 'Completed'],
    default: 'Pending',
  })
  status!: string;

  @Column({ type: 'date' })
  work_date!: string; // YYYY-MM-DD

  @Column({ type: 'varchar', length: 15 })
  work_day!: string; // Monday, Tuesday, etc.

  @Column({ type: 'time' })
  start_time!: string; // HH:MM:SS or HH:MM

  @Column({ type: 'time', nullable: true })
  end_time?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
