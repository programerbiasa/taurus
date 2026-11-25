import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('vehicle_units')
export class VehicleUnit {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  unit_number!: string;

  @Column({ type: 'varchar', length: 100, default: 'Mercedes Benz' })
  vehicle_brand!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  unit_type?: string;

  @Column({ type: 'varchar', length: 100, default: 'Motorola' })
  radio_brand!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  radio_type?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  antenna_type?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  antenna_base?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;
}
