import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Ticket } from './Ticket';
import { User } from './User';

@Entity('ticket_comments')
export class TicketComment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'ticket_id' })
  ticket_id!: number;

  @ManyToOne(() => Ticket, (ticket) => ticket.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: Ticket;

  @Column({ name: 'author_id' })
  author_id!: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'author_id' })
  author!: User;

  @Column({ type: 'text' })
  comment!: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
