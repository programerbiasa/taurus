import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('unit_inspections')
export class UnitInspection {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: 'date' })
  inspection_date!: string; // Format YYYY-MM-DD

  @Column({ type: 'varchar', length: 100, default: 'BEK / BIANGAN' })
  site_location!: string;

  @Column({ type: 'varchar', length: 50, default: 'PM' })
  inspection_type!: string;

  @Column({ type: 'int', nullable: true })
  unit_id?: number | null;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  unit_number!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  old_unit_number?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  vehicle_brand?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  vehicle_model?: string | null;

  // 1. Radio Rig
  @Column({ type: 'varchar', length: 50, default: 'Ada/layak' })
  radio_status!: string; // 'Ada/layak' | 'Tidak ada' | 'Rusak'

  @Column({ type: 'varchar', length: 50, default: 'Layak' })
  radio_kelistrikan!: string;

  @Column({ type: 'varchar', length: 50, default: 'Layak' })
  radio_antena!: string;

  @Column({ type: 'varchar', length: 50, default: 'Layak' })
  radio_kabel!: string;

  @Column({ type: 'varchar', length: 50, default: 'Layak' })
  radio_chanel!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  radio_notes?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  radio_photo_url?: string | null;

  // 2. Camera: 2.1-2.8
  @Column({ type: 'varchar', length: 50, default: 'Ada' })
  camera_kelistrikan!: string;

  @Column({ type: 'varchar', length: 50, default: 'Ada' })
  camera_posisi!: string;

  @Column({ type: 'varchar', length: 50, default: 'Ada' })
  camera_internet!: string;

  @Column({ type: 'varchar', length: 50, default: 'Ada' })
  camera_gps!: string;

  @Column({ type: 'varchar', length: 50, default: 'Ada' })
  camera_dascam!: string;

  @Column({ type: 'varchar', length: 50, default: 'Ada' })
  camera_kabin!: string;

  @Column({ type: 'varchar', length: 50, default: 'Ada' })
  camera_fatigue!: string;

  @Column({ type: 'varchar', length: 50, default: 'Ada' })
  camera_memcard!: string;

  @Column({ type: 'varchar', length: 50, default: 'Layak' })
  camera_penyimpanan!: string;

  @Column({ type: 'varchar', length: 50, default: 'Ada/layak' })
  camera_status!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  camera_notes?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  camera_photo_url?: string | null;

  @Column({ type: 'varchar', length: 50, default: 'Ada/layak' })
  camera_cabin_status!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  camera_cabin_notes?: string | null;

  @Column({ type: 'varchar', length: 50, default: 'Ada/layak' })
  camera_fatigue_status!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  camera_fatigue_notes?: string | null;

  // Status Inspeksi & Bukti
  @Index()
  @Column({ type: 'enum', enum: ['Open', 'Close'], default: 'Close' })
  inspection_status!: 'Open' | 'Close';

  @Column({ type: 'varchar', length: 255, nullable: true })
  photo_url?: string | null;

  @Column({ type: 'text', nullable: true })
  general_notes?: string | null;

  // Penanggung Jawab Inspeksi (Petugas 1 & Petugas 2)
  @Column({ type: 'int', nullable: true })
  inspector_id?: number | null;

  @Column({ type: 'varchar', length: 100 })
  inspector_name!: string;

  @Column({ type: 'varchar', length: 100, default: 'IT Support' })
  inspector_role!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  inspector2_name?: string | null;

  @Column({ type: 'varchar', length: 100, default: 'IT Support' })
  inspector2_role!: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
