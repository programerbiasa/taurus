import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('dashcams')
export class Dashcam {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  serial_number!: string;

  @Column({ type: 'varchar', length: 100, default: 'Hikvision' })
  brand!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model_type?: string;

  @Column({ type: 'varchar', length: 50, default: 'Standby' })
  status!: string; // 'Terpasang' | 'Standby' | 'Rusak' | 'Perbaikan'

  @Column({ type: 'int', nullable: true })
  current_unit_id?: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  current_unit_number?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  sd_card_capacity?: string | null;

  @Column({ type: 'varchar', length: 100, default: 'Telkomsel' })
  internet_provider!: string; // e.g. Telkomsel, Indosat, XL, etc.

  @Column({ type: 'varchar', length: 50, nullable: true })
  sim_card_number?: string | null;

  @Column({ type: 'varchar', length: 50, default: 'Baik' })
  electrical_condition!: string; // 'Baik' | 'Rusak'

  @Column({ type: 'varchar', length: 50, default: 'Baik' })
  gps_condition!: string; // 'Baik' | 'Rusak'

  @Column({ type: 'varchar', length: 50, default: 'Aktif' })
  camera_status!: string; // 'Aktif' | 'Tidak Aktif'

  @Column({ type: 'boolean', default: true })
  has_front_camera!: boolean; // Kamera Depan

  @Column({ type: 'boolean', default: false })
  has_cabin_camera!: boolean; // Kamera Kabin

  @Column({ type: 'boolean', default: false })
  has_fatigue_camera!: boolean; // Kamera Fatigue

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  photo_url?: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
