import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type UserStatus = 'pending' | 'approved' | 'rejected';
export type UserRole = 'admin' | 'it_support' | 'client';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 80, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 255 })
  password_hash!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name?: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  status!: UserStatus;

  @Column({
    type: 'enum',
    enum: ['admin', 'it_support', 'client'],
    default: 'client',
  })
  role!: UserRole;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
