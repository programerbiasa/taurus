import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { InventoryCategory } from './InventoryCategory';
import { InventoryBrand } from './InventoryBrand';
import { InventoryType } from './InventoryType';
import { InventoryLocation } from './InventoryLocation';
import { InventoryPic } from './InventoryPic';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  item_code!: string; // IDBarang e.g. BRG-202611-001

  @Column({ type: 'varchar', length: 150 })
  name!: string; // Nama Barang

  @Column({ type: 'varchar', length: 100, nullable: true })
  serial_number?: string; // Serial Number

  @Column({ type: 'int', nullable: true })
  category_id?: number | null;

  @ManyToOne(() => InventoryCategory, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'category_id' })
  category?: InventoryCategory | null; // JenisBarang

  @Column({ type: 'int', nullable: true })
  brand_id?: number | null;

  @ManyToOne(() => InventoryBrand, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'brand_id' })
  brand?: InventoryBrand | null; // Merk

  @Column({ type: 'int', nullable: true })
  type_id?: number | null;

  @ManyToOne(() => InventoryType, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'type_id' })
  type?: InventoryType | null; // Tipe

  @Column({ type: 'int', nullable: true })
  current_location_id?: number | null;

  @ManyToOne(() => InventoryLocation, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'current_location_id' })
  current_location?: InventoryLocation | null; // LokasiBarang

  @Column({ type: 'int', nullable: true })
  current_pic_id?: number | null;

  @ManyToOne(() => InventoryPic, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'current_pic_id' })
  current_pic?: InventoryPic | null; // PIC Terkait

  @Column({ type: 'enum', enum: ['Baik', 'Rusak', 'Hilang', 'Scrap'], default: 'Baik' })
  condition_status!: 'Baik' | 'Rusak' | 'Hilang' | 'Scrap'; // Kondisi

  @Column({ type: 'enum', enum: ['in_stock', 'deployed', 'maintenance', 'scrap'], default: 'in_stock' })
  status!: 'in_stock' | 'deployed' | 'maintenance' | 'scrap'; // In Stock (Ruang IT) vs Deployed (Keluar ke PIC)

  @Column({ type: 'date' })
  entry_date!: string; // TanggalMasuk (YYYY-MM-DD)

  @Column({ type: 'datetime', nullable: true })
  last_update_date?: Date | null; // TanggalUpdate (saat barang dipindah/keluar)

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  photo_url?: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
