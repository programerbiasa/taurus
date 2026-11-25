import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('radios')
export class Radio {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  serial_number!: string;

  @Column({ type: 'varchar', length: 100, default: 'Motorola' })
  brand!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model_type?: string;

  @Column({ type: 'varchar', length: 50, default: 'Standby' })
  status!: string; // 'Terpasang' | 'Standby' | 'Rusak' | 'Perbaikan'

  @Column({ type: 'int', nullable: true })
  current_unit_id?: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  current_unit_number?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  photo_url?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
