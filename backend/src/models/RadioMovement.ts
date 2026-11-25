import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('radio_movements')
export class RadioMovement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  radio_id!: number;

  @Column({ type: 'varchar', length: 100 })
  serial_number!: string;

  @Column({ type: 'int', nullable: true })
  from_unit_id?: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  from_unit_number?: string | null;

  @Column({ type: 'int', nullable: true })
  to_unit_id?: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  to_unit_number?: string | null;

  @Column({ type: 'varchar', length: 50, default: 'PINDAH' })
  action_type!: string; // 'PASANG' | 'PINDAH' | 'LEPAS'

  @Column({ type: 'datetime' })
  moved_at!: Date;

  @Column({ type: 'varchar', length: 100 })
  performed_by!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
